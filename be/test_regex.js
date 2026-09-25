const prompt = '// FILE: a.dart\ncode\n\n---\n\n';
console.log(prompt.match(/\/\/ FILE:\s*([^\n]+)\s*\n([\s\S]*?)(?=\n\n---)/));
