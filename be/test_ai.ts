import { AiClientManager } from './src/modules/grading/engine/infrastructure/ai/AiClientManager.js';
import { GeminiAiProvider } from './src/modules/grading/engine/infrastructure/ai/GeminiAiProvider.js';

async function main() {
    console.log('Testing GeminiAiProvider.generateAssignmentContentAsync...');
    try {
        const provider = new GeminiAiProvider();
        const res = await provider.generateAssignmentContentAsync('Viết đề thi lập trình Java OOP quản lý thư viện sách');
        console.log('--- RESULT ---');
        console.log(res);
    } catch (err) {
        console.error('--- ERROR ---', err);
    }
}

main();
