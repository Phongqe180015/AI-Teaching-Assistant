const { execSync } = require('child_process');
try {
  const result = execSync('npx tsc --noEmit', { cwd: 'c:/Users/Admin/AITA/be', encoding: 'utf8' });
  console.log('Build OK:', result);
} catch (e) {
  console.error('Build Failed:', e.stdout);
}
