import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, 'src');

const replaceMapping = [
  { from: /@\/context\//g, to: '@/store/' },
  { from: /@\/providers\//g, to: '@/store/' },
  { from: /@\/components\/layout\//g, to: '@/layouts/' },
  { from: /@\/components\/auth\//g, to: '@/features/auth/components/' },
  { from: /@\/services\/authService/g, to: '@/features/auth/services/authService' },
  { from: /@\/services\/aiService/g, to: '@/features/ai/services/aiService' },
  { from: /@\/services\/assignmentService/g, to: '@/features/assignments/services/assignmentService' },
  { from: /@\/services\/classService/g, to: '@/features/classes/services/classService' },
  { from: /@\/services\/reportService/g, to: '@/features/reports/services/reportService' },
  { from: /@\/services\/submissionService/g, to: '@/features/submissions/services/submissionService' },
  { from: /@\/services\/userService/g, to: '@/features/users/services/userService' },
  { from: /\.\/i18n/g, to: './utils/i18n' },
  { from: /\.\/index\.css/g, to: './styles/index.css' },
  { from: /\.\.\/authService/g, to: '@/features/auth/services/authService' },
  { from: /\.\.\/userService/g, to: '@/features/users/services/userService' },
  { from: /\.\.\/classService/g, to: '@/features/classes/services/classService' },
  { from: /\.\.\/assignmentService/g, to: '@/features/assignments/services/assignmentService' },
  { from: /\.\.\/submissionService/g, to: '@/features/submissions/services/submissionService' },
  { from: /\.\.\/aiService/g, to: '@/features/ai/services/aiService' },
  { from: /\.\.\/reportService/g, to: '@/features/reports/services/reportService' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let modified = false;
      for (const { from, to } of replaceMapping) {
        if (from.test(content)) {
          content = content.replace(from, to);
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`Updated imports in: ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);

// Fix index.ts in services/ -> Wait, since we moved services to feature paths, we might need to fix src/services/index.ts
// actually `src/services/index.ts` exported `authService` like `export * from './authService'`
// The regex `\.\/authService` inside `src/services/index.ts` won't match `\.\.\/authService`.
// I'll run one final regex specifically for `./authService` in `src/services/index.ts`.
const servicesIndex = path.join(srcDir, 'services', 'index.ts');
if (fs.existsSync(servicesIndex)) {
  let cnt = fs.readFileSync(servicesIndex, 'utf-8');
  cnt = cnt.replace(/\.\/authService/g, '@/features/auth/services/authService')
           .replace(/\.\/classService/g, '@/features/classes/services/classService')
           .replace(/\.\/assignmentService/g, '@/features/assignments/services/assignmentService')
           .replace(/\.\/submissionService/g, '@/features/submissions/services/submissionService')
           .replace(/\.\/userService/g, '@/features/users/services/userService')
           .replace(/\.\/aiService/g, '@/features/ai/services/aiService')
           .replace(/\.\/reportService/g, '@/features/reports/services/reportService');
  fs.writeFileSync(servicesIndex, cnt);
  console.log('Fixed src/services/index.ts');
}

console.log("Done fixing imports!");
