import { $callToAction, $sendResponse } from "~/assets/helpers/methods";
import { Controller } from "~/assets/types/controller"
import { Request, Response } from 'express';
import { $logged } from "~/assets/helpers/logHelpers";
import apiMessageKeys from "~/assets/constants/apiMessageKeys";
import statusCodes from "~/assets/constants/statusCodes";
import { EmailsCanBe, SMTPAddress } from "~/assets/configurations/emailConfigs";
import { getEmailTemplate } from "~/assets/helpers/emailHelper";
import { default_email_lang } from "~/assets/constants/language";

/**
    Example usage: 
    
    const smtp = new SMTPController(this.request, this.response);
    const email = await smtp.sendEmailByUserId(2, 'noreply');

    await email?.resetPassword({
        reset_link: 'link',
        reset_link_life_hour: 14,
    });

    await email?.confirmEmail({
        confirm_link: 'link',
        confirm_link_life_hour: 24
    });
    
    await email?.passwordUpdated({
        update_date: 'any',
        browser: 'any',
        platform: 'any',
        os: 'any',
    });

    await email?.send(`
            <h1>Hello world</h1>
            <p>
                Success, SMTP Server is available
            </p>
        `, 
        { subject: "Test Email", description: "For check smtp server" }
    );
 
 **/


class SMTPController extends Controller {
    #appDomain: any = process.env.APP_BRAND_DOMAIN;
    #company_name: any = process.env.APP_BRAND_NAME;

    constructor(request: Request, response: Response) {
        super(request, response);
    }
    async sendEmailByUserId(
        user_id: number,
        withEmail: EmailsCanBe,
    ) {
        let user = await this.database.users.findFirst({
            where: {
                id: user_id
            },
            include: {
                UserDetails: true,
            }
        });
        if (user && user.email) {
            return {
                send: async (content: string | HTMLElement,
                    args: {
                        subject: string,
                        description: string,
                    }
                ) => {
                    if (content && args?.subject && args.description) {
                        return await this.#sendEmail(
                            user.email,
                            withEmail,
                            {
                                subject: args.subject,
                                description: args.description,
                                html: content
                            }
                        );
                    }
                },
                resetPassword: async (args: { reset_link: any, reset_link_life_hour: any }) => {
                    const template = await getEmailTemplate('reset_password', {
                        full_name: user.fullname,
                        company_name: this.#company_name,
                        reset_link: args.reset_link,
                        reset_link_life_hour: args.reset_link_life_hour,
                        support_team_email: SMTPAddress.support.email,
                    }, user.UserDetails?.preferred_lang || default_email_lang)
                    await this.#sendEmail(
                        user.email,
                        withEmail,
                        {
                            subject: 'Reset Password',
                            description: 'Reset your password with magic link',
                            html: template
                        }
                    );
                },
                confirmEmail: async (args: {
                    confirm_link: any,
                    confirm_link_life_hour: any,
                }) => {
                    const template = await getEmailTemplate('confirm_email', {
                        company_name: this.#company_name,
                        full_name: user.fullname,
                        confirm_link: args.confirm_link,
                        confirm_link_life_hour: args.confirm_link_life_hour,
                        support_team_email: SMTPAddress.support.email,
                    }, user.UserDetails?.preferred_lang || default_email_lang);
                    await this.#sendEmail(
                        user.email,
                        withEmail,
                        {
                            subject: 'Confirm Email',
                            description: 'Hello there, welcome to Clapsit. Please Confirm your email address!',
                            html: template
                        }
                    );
                },
                passwordUpdated: async (args: {
                    update_date: any,
                    browser: any,
                    platform: any,
                    os: any,
                }) => {
                    const template = await getEmailTemplate('password_updated', {
                        support_team_email: SMTPAddress.support.email,
                        company_name: this.#company_name,
                        full_name: user.fullname,
                        update_date: args.update_date,
                        browser: args.browser,
                        platform: args.platform,
                        os: args.os,
                    }, user.UserDetails?.preferred_lang || default_email_lang);

                    await this.#sendEmail(
                        user.email,
                        withEmail,
                        {
                            subject: 'Password Updated',
                            description: 'Your password been successfully updated!',
                            html: template
                        }
                    );
                },
            }
        }
    }
    async #sendEmail(to: string, withEmail: EmailsCanBe, content: {
        subject: string,
        description: string,
        html: string | HTMLElement
    }) {
        try {
            await SMTPAddress[withEmail].transporter.sendMail({
                to,
                from: `${SMTPAddress[withEmail].label} <${SMTPAddress[withEmail].email}>`,
                subject: content.subject,
                text: content.description,
                html: `<div id="email-body">${content.html}</div>`
            }).then(() => {
                $logged(
                    `📬 "${content.subject}": {from: "${SMTPAddress[withEmail].email}", to: "${to}"}`,
                    true,
                    { from: 'SMTP', file: __filename.split('/src')[1] },
                );
            }).catch((error: any) => {
                $logged(
                    `📬 "${content.subject}": {from: "${SMTPAddress[withEmail].email}", to: "${to}"}`,
                    false,
                    { from: 'SMTP', file: __filename.split('/src')[1] },
                );
                throw error;
            });
        } catch (error: any) {
            $logged(
                `SMTPController: ${error.message}`,
                false,
                { from: 'SMTP', file: __filename.split('/src')[1] },
            );
            throw error;
        }
    }
}

export default SMTPController;