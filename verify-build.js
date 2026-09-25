const { execSync } = require('child_process');
const fs = require('fs');

let output = '';
try {
  output += '=== BE BUILD ===\n';
  const beBuild = execSync('npm run build', { cwd: 'c:\\Users\\Admin\\AITA\\be', encoding: 'utf8', stdio: 'pipe' });
  output += beBuild || 'BE BUILD PASSED WITH NO ERRORS\n';
} catch (e) {
  output += e.stdout || e.stderr || e.message;
}

try {
  output += '\n=== FE BUILD ===\n';
  const feBuild = execSync('npm run build', { cwd: 'c:\\Users\\Admin\\AITA\\FE', encoding: 'utf8', stdio: 'pipe' });
  output += feBuild || 'FE BUILD PASSED WITH NO ERRORS\n';
} catch (e) {
  output += e.stdout || e.stderr || e.message;
}

fs.writeFileSync('c:\\Users\\Admin\\AITA\\build_verify.txt', output);
console.log('Done writing build_verify.txt');
