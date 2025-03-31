import { Controller } from "~/assets/types/controller";
import { $callToAction, $sendResponse } from "~/assets/helpers/methods";
import { Request, Response } from 'express';
import { $logged } from "~/assets/helpers/logHelpers";
import apiMessageKeys from "~/assets/constants/apiMessageKeys";
import statusCodes from "~/assets/constants/statusCodes";
import jwt from "jsonwebtoken";
import Chatbot, { chatbot_response_configs } from "~/assets/helpers/chatBot";
import aiPresets, { definationExamples, presets } from "~/assets/constants/aiPresets";

export class AIManagementController extends Controller {
    #modelGrok;
    #modelDeepSeek;
    #availableModels: string[] = ['', 'deep_seek', 'grok'];
    #availableKeys: string[] = Object.keys(presets);

    constructor(request: Request, response: Response) {
        super(request, response);
        this.actions['GET']['/start'] = this.start;
        this.actions['POST']['/ask/:conversation_key'] = this.ask;
        this.#modelGrok = new Chatbot({
            baseURL: process.env.GROK_BASE_URL,
            apiKey: process.env.GROK_API_KEY,
            model: 'grok-2-vision-latest',
        });
        this.#modelDeepSeek = new Chatbot({
            baseURL: process.env.DEEPSEEK_BASE_URL,
            apiKey: process.env.DEEPSEEK_API_KEY,
            model: 'deepseek-chat',
        });
    }

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

                    const result = await this.generateConversation({
                        topic: aiPresets(key_name)(user.fullname, user.UserDetails?.preferred_lang),
                        user_id,
                        key_name,
                        model: 'grok',
                        okay_response: definationExamples.default.okay_response
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
        const token = jwt.sign({ user_id, model, key_name }, process.env.ACCESS_TOKEN_SECRET!);
        const conversation_key = token.split('.').reverse().join('CIT');


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
    ask = async ({ params }: { params: Record<string, any> }) => {
        try {
            const conversation_key = params.conversation_key;
            const { user_id, data } = this.reqBody;

            if (conversation_key) {
                if (user_id && JSON.parse(this.reqBody.authentication_result).session.payload.user_id == user_id) {
                    const conversation = await this.database.aIConversationKeys.findUnique({ where: { user_id: Number(user_id), conversation_key }, include: { Users: true } });
                    if (conversation) {
                        if (this.#availableModels.includes(conversation.model)) {
                            const history = await this.database.aIConversationHistory.findMany({ where: { conversation_key } });
                            const chat = await this.database.aIConversationHistory.create({
                                data: {
                                    question: JSON.stringify(data.value),
                                    response: '',
                                    conversation_key
                                }
                            });

                            let gen;
                            if (this.#availableModels.indexOf(conversation.model) === 1) {
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
                                return $sendResponse.success(
                                    data,
                                    this.response,
                                    apiMessageKeys.DONE,
                                    statusCodes.OK
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
}

export default $callToAction(AIManagementController);