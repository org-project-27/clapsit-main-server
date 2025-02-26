import 'dotenv/config';
import {available_email_langs, default_email_lang} from "#assets/constants/language";
import {promises as fs} from 'fs';
import path from 'path';

const appDomain: any = process.env.APP_BRAND_DOMAIN;
const company_name: any = process.env.APP_BRAND_NAME;

type LangType = typeof available_email_langs[number] | string;

export async function getEmailTemplate(template_name: string, values: any = {}, lang: LangType = default_email_lang){
    values['logo_url'] = `https://www.${appDomain.toLowerCase()}/logo.png`
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