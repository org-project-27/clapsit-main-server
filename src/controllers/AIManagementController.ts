import { Controller } from "~/assets/types/controller";
import { $callToAction, $sendResponse } from "~/assets/helpers/methods";
import { Request, Response } from 'express';
import { $logged } from "~/assets/helpers/logHelpers";
import apiMessageKeys from "~/assets/constants/apiMessageKeys";
import statusCodes from "~/assets/constants/statusCodes";
import jwt from "jsonwebtoken";

class AIManagementController extends Controller {
    constructor(request: Request, response: Response) {
        super(request, response);
        this.actions['GET']['/generate_conversation'] = this.generateConversation;
        this.actions['POST']['/ask/:conversation_key'] = this.ask;
    }

    generateConversation = async () => {
        try {
            let { user_id, key_name } = this.reqQuery;

            if (user_id) {
                const user = await this.database.users.findUnique({ where: { id: Number(user_id) }, include: { AIConversationKeys: true } });
                if (user) {
                    // Create conversation key:
                    const token = jwt.sign({ user_id }, process.env.ACCESS_TOKEN_SECRET!);
                    const conversation_key = token.split('.').reverse().join('');
                    const created = await this.database.aIConversationKeys.create({
                        data: {
                            user_id: Number(user_id),
                            key_name: key_name || `Unnamed ${user.AIConversationKeys.length + 1}`,
                            conversation_key,
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
            const payload = this.reqBody;
            /** TODO:
             *  1. Check: conversation_key exist!
             *  2. Check: user_id exist!
             *  3. Check: There is a user with user_id and have key conversation_key!
             *  4. Check: Message and file is usefull!
             *  5. Send: To AI and wait response!
             *  6. Save: Message and Response to -> AIConversationHistory with conversation_key!
             *  7. Return: Message to user with date(created_at on AIConversationHistory)!
             * */
            
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
}

export default $callToAction(AIManagementController);