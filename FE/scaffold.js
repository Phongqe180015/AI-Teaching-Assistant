import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, 'src');

const dirsToCreate = [
  'assets',
  'features',
  'layouts',
  'routes',
  'store',
  'utils',
  'styles'
];

dirsToCreate.forEach(d => {
  const p = path.join(srcDir, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const featuresList = ['auth', 'users', 'classes', 'assignments', 'submissions', 'ai', 'reports'];
featuresList.forEach(f => {
  const featPath = path.join(srcDir, 'features', f);
  if (!fs.existsSync(featPath)) fs.mkdirSync(featPath, { recursive: true });
  if (!fs.existsSync(path.join(featPath, 'components'))) fs.mkdirSync(path.join(featPath, 'components'), { recursive: true });
  if (!fs.existsSync(path.join(featPath, 'services'))) fs.mkdirSync(path.join(featPath, 'services'), { recursive: true });
  if (!fs.existsSync(path.join(featPath, 'index.ts'))) fs.writeFileSync(path.join(featPath, 'index.ts'), '');
});

const moveMap = [
  ['index.css', 'styles/index.css'],
  ['i18n.ts', 'utils/i18n.ts'],
  ['services/aiService.ts', 'features/ai/services/aiService.ts'],
  ['services/assignmentService.ts', 'features/assignments/services/assignmentService.ts'],
  ['services/authService.ts', 'features/auth/services/authService.ts'],
  ['services/classService.ts', 'features/classes/services/classService.ts'],
  ['services/reportService.ts', 'features/reports/services/reportService.ts'],
  ['services/submissionService.ts', 'features/submissions/services/submissionService.ts'],
  ['services/userService.ts', 'features/users/services/userService.ts']
];

moveMap.forEach(([src, dest]) => {
  const srcP = path.join(srcDir, src);
  const destP = path.join(srcDir, dest);
  if (fs.existsSync(srcP)) {
    fs.renameSync(srcP, destP);
    console.log(`Moved ${src} to ${dest}`);
  }
});

// move directory contents safely
function moveDirectoryStats(srcFolderName, destFolderName) {
  const srcPath = path.join(srcDir, srcFolderName);
  const destPath = path.join(srcDir, destFolderName);
  if (fs.existsSync(srcPath)) {
    const files = fs.readdirSync(srcPath);
    files.forEach(file => {
      const sp = path.join(srcPath, file);
      const dp = path.join(destPath, file);
      fs.renameSync(sp, dp);
      console.log(`Moved ${sp} -> ${dp}`);
    });
    fs.rmdirSync(srcPath);
  }
}

moveDirectoryStats('components/layout', 'layouts');
moveDirectoryStats('context', 'store');
moveDirectoryStats('providers', 'store');
moveDirectoryStats('components/auth', 'features/auth/components');

console.log("Scaffold completed.");
