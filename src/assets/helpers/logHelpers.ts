import { ASCII_logo, currentLogFilePath, logsBasePath } from "#assets/constants/general";
import moment from "moment/moment";
import { isResponseSuccessful, readFromFile, writeToFile } from "#helpers/generalHelpers";
import { PathLike, existsSync, writeFile } from "node:fs";
import { sendLogToTelegramBot } from "#helpers/TelegramBot";
import dotenv from "dotenv";
import { $writeToFileSafe } from "./methods";
dotenv.config();

export const initLogs = () => {
    let beforeLogs = readFromFile(currentLogFilePath) || '-';
    $writeToFileSafe(beforeLogs, `${logsBasePath}/logs-${moment().format('DD.MM.YYYY-HH-mm-ss')}.logs.log`);
    $writeToFileSafe(ASCII_logo, currentLogFilePath);
}


type loggedTrigger = 'node' | 'prisma' | 'morgan' | string;
type loggedTriggerObjectType = {
    from: loggedTrigger,
    file: string | PathLike | any,
    url: string | PathLike | any,
    request: {
        path: string | any
        method: string | any
        protocol: string | any
        status: string | any
        time: string | any
    }
} | any

export function $logged(
    action: string | undefined = undefined,
    success: boolean,
    trigger: loggedTriggerObjectType = {
        from: "node",
    },
    ip: string | null = null,
    sendToTgBot: boolean = false,
) {
    const type = success ? 'DONE' : 'FAIL';
    const typeIcon = success ? '🟢' : '🔴';
    const date = {
        clock: moment().format('HH:mm:ss'),
        calendar: moment().format('DD/MM/YYYY')
    }
    if (ip && ip.includes('::ffff:')) {
        ip = ip.replace('::ffff:', '')
    }
    const logDate = `${date.calendar}:${date.clock}`;

    const log = `# [${typeIcon}][${type}][${logDate}] -> [${JSON.stringify(trigger)}${ip ? '(🏷️IP:' + ip + ')' : ''}] => [${action}]`;
    console.log(log);
    if(sendToTgBot){
        let botMessage = `${typeIcon} <b>#${type}</b> [${logDate}]\n\n`;
        if (!process.env.DEVELOPER_MODE) {
            if (trigger.from) botMessage = botMessage + `📡 <b>From</b>: "${trigger.from}" \n`;
            if (trigger.url) botMessage = botMessage + `🔗 <b>URL</b>: <a href="${trigger.url}">${trigger.url}</a> \n`;
            if (trigger.file) botMessage = botMessage + `📁 <b>File</b>: ${trigger.file} \n`;
            if (ip) botMessage = botMessage + `🌐 <b>IP Address</b>: ${ip} \n`;
            if (trigger.from !== 'morgan') {
                botMessage = botMessage + `<pre><code class="language-Message">${action}\n${JSON.stringify(trigger)}</code></pre>`
            } else {
                botMessage = botMessage + `<pre><code class="class-json">{\n`
                if (trigger.request.path) botMessage = botMessage + '"Path": ' + `"${trigger.request.path}"`
                if (trigger.request.method) botMessage = botMessage + '\n"Method": ' + `"${trigger.request.method}"`
                if (trigger.request.protocol) botMessage = botMessage + '\n"Protocol": ' + `"${trigger.request.protocol}"`
                if (trigger.request.status) botMessage = botMessage + '\n"Status": ' + `${trigger.request.status}`
                if (trigger.request.time) botMessage = botMessage + '\n"Time": ' + `"${trigger.request.time}"`
                botMessage = botMessage + `\n}</code></pre>`
            }
            sendLogToTelegramBot(botMessage, 'html');
        }
    }

    let beforeLogs = readFromFile(currentLogFilePath);
    const logs = beforeLogs + "\n" + log;
    writeToFile(logs, currentLogFilePath)
}

export function $loggedForMorgan(message: string) {
    const morganData = message.split('"');
    const IP = morganData[0] || '--';
    const reqHeader = morganData[1] || '--';
    const reqStatus = morganData[2] || '--';
    const reqFromURL = morganData[3] || '--';
    const reqBrowserInfo = morganData[5] || '--';

    const reqMethod = reqHeader.split(" ")[0] || '--';
    const reqToURL = reqHeader.split(" ")[1] || '--';
    const reqHTTPType = reqHeader.split(" ")[2] || '--';
    const reqStatusCode = reqStatus.trim().split(' ')[0];
    const resTime = reqStatus.trim().split(' ')[1] + 'ms';
    const resSuccess = isResponseSuccessful(Number(reqStatusCode))
    let reqFromIp = IP.split(" ")[0];
    const action = `🔘<${reqHeader})>(status: ${reqStatusCode}) -- ${resTime}`
    $logged(action, resSuccess, {
        from: 'morgan',
        url: `${reqFromURL}`,
        request: reqBrowserInfo
    },
        reqFromIp);
}