import { $callToAction, $sendResponse } from "~/assets/helpers/methods";
import { Controller } from "~/assets/types/controller"
import {Request, Response} from 'express';
import { $logged } from "~/assets/helpers/logHelpers";
import apiMessageKeys from "~/assets/constants/apiMessageKeys";
import statusCodes from "~/assets/constants/statusCodes";
import { EmailsCanBe, SMTPAddress } from "~/assets/configurations/emailConfigs";

class SMTPController extends Controller {
    constructor(request: Request, response: Response) {
        super(request, response);
    }
    async sendEmailToUser(user_id: number, withEmail: EmailsCanBe, template: any){
        let user = await this.database.users.findFirst({
            where: {
                id: user_id
            },
            include: {
                UserDetails: true,
            }
        });
        if(user){
            const to = user.email;
            return await SMTPAddress[withEmail].transporter.sendMail({
                from: `${SMTPAddress[withEmail].label} <${SMTPAddress[withEmail].email}>`,
                to,
                subject: "Reset Password",
                text: "Hello there, here the link for reset your password!",
                html: `<h1> Hello world! </h1>`
            }).then(() => {
                $logged(
                    `📬 "Reset Password": {from: "${SMTPAddress[withEmail].email}", to: "${to}"}`,
                    true,
                    {from: 'smtp', file: __filename.split('/src')[1]},
                );
            }).catch((error: any) => {
                $logged(
                    `📬 "Reset Password": {from: "${SMTPAddress[withEmail].email}", to: "${to}"}`,
                    false,
                    {from: 'smtp', file: __filename.split('/src')[1]},
                );
                throw error;
            });
        } 
    }
}

export default SMTPController;