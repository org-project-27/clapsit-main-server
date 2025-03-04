import { Controller } from "~/assets/types/controller";
import { $callToAction, $sendResponse } from "~/assets/helpers/methods";
import { Request, Response } from 'express';
import { $logged } from "~/assets/helpers/logHelpers";
import apiMessageKeys from "~/assets/constants/apiMessageKeys";
import statusCodes from "~/assets/constants/statusCodes";
import jwt from "jsonwebtoken";
import Chatbot, { chatbot_response_configs } from "~/assets/helpers/chatBot";

class AIManagementController extends Controller {
    #model;
    constructor(request: Request, response: Response) {
        super(request, response);
        this.actions['GET']['/generate_conversation'] = this.generateConversation;
        this.actions['POST']['/ask/:conversation_key'] = this.ask;
        this.#model = new Chatbot({
            baseURL: process.env.AI_CHATBOT_BASE_URL,
            apiKey: process.env.AI_CHATBOT_API_KEY,
        });
    }

    generateConversation = async () => {
        try {
            let { user_id, key_name } = this.reqQuery;
            if (user_id && JSON.parse(this.reqBody.authentication_result).session.payload.user_id == user_id) {
                const user = await this.database.users.findUnique({ where: { id: Number(user_id) }, include: { AIConversationKeys: true, UserDetails: true } });
                if (user) {
                    if (!key_name) { key_name = `Unnamed ${user.AIConversationKeys.length + 1}` }

                    // Create conversation key:
                    const token = jwt.sign({ user_id }, process.env.ACCESS_TOKEN_SECRET!);
                    const conversation_key = token.split('.').reverse().join('');
                    const created = await this.database.aIConversationKeys.create({
                        data: {
                            user_id: Number(user_id),
                            key_name,
                            conversation_key,
                        }
                    });

                    await this.database.aIConversationHistory.create({
                        data: {
                            conversation_key,
                            question: `
                                Hello there. My name is ${user.fullname}.\n
                                We will talking about: ${key_name ? key_name : 'something'}. \n
                                Please speak with me in ${user.UserDetails?.preferred_lang ? user.UserDetails?.preferred_lang : 'english'} language, until i say change language.`,
                            response: `Okay, let's go!`
                        }
                    })

                    return $sendResponse.success(
                        {
                            conversation_key,
                            created_at: created.created_at,
                        },
                        this.response,
                        apiMessageKeys.DONE,
                        statusCodes.CREATED
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
    ask = async ({ params }: { params: Record<string, any> }) => {
        try {
            const conversation_key = params.conversation_key;
            const { user_id, data } = this.reqBody;

            if (conversation_key) {
                if (user_id && JSON.parse(this.reqBody.authentication_result).session.payload.user_id == user_id) {
                    const conversation = await this.database.aIConversationKeys.findUnique({ where: { user_id: Number(user_id), conversation_key }, include: { Users: true } });
                    if (conversation) {
                        const history = await this.database.aIConversationHistory.findMany({ where: { conversation_key } });

                        const chat = await this.database.aIConversationHistory.create({
                            data: {
                                question: data.message,
                                response: '',
                                conversation_key
                            }
                        });


                        const result = await this.defaultmodel(chat, history, conversation.Users);
                        if (result) {
                            await this.database.aIConversationHistory.update({
                                where: { conversation_id: chat.conversation_id },
                                data: {
                                    response: `${result?.response}`,
                                }
                            });
                            let data = result.chat.reverse();
                            
                            // For delete inital chats 
                            data.pop(); // for user side
                            data.pop(); // for assistant side
                            return $sendResponse.success(
                                data,
                                this.response,
                                apiMessageKeys.DONE,
                                statusCodes.CREATED
                            );
                        }
                    }
                    return $sendResponse.failed(
                        {},
                        this.response,
                        apiMessageKeys.INVALID_CONVERSATION_KEY,
                        statusCodes.NOT_ACCEPTABLE
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
                statusCodes.NOT_ACCEPTABLE
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
    defaultmodel = async (chat: any, history: any[], user: any) => {
        try {
            const history_order: any[] = [];
            history.forEach((item, index) => {
                history_order.push({
                    role: 'user',
                    content: item.question
                });
                history_order.push({
                    role: 'assistant',
                    content: item.response
                });
            })
            this.#model.conversationHistory = history_order;
            const response = await this.#model.sendMessage(chat.question);
            return {
                response,
                chat: this.#model.conversationHistory
            };
        } catch (error: any) {
            console.log(error.message);
        }
    }

}

export default $callToAction(AIManagementController);