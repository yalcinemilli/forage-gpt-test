// src/app/lib/openai.ts

import { OpenAI } from "openai";

interface OpenAIResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});


export async function createEmbedding(customerMessage: string) {
 const embeddingResp = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: customerMessage,
    })

    console.log('✅ Embedding erstellt, suche ähnliche Fälle...')

    return embeddingResp.data[0].embedding;
    
}

export async function chatgptRequest(systempromt: string, userpromt: string) {

    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API Key ist nicht konfiguriert');
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: systempromt,
                    },
                    {
                        role: 'user',
                        content: userpromt,
                    },
                ],
                temperature: 0.4,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API Fehler: ${response.status}`);
        }

        const data: OpenAIResponse = await response.json();
        return data;

    } catch (error) {
        console.error('❌ Fehler bei OpenAI-Analyse:', error);
        return null;
    }
}
