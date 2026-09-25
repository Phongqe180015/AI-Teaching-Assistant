const { execSync } = require('child_process');
const fs = require('fs');

let out = '';
try {
  out += '=== FE BUILD TEST ===\n';
  const feBuild = execSync('npm run build', { cwd: 'c:\\Users\\Admin\\AITA\\FE', encoding: 'utf8', stdio: 'pipe' });
  out += feBuild || 'SUCCESS\n';
} catch (e) {
  out += (e.stdout || '') + '\n' + (e.stderr || '') + '\n' + (e.message || '');
}

fs.writeFileSync('c:\\Users\\Admin\\AITA\\verify_result.txt', out);
console.log('Done verify_result.txt');
