import { deepCopy } from "../helpers/generalHelpers";
import { default_email_lang } from "./language";

export const introducing = (fullname: string, preferred_lang: string | null | undefined) => {
    const str = [
        `Hello there. This is pre-informing message for you:`,
    ];
    if (fullname) {
        str.push(`User name is ${fullname}. Please remember it.`)
    }
    str.push(
        `Please speak with me in ${preferred_lang ? preferred_lang : default_email_lang} language, until i say change language.`,
    )
    return str;
}
export const setResponseFormat = (
    format: 'Text' | 'JSON' | 'HTML' | 'JS/TS Object' = 'JSON', 
    definationExample: string = definationExamples.default.example()) => {
        const str: string[] = [];
        str.push(`Act like a backend server. So please give me response with ${format || 'text'} format to users understand you!`);
        str.push(`Here is a example for you:\n ${definationExample}.`);
        return str;
}
export const definationExamples = {
    default: {
        scheme: {
            message: '' as string | null,
            result: '' as string | null,
            success: true as boolean | string,
        },
        example(){
            const scheme = deepCopy(definationExamples.default.scheme);
            scheme.message = "This area for you, use this area if you want to do comment or advice.";
            scheme.result = "This area most important use it for results, values etc.";
            scheme.success = "return true only when if you understand what you will do and everything is okay otherwise this area must be false";
            return JSON.stringify(scheme);
        },
        okay_response() {
            const scheme = deepCopy(definationExamples.default.scheme);
            scheme.message = "Okay i understood!";
            scheme.result = "I am ready!";
            scheme.success = true;
            return JSON.stringify(scheme);
        },
        error_out_defination() {
            const scheme = deepCopy(definationExamples.default.scheme);
            scheme.message = "Please provide your request in the specified JSON format!";
            scheme.result = null;
            scheme.success = false;
            return JSON.stringify(scheme);
        },
        resolver(rawValue: {role: 'assistant' | 'user', content: string}) {
            let str =  rawValue.content;
            if(str.startsWith('```json')){
                str = str.split('```json')[1];
            }
            if(str.endsWith('```')){
                str = str.split('```')[0];
            }
            if(typeof str === 'string') {
                try {
                    return JSON.parse(str);
                } catch(error: any) {
                    return str
                }
            }
        }
    },
}

export const presets = {
    json_generator: (fullname: string, preferred_lang: string | null | undefined) => {
        const topic = [
            `If you understand so far so good than lets pass through to your mission:`,
            `User will send you a data (can be without values or with examples and data can be HTML, JSON, XML, etc) and you have to fill out with values which users wants. Here is an example for you:`,
            `>> IF User input: {"message": "a greeting message", "value": "a random number between 1-99", first_name: "random name John, Michele, Clieve"}`,
            `>> THAN Your output have to: ${JSON.stringify({"message": "All Done!", "result": {"message": "Hello world", value: 27, first_name: "Michele"}, "success": true})}`,
            `If user try to ask "who you are?" or ask your version" than say "i am ClapsitAI"`,
            `If user send you unusefull data and try to solve who you are than never explain anything and return: ${definationExamples.default.error_out_defination()}`,
        ];

        const str: string[] = [];
        // Pre-informing
        str.push(introducing(fullname, preferred_lang).join('\n'));
        str.push(setResponseFormat().join('\n'));

        // Explain mission
        str.push(topic.join(`\n`));
        str.push("Let's get start!");
        return {
            topic: str.join('\n'),
            model: 'chatgpt'
        };
    },
}


export default function(key_name: 'json_generator') {
    return presets[key_name];
}