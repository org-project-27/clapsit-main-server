import 'dotenv/config';
import {SMTPAddress} from "#assets/configurations/emailConfigs";
import {available_email_langs, default_email_lang} from "#assets/constants/language";
import {promises as fs} from 'fs';
import path from 'path';
import {
    ConfirmEmailEmailPayloadTypes,
    PasswordUpdatedEmailPayloadTypes,
    ResetPasswordEmailPayloadTypes,
} from "#types/sendEmail";
import {$logged} from "#helpers/logHelpers";

const appDomain: any = process.env.APP_BRAND_DOMAIN;
const company_name: any = process.env.APP_BRAND_NAME;

type LangType = typeof available_email_langs[number] | string;

export function $sendEmail(to: string, lang: LangType = default_email_lang) {
    return {
        '@noreply': {
            async resetPassword(payload: ResetPasswordEmailPayloadTypes) {
                const { full_name, reset_link, reset_link_life_hour } = payload;
                return await SMTPAddress.noreply.transporter.sendMail({
                    from: `${SMTPAddress.noreply.label} <${SMTPAddress.noreply.email}>`,
                    to,
                    subject: "Reset Password",
                    text: "Hello there, here the link for reset your password!",
                    html: await getEmailTemplate('reset_password', {
                        reset_link,
                        full_name,
                        company_name,
                        reset_link_life_hour,
                        support_team_email: SMTPAddress.support.email,
                    }, lang),
                }).then(() => {
                    $logged(
                        `📬 "Reset Password": {from: "${SMTPAddress.noreply.email}", to: "${to}"}`,
                        true,
                        {from: 'smtp', file: __filename.split('/src')[1]},
                    );
                }).catch((error: any) => {
                    $logged(
                        `📬 "Reset Password": {from: "${SMTPAddress.noreply.email}", to: "${to}"}`,
                        false,
                        {from: 'smtp', file: __filename.split('/src')[1]},
                    );
                    throw error;
                });
            },
            async confirmEmail(payload: ConfirmEmailEmailPayloadTypes) {
                const { full_name, confirm_link, confirm_link_life_hour } = payload;
                return await SMTPAddress.noreply.transporter.sendMail({
                    from: `${SMTPAddress.noreply.label} <${SMTPAddress.noreply.email}>`,
                    to,
                    subject: "Confirm Email",
                    text: "Hello there, welcome to Clapsit. Please Confirm your email address!",
                    html: await getEmailTemplate('confirm_email', {
                        support_team_email: SMTPAddress.support.email,
                        company_name,
                        full_name,
                        confirm_link,
                        confirm_link_life_hour
                    }, lang),
                }).then(() => {
                    $logged(
                        `📬 "Confirm Email": {from: "${SMTPAddress.noreply.email}", to: "${to}"}`,
                        true,
                        {from: 'smtp', file: __filename.split('/src')[1]},
                    );
                }).catch((error: any) => {
                    $logged(
                        `📬 "Confirm Email": {from: "${SMTPAddress.noreply.email}", to: "${to}"}`,
                        false,
                        {from: 'smtp', file: __filename.split('/src')[1]},
                    );
                    throw error;
                });
            },
            async passwordUpdated(payload: PasswordUpdatedEmailPayloadTypes){
                const { full_name, update_date, browser, os, platform } = payload;
                return await SMTPAddress.noreply.transporter.sendMail({
                    from: `${SMTPAddress.noreply.label} <${SMTPAddress.noreply.email}>`,
                    to,
                    subject: "Password Updated",
                    text: "Your password been successfully updated!",
                    html: await getEmailTemplate('password_updated', {
                        support_team_email: SMTPAddress.support.email,
                        company_name,
                        full_name,
                        update_date,
                        browser,
                        platform,
                        os,
                    }, lang),
                }).then(() => {
                    $logged(
                        `📬 "Password Updated": {from: "${SMTPAddress.noreply.email}", to: "${to}"}`,
                        true,
                        {from: 'smtp', file: __filename.split('/src')[1]},
                    );
                }).catch((error: any) => {
                    $logged(
                        `📬 "Password Updated": {from: "${SMTPAddress.noreply.email}", to: "${to}"}`,
                        false,
                        {from: 'smtp', file: __filename.split('/src')[1]},
                    );
                    throw error;
                });
            }
        },
    }
}

export async function getEmailTemplate(template_name: string, values: any = {}, lang: LangType = default_email_lang){
    values['logo_url'] = `https://www.${appDomain.toLowerCase()}/logo.png`
    console.log(values['logo_url']);
    
    let templateContent: any = '<strong> Null content </strong>';
    try {
        const filePath = path.join(__dirname, `../../../views/email_templates/${lang || default_email_lang}/${template_name}.html`);
        templateContent = await fs.readFile(filePath, 'utf8');
    } catch (error) {
        console.error('Error reading the HTML file', error);
    }

    Object.entries(values).forEach(([key, value]) => {
        templateContent = templateContent.replaceAll(`$${key}$`, `${value || null}`);
    });

    return templateContent;
}