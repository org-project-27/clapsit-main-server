import { default_email_lang } from "./language";

export const introducing = (fullname: string, preferred_lang: string | null | undefined) => {
    const str = [
        `Hello there. This is pre-informing message for you:`,
    ];
    if (fullname) {
        str.push(`My name is ${fullname}.`)
    }
    str.push(
        `Please speak with me in ${preferred_lang ? preferred_lang : default_email_lang} language, until i say change language.`,
    )
    return str;
}
export const setResponseFormat = (
    format: 'Text' | 'JSON' | 'HTML' | 'JS/TS Object' = 'JSON', 
    definationExample: string = definationExamples.default.example) => {
        const str: string[] = [];
        str.push(`I will meet you with a robot. So please give me response with ${format || 'text'} format that for robot understand you!`);
        str.push(`There is a example for you:\n ${definationExample}.`);
        return str;
}

export const definationExamples = {
    default: {
        example: `{"message": "This area for you, use this area if you want to do comment or advice.", "result": "this area most important use it for results, values etc.", "success": "return true only when if you understand what you will do and everything is okay otherwise this area must be false"}`,
        okay_response: `{"message": "Okay i understood", "result": "Ready", "success": true}`
    },
}

export const presets = {
    json_generator: (fullname: string, preferred_lang: string | null | undefined) => {
        const topic = [
            `If you understand so far than lets pass through to you mission:`,
            `Robots send you a example (looks like some json but there is comments instead values) and you have to fill out with values which robots wants on the comments belove!`,
            `>> Robot input: {"message": //a greeting message, "value": // a random number between 1-99, first_name: // random name John, Michele, Clieve}`,
            '>> Your output have to: {"message": "All Done!", "result": {"message": "Hello world", value: 27, first_name: "Michele"}, "success": true}',
        ]

        const str: string[] = [];
        // Pre-informing
        str.push(introducing(fullname, preferred_lang).join('\n'));
        str.push(setResponseFormat().join('\n'));

        // Explain mission
        str.push(topic.join(`\n`));

        str.push("Let's get start!");
        return str.join('\n');
    }
}


export default function(key_name: 'json_generator') {
    return presets[key_name];
}