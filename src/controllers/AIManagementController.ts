import { Controller } from "~/assets/types/controller";
import { $callToAction, $sendResponse } from "~/assets/helpers/methods";
import { Request, Response } from 'express';
import { $logged } from "~/assets/helpers/logHelpers";
import apiMessageKeys from "~/assets/constants/apiMessageKeys";
import statusCodes from "~/assets/constants/statusCodes";
import jwt from "jsonwebtoken";
import Chatbot, { chatbot_response_configs } from "~/assets/helpers/chatBot";
import aiPresets, { AvailableKeyNames, AvailableModels, definationExamples, presets } from "~/assets/constants/aiPresets";
import { deepCopy } from "~/assets/helpers/generalHelpers";
import bcrypt from "bcrypt";

export class AIManagementController extends Controller {
    #modelGrok;
    #modelDeepSeek;
    #modelChatGPT;
    #availableModels: string[] = ['chatgpt', 'deep_seek', 'grok'] as AvailableModels[];
    #availableKeys: string[] = Object.keys(presets) as AvailableKeyNames[];

    constructor(request: Request, response: Response) {
        super(request, response);
        this.actions['GET']['/start'] = this.start;
        this.actions['GET']['/user_keys'] = this.getKeysByUserId;
        this.actions['GET']['/key_history'] = this.getHistoryByKeyId;

        this.actions['PATCH']['/user_keys/:key_id'] = this.saveKeyById;
        this.actions['DELETE']['/user_keys/:key_id'] = this.deleteKeyById;
        this.actions['DELETE']['/user_keys'] = this.deleteAllKeysByUserId;

        this.actions['PATCH']['/key_history/:conversation_id'] = this.saveHistoryByConversationId;
        this.actions['DELETE']['/key_history/:conversation_id'] = this.deleteHistoryByConversationId;

        this.actions['GET']['/json_generator/:conversation_id'] = this.jsonGeneratorById;
        this.actions['POST']['/json_generator/:conversation_key'] = this.jsonGenerator;
        this.actions['POST']['/ai_translator/:conversation_key'] = this.aiTranslator;

        this.#modelGrok = new Chatbot({
            baseURL: process.env.GROK_BASE_URL,
            apiKey: process.env.GROK_API_KEY,
            model: 'grok-2-vision-1212',
        });
        this.#modelDeepSeek = new Chatbot({
            baseURL: process.env.DEEPSEEK_BASE_URL,
            apiKey: process.env.DEEPSEEK_API_KEY,
            model: 'deepseek-chat',
        });
        this.#modelChatGPT = new Chatbot({
            baseURL: null,
            apiKey: process.env.CHATGPT_API_KEY,
            model: 'gpt-4o',
        });
    }

    getKeysByUserId = async () => {
        try {
            let { user_id } = this.reqQuery;
            if (user_id && JSON.parse(this.reqBody.authentication_result).session.payload.user_id == user_id) {
                return await this.database.aIConversationKeys.findMany({ where: { user_id: Number(user_id) }, include: { AIConversationHistory: true } }).then(result => {
                    const filteredData = result.map(item => {
                        let label = null as any
                        const targetHistory = item.AIConversationHistory[item.AIConversationHistory.length - 1];
                        if (targetHistory && targetHistory.question) {
                            try {
                                let parsed = JSON.parse(deepCopy(targetHistory.question));
                                if (parsed) {
                                    if (typeof parsed === 'object') {
                                        label = Object.values(parsed)[0];
                                        if (typeof label === 'object') {
                                            if (label.message) {
                                                label = label.message;
                                            }
                                            if (label.input) {
                                                label = label.input;
                                            }
                                        }
                                    }
                                }
                            } catch (error: any) {
                                label = null;
                            }
                        }

                        return {
                            label,
                            id: item.id,
                            c_key: item.conversation_key,
                            save: item.saved,
                            date: item.created_at,
                            key_name: item.key_name,
                        }
                    });
                    return $sendResponse.success(
                        [...filteredData].reverse(),
                        this.response,
                        apiMessageKeys.DONE,
                        statusCodes.OK
                    );
                }).catch((error) => {
                    throw error;
                }).finally(() => {
                    this.database.$disconnect();
                });
            }
            return $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.USER_NOT_FOUND,
                statusCodes.NOT_FOUND
            );
        } catch (error: any) {
            $logged(
                error.message,
                false,
                { file: __filename.split('/src')[1] },
                this.request.ip,
                true
            )
            $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }
    saveKeyById = async ({ params }: { params: Record<string, any> }) => {
        try {
            const key_id = params.key_id;
            let { user_id, save } = this.reqBody;
            if (user_id && JSON.parse(this.reqBody.authentication_result).session.payload.user_id == user_id) {
                return await this.database.aIConversationKeys.update({
                    where: { id: Number(key_id) },
                    data: {
                        saved: !!save
                    }
                }).then(result => {
                    return $sendResponse.success(
                        { saved: result.saved },
                        this.response,
                        apiMessageKeys.DONE,
                        statusCodes.OK
                    );
                }).catch((error) => {
                    return $sendResponse.failed(
                        {},
                        this.response,
                        apiMessageKeys.KEY_NOT_FOUND,
                        statusCodes.NOT_FOUND
                    );
                }).finally(() => {
                    this.database.$disconnect();
                });
            } else {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.USER_NOT_FOUND,
                    statusCodes.NOT_FOUND
                );
            }
        } catch (error: any) {
            $logged(
                error.message,
                false,
                { file: __filename.split('/src')[1] },
                this.request.ip,
                true
            )
            $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }
    deleteKeyById = async ({ params }: { params: Record<string, any> }) => {
        try {
            const key_id = params.key_id;
            let { user_id } = this.reqQuery;
            if (user_id && JSON.parse(this.reqBody.authentication_result).session.payload.user_id == user_id) {
                return await this.database.aIConversationKeys.delete({
                    where: { id: Number(key_id) },
                }).then(result => {
                    return $sendResponse.success(
                        { deleted: result.id },
                        this.response,
                        apiMessageKeys.DONE,
                        statusCodes.OK
                    );
                }).catch((error) => {
                    return $sendResponse.failed(
                        {},
                        this.response,
                        apiMessageKeys.KEY_NOT_FOUND,
                        statusCodes.NOT_FOUND
                    );
                }).finally(() => {
                    this.database.$disconnect();
                });
            } else {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.USER_NOT_FOUND,
                    statusCodes.NOT_FOUND
                );
            }
        } catch (error: any) {
            $logged(
                error.message,
                false,
                { file: __filename.split('/src')[1] },
                this.request.ip,
                true
            )
            $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }
    deleteAllKeysByUserId = async () => {
        try {
            let { user_id } = this.reqQuery;
            if (user_id && JSON.parse(this.reqBody.authentication_result).session.payload.user_id == user_id) {
                return await this.database.aIConversationKeys.deleteMany({
                    where: { user_id },
                }).then(result => {
                    return $sendResponse.success(
                        { deleted: result.count },
                        this.response,
                        apiMessageKeys.DONE,
                        statusCodes.OK
                    );
                }).catch((error) => {
                    return $sendResponse.failed(
                        {},
                        this.response,
                        apiMessageKeys.SOMETHING_WENT_WRONG,
                        statusCodes.UNPROCESSABLE_ENTITY
                    );
                }).finally(() => {
                    this.database.$disconnect();
                });
            } else {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.USER_NOT_FOUND,
                    statusCodes.NOT_FOUND
                );
            }
        } catch (error: any) {
            $logged(
                error.message,
                false,
                { file: __filename.split('/src')[1] },
                this.request.ip,
                true
            )
            $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }

    getHistoryByKeyId = async () => {
        try {
            let { key_id, user_id } = this.reqQuery;
            if (user_id && JSON.parse(this.reqBody.authentication_result).session.payload.user_id == user_id) {
                return await this.database.aIConversationKeys.findFirst({ where: { id: Number(key_id) }, include: { AIConversationHistory: true } }).then(result => {
                    let data = result?.AIConversationHistory.map(item => {
                        return {
                            c_id: item.conversation_id,
                            c_key: item.conversation_key,
                            input: definationExamples.default.resolver({
                                role: 'user',
                                content: item.question
                            }),
                            output: definationExamples.default.resolver({
                                role: 'assistant',
                                content: item.response
                            }),
                            save: item.saved,
                            date: item.created_at
                        }
                    });
                    data?.shift();
                    data = data?.reverse();
                    return $sendResponse.success(
                        data,
                        this.response,
                        apiMessageKeys.DONE,
                        statusCodes.OK
                    );
                }).catch((error) => {
                    throw error;
                }).finally(() => {
                    this.database.$disconnect();
                });
            }
            return $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.USER_NOT_FOUND,
                statusCodes.NOT_FOUND
            );
        } catch (error: any) {
            $logged(
                error.message,
                false,
                { file: __filename.split('/src')[1] },
                this.request.ip,
                true
            )
            $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }
    saveHistoryByConversationId = async ({ params }: { params: Record<string, any> }) => {
        try {
            const c_id = params.conversation_id;
            let { user_id, save } = this.reqBody;
            if (user_id && JSON.parse(this.reqBody.authentication_result).session.payload.user_id == user_id) {
                return await this.database.aIConversationHistory.update({
                    where: { conversation_id: Number(c_id) },
                    data: {
                        saved: !!save
                    }
                }).then(result => {
                    return $sendResponse.success(
                        { saved: result.saved },
                        this.response,
                        apiMessageKeys.DONE,
                        statusCodes.OK
                    );
                }).catch((error) => {
                    return $sendResponse.failed(
                        {},
                        this.response,
                        apiMessageKeys.KEY_NOT_FOUND,
                        statusCodes.NOT_FOUND
                    );
                }).finally(() => {
                    this.database.$disconnect();
                });
            } else {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.USER_NOT_FOUND,
                    statusCodes.NOT_FOUND
                );
            }
        } catch (error: any) {
            $logged(
                error.message,
                false,
                { file: __filename.split('/src')[1] },
                this.request.ip,
                true
            )
            $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }
    deleteHistoryByConversationId = async ({ params }: { params: Record<string, any> }) => {
        try {
            const c_id = params.conversation_id;
            let { user_id } = this.reqQuery;
            if (user_id && JSON.parse(this.reqBody.authentication_result).session.payload.user_id == user_id) {
                return await this.database.aIConversationHistory.delete({
                    where: { conversation_id: Number(c_id) },
                }).then(result => {
                    return $sendResponse.success(
                        { deleted: result.conversation_id },
                        this.response,
                        apiMessageKeys.DONE,
                        statusCodes.OK
                    );
                }).catch((error) => {
                    return $sendResponse.failed(
                        {},
                        this.response,
                        apiMessageKeys.KEY_NOT_FOUND,
                        statusCodes.NOT_FOUND
                    );
                }).finally(() => {
                    this.database.$disconnect();
                });
            } else {
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.USER_NOT_FOUND,
                    statusCodes.NOT_FOUND
                );
            }
        } catch (error: any) {
            $logged(
                error.message,
                false,
                { file: __filename.split('/src')[1] },
                this.request.ip,
                true
            )
            $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }

    generateConversation = async (
        data: {
            topic: string,
            user_id: number | string,
            model: string,
            key_name: string,
            okay_response: string,
        }
    ) => {
        const {
            topic,
            user_id,
            model,
            key_name,
            okay_response,
        } = data;
        // Create converstation key:
        let conversation_key = await bcrypt.hash(
            [user_id, model, key_name, process.env.APP_BRAND_NAME?.toLowerCase()].join('-'),
            10
        );
        conversation_key = conversation_key.split('$2b$10$')[1];
        conversation_key = conversation_key.split('/').join('$');

        // Register converstation key:
        const created = await this.database.aIConversationKeys.create({
            data: {
                user_id: Number(user_id),
                key_name,
                conversation_key,
                model,
                topic
            }
        });
        await this.database.aIConversationHistory.create({
            data: {
                conversation_key,
                question: topic,
                response: okay_response
            }
        });

        // Return result:
        return {
            conversation_key,
            created_at: created.created_at,
        }
    }
    ask = async (cData: { conversation_key: string, key_name: AvailableKeyNames }, payload: { user_id: any, data: any }) => {
        try {
            const { user_id, data } = payload;
            const { conversation_key, key_name } = cData;

            if (conversation_key) {
                if (user_id && JSON.parse(this.reqBody.authentication_result).session.payload.user_id == user_id) {
                    const conversation = await this.database.aIConversationKeys.findUnique({
                        where: {
                            user_id: Number(user_id),
                            conversation_key: conversation_key.toString(),
                            key_name: key_name.toString()
                        },
                        include: {
                            Users: true
                        }
                    });
                    if (conversation) {
                        if (this.#availableModels.includes(conversation.model)) {
                            const question = JSON.stringify(data.value);
                            if (question) {
                                // @ts-ignore
                                const history: any[] = await this.getFirstAndLastRows(conversation_key); // these function i add to decrease token usage
                                const chat = await this.database.aIConversationHistory.create({
                                    data: {
                                        question,
                                        response: '',
                                        conversation_key
                                    }
                                });

                                let gen;
                                if (this.#availableModels.indexOf(conversation.model) === 0) {
                                    gen = await this.#Gen(chat, history, conversation.Users);
                                } else if (this.#availableModels.indexOf(conversation.model) === 1) {
                                    gen = await this.#Gen1(chat, history, conversation.Users);
                                } else if (this.#availableModels.indexOf(conversation.model) === 2) {
                                    gen = await this.#Gen2(chat, history, conversation.Users);
                                } else {
                                    return $sendResponse.failed(
                                        {},
                                        this.response,
                                        apiMessageKeys.MODEL_IS_UNSUPPORTED,
                                        statusCodes.UNPROCESSABLE_ENTITY
                                    );
                                }

                                if (gen) {
                                    await this.database.aIConversationHistory.update({
                                        where: { conversation_id: chat.conversation_id },
                                        data: {
                                            response: `${gen?.response}`,
                                        }
                                    });
                                    let data = gen.chat.reverse();

                                    if (data.length > 2) {
                                        // For delete inital chats 
                                        data.pop(); // for user side
                                        data.pop(); // for assistant side
                                    }
                                    return data;
                                }
                            } else {
                                return $sendResponse.failed(
                                    {},
                                    this.response,
                                    apiMessageKeys.VALUE_REQUIRED,
                                    statusCodes.UNPROCESSABLE_ENTITY
                                );
                            }
                        } else {
                            return $sendResponse.failed(
                                {},
                                this.response,
                                apiMessageKeys.MODEL_IS_UNSUPPORTED,
                                statusCodes.UNPROCESSABLE_ENTITY
                            );
                        }
                    }
                    return $sendResponse.failed(
                        {},
                        this.response,
                        apiMessageKeys.INVALID_CONVERSATION_KEY,
                        statusCodes.UNPROCESSABLE_ENTITY
                    );
                }

                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.USER_NOT_FOUND,
                    statusCodes.NOT_FOUND
                );
            }
            return $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.INVALID_CONVERSATION_KEY,
                statusCodes.UNPROCESSABLE_ENTITY
            );

        } catch (error: any) {
            $logged(
                error.message,
                false,
                { file: __filename.split('/src')[1] },
                this.request.ip,
                true
            )
            $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }

    // ------------------------------------------------------------------------------

    start = async () => {
        try {
            let { user_id, key_name } = this.reqQuery;
            if (user_id && JSON.parse(this.reqBody.authentication_result).session.payload.user_id == user_id) {
                const user = await this.database.users.findUnique({ where: { id: Number(user_id) }, include: { AIConversationKeys: true, UserDetails: true } });
                if (user) {
                    if (!key_name) {
                        $logged(
                            'Error: Undefined "key_name" request',
                            false,
                            { file: __filename.split('/src')[1] },
                            this.request.ip,
                            true
                        )
                        return $sendResponse.failed(
                            {},
                            this.response,
                            apiMessageKeys.KEY_NAME_IS_UNDEFINED,
                            statusCodes.UNPROCESSABLE_ENTITY
                        );
                    } else if (key_name && !this.#availableKeys.includes(key_name)) {
                        $logged(
                            'Error: Unrecognizable "key_name" request',
                            false,
                            { file: __filename.split('/src')[1] },
                            this.request.ip,
                            true
                        )
                        return $sendResponse.failed(
                            {},
                            this.response,
                            apiMessageKeys.INVALID_KEY_NAME,
                            statusCodes.UNPROCESSABLE_ENTITY
                        );
                    }
                    const preset = aiPresets(key_name)(user.fullname, user.UserDetails?.preferred_lang);
                    const result = await this.generateConversation({
                        user_id,
                        key_name,
                        topic: preset.topic,
                        model: preset.model,
                        okay_response: definationExamples.default.okay_response()
                    });


                    return $sendResponse.success(
                        {
                            result
                        },
                        this.response,
                        apiMessageKeys.DONE,
                        statusCodes.OK,
                    );

                }
            }
            return $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.USER_NOT_FOUND,
                statusCodes.NOT_FOUND
            );
        } catch (error: any) {
            $logged(
                error.message,
                false,
                { file: __filename.split('/src')[1] },
                this.request.ip,
                true
            )
            $sendResponse.failed(
                {},
                this.response,
                apiMessageKeys.SOMETHING_WENT_WRONG,
                statusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }
    jsonGenerator = async ({ params }: { params: Record<string, any> }) => {
        const conversation_key = params.conversation_key;
        const data = await this.ask({ conversation_key, key_name: 'json_generator' }, { user_id: this.reqBody.user_id, data: this.reqBody.data });
        if (data) {
            return $sendResponse.success(
                definationExamples.default.resolver(data[0]),
                this.response,
                apiMessageKeys.DONE,
                statusCodes.OK
            );
        }

    }
    jsonGeneratorById = async ({ params }: { params: Record<string, any> }) => {
        if (params.conversation_id) {
            const conversation_id = Number(params.conversation_id);
            if(conversation_id) {
                const history = await this.database.aIConversationHistory.findFirst({where: {conversation_id}});
                if(history) {
                    const key = await this.database.aIConversationKeys.findFirst({where: {conversation_key: history.conversation_key}});
                    if(key && key.key_name === 'json_generator') {
                        // This is for bypass auth and check user_id validation
                        this.reqBody.authentication_result = JSON.stringify({session: {payload: {user_id: key.user_id}}});

                        let value;
                        if(history.question) {
                            value = JSON.parse(history.question);
                            if(!value['message'].startsWith('API: ')) {
                                value['message'] = `API: ${value['message']}`
                            }
                        } else {
                            value = {message: "API: <Empty query>", result: {}}
                        }

                        const data = await this.ask(
                            { conversation_key: history.conversation_key, key_name: 'json_generator' }, 
                            { user_id: key.user_id, data: { value } }
                        );
                        if (data) {
                            return $sendResponse.success(
                                definationExamples.default.resolver(data[0]).result,
                                this.response,
                                apiMessageKeys.DONE,
                                statusCodes.OK
                            );
                        }
                        return null;
                    }
                }
                return $sendResponse.failed(
                    {},
                    this.response,
                    apiMessageKeys.KEY_NOT_FOUND,
                    statusCodes.NOT_FOUND
                );
            }
        }
        return $sendResponse.failed(
            {},
            this.response,
            apiMessageKeys.VALUE_REQUIRED,
            statusCodes.UNPROCESSABLE_ENTITY
        );
    }
    aiTranslator = async ({ params }: { params: Record<string, any> }) => {
        const conversation_key = params.conversation_key;
        const data = await this.ask({ conversation_key, key_name: 'ai_translator' }, { user_id: this.reqBody.user_id, data: this.reqBody.data });
        if (data) {
            return $sendResponse.success(
                definationExamples.default.resolver(data[0]),
                this.response,
                apiMessageKeys.DONE,
                statusCodes.OK
            );
        }
    }
    #Gen1 = async (chat: any, history: any[], user: any) => {
        try {
            const history_order: any[] = [];
            history.forEach((item, index) => {
                history_order.push({
                    role: index === 0 ? 'system' : 'user',
                    content: item.question
                });
                if (this.#modelDeepSeek.configs.model === 'deepseek-reasoner') {
                    if (index !== 0) {
                        history_order.push({
                            role: 'assistant',
                            content: item.response
                        });
                    }
                } else {
                    history_order.push({
                        role: 'assistant',
                        content: item.response
                    });
                }
            });
            this.#modelDeepSeek.conversationHistory = history_order;
            const response = await this.#modelDeepSeek.sendMessage(chat.question);
            return {
                response,
                chat: this.#modelDeepSeek.conversationHistory
            };
        } catch (error: any) {
            console.log(error.message);
        }
    }
    #Gen2 = async (chat: any, history: any[], user: any) => {
        try {
            const history_order: any[] = [];
            history.forEach((item, index) => {
                history_order.push({
                    role: index === 0 ? 'system' : 'user',
                    content: item.question
                });
                history_order.push({
                    role: 'assistant',
                    content: item.response
                });
            })
            this.#modelGrok.conversationHistory = history_order;
            const response = await this.#modelGrok.sendMessage(chat.question);
            return {
                response,
                chat: this.#modelGrok.conversationHistory
            };
        } catch (error: any) {
            console.log(error.message);
        }
    }
    #Gen = async (chat: any, history: any[], user: any) => {
        try {
            const history_order: any[] = [];
            history.forEach((item, index) => {
                history_order.push({
                    role: index === 0 ? 'system' : 'user',
                    content: item.question
                });
                history_order.push({
                    role: 'assistant',
                    content: item.response
                });
            })
            this.#modelChatGPT.conversationHistory = history_order;
            const response = await this.#modelChatGPT.sendMessage(chat.question);
            return {
                response,
                chat: this.#modelChatGPT.conversationHistory
            };
        } catch (error: any) {
            console.log(error.message);
        }
    }
    getFirstAndLastRows = async (conversationKey: string, count = 2) => {
        const prisma = this.database;
        try {
            const rows = await prisma.$queryRaw`
            WITH FilteredRows AS (
              SELECT *
              FROM AIConversationHistory
              WHERE conversation_key = ${conversationKey}
            ),
            RankedRows AS (
              SELECT *,
                     ROW_NUMBER() OVER () AS row_num,
                     COUNT(*) OVER () AS total_rows
              FROM FilteredRows
            )
            SELECT *
            FROM RankedRows
            WHERE row_num <= ${count} OR row_num > total_rows - ${count}
            ORDER BY row_num;
          `;
            return rows;
        } catch (error) {
            console.error('Error executing query:', error);
            throw error;
        } finally {
            await prisma.$disconnect();
        }
    }

}

export default $callToAction(AIManagementController);