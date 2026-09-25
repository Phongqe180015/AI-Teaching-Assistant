const escapedFile = "a\\.dart";
const prompt = '// FILE: a.dart\ncode\n\n---\n\n';
const regex = new RegExp(`// FILE:\\s*(?:[^\\n]*?)${escapedFile}\\s*\\n([\\s\\S]*?)(?=\\n\\n---)`);
console.log(prompt.match(regex));
