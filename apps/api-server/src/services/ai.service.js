const prisma = require('../lib/prisma');

// Simple fetch-based service to handle multiple AI providers
// Supports openrouter, openai, gemini

class AIService {
  async generateReply(userId, incomingMessage) {
    // 1. Get AI config for user
    const aiConfig = await prisma.aiConfig.findFirst({
        where: { userId }
    });

    if (!aiConfig) {
        throw new Error('AI Config not found for user');
    }

    const { provider, apiKey, model } = aiConfig;
    const prompt = `You are a helpful customer service assistant for WhatsApp. Be concise and friendly. Respond to this message: "${incomingMessage}"`;

    if (provider === 'openai' || provider === 'openrouter') {
        const baseUrl = provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
        
        try {
            const response = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    ...(provider === 'openrouter' && {'HTTP-Referer': process.env.APP_URL || 'http://localhost'})
                },
                body: JSON.stringify({
                    model: model || (provider === 'openrouter' ? 'meta-llama/llama-3-8b-instruct:free' : 'gpt-3.5-turbo'),
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 250
                })
            });

            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
                return data.choices[0].message.content.trim();
            }
            throw new Error('Invalid AI response');
        } catch (error) {
            console.error('AI Service Error (OpenAI/OpenRouter):', error);
            throw error;
        }
    } 
    else if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await response.json();
            if (data.candidates && data.candidates.length > 0) {
                return data.candidates[0].content.parts[0].text.trim();
            }
            throw new Error('Invalid AI response');
        } catch (error) {
           console.error('AI Service Error (Gemini):', error);
           throw error; 
        }
    }

    return null;
  }
}

module.exports = new AIService();
