import OpenAI from "openai";
import { $logged } from "./logHelpers";

export default class Chatbot {
    conversationHistory: any[] = [];
    openai;
    configs;

    constructor(configs: {
        baseURL: any,
        apiKey: any,
        configs?: any,
    }) {
        this.openai = new OpenAI({
            baseURL: configs.baseURL,
            apiKey: configs.apiKey,
        });
        this.configs = configs;
    }

    sendMessage = async (userMessage: any) => {
        try {
            this.conversationHistory.push({ role: "user", content: userMessage });
            const payload = {
                ...this.configs.configs,
                messages: this.conversationHistory,
                model: "deepseek-chat",
            };
            
            const completion = await this.openai.chat.completions.create(payload);
            const assistantReply = completion.choices[0].message.content;
            this.conversationHistory.push({ role: "assistant", content: assistantReply });
            return assistantReply;
        } catch (error: any) {
            $logged('Error occurred: ' + error, false, 'ChatBot', null, true);
            if (error.response) {
                $logged('Error Response: ' + error.response.data, false, 'ChatBot', null, true);
            }
            throw error;
        }
    }
}

export const chatbot_response_configs = {
    coding_and_math: {
        temperature: 0.0,
        max_tokens: 200,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    },
    data_cleaning_and_analysis: {
        temperature: 1.0,
        max_tokens: 150,
        top_p: 1,
        frequency_penalty: 0.2,
        presence_penalty: 0.2
    },
    general_conversation: {
        temperature: 1.3,
        max_tokens: 100,
        top_p: 1,
        frequency_penalty: 0.3,
        presence_penalty: 0.3
    },
    translation: {
        temperature: 1.3,
        max_tokens: 100,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    },
    creative_writing_poetry: {
        temperature: 1.5,
        max_tokens: 250,
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.5
    }
};
