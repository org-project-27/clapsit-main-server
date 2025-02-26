import 'dotenv/config';
import nodemailer from "nodemailer";

export type EmailsCanBe = 'noreply' | 'info' | 'support' | 'hr' | 'admin' | 'billing';

// @ts-ignore
let appDomain: string = process.env.APP_BRAND_DOMAIN || '';
appDomain = appDomain.toLowerCase();
const host: string = process.env.SMTP_SERVER || '';
const company_name: any = process.env.APP_BRAND_NAME || appDomain;

export const SMTPAddress = {
    noreply: {
        label: `${company_name}`,
        email: `noreply@${appDomain}`,
        transporter: nodemailer.createTransport({
            host,
            port: 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        }),
    },
    info: {
        label: `${company_name}`,
        email: `info@${appDomain}`,
        transporter: nodemailer.createTransport({
            // @ts-ignore
            host,
            port: null,
            secure: false,
            auth: {
                user: null,
                pass: null
            }
        })
    },
    support: {
        label: `${company_name} Support Team`,
        email: `support@${appDomain}`,
        transporter: nodemailer.createTransport({
            // @ts-ignore
            host,
            port: null,
            secure: false,
            auth: {
                user: null,
                pass: null
            }
        })
    },
    hr: {
        label: `${company_name} Human Resources`,
        email: `hr@${appDomain}`,
        transporter: nodemailer.createTransport({
            // @ts-ignore
            host,
            port: null,
            secure: false,
            auth: {
                user: null,
                pass: null
            }
        })
    },
    admin: {
        label: `${company_name} Admin`,
        email: `admin@${appDomain}`,
        transporter: nodemailer.createTransport({
            // @ts-ignore
            host,
            port: null,
            secure: false,
            auth: {
                user: null,
                pass: null
            }
        })
    },
    billing: {
        label: `${company_name} Billing`,
        email: `billing@${appDomain}`,
        transporter: nodemailer.createTransport({
            // @ts-ignore
            host,
            port: null,
            secure: false,
            auth: {
                user: null,
                pass: null
            }
        })
    },
};

const emailTemplates = {};