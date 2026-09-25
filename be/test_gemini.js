import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const keys = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k.length > 0);
console.log(`Loaded ${keys.length} keys from .env`);

async function testKeys() {
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        console.log(`Testing Key #${i + 1} (${key.substring(0, 10)}...)...`);
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent('Say hello in 3 words');
            console.log(`✅ SUCCESS on Key #${i + 1}! Response:`, result.response.text());
            return;
        } catch (err) {
            console.error(`❌ FAILED Key #${i + 1}:`, err.message || err);
        }
    }
    console.error('ALL KEYS FAILED!');
}

testKeys();
