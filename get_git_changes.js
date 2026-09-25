const { execSync } = require('child_process');
const fs = require('fs');

function run(cmd) {
  try {
    return execSync(cmd, { cwd: 'c:\\Users\\Admin\\AITA', encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    return (e.stdout || '') + '\n' + (e.stderr || '') + '\n' + (e.message || '');
  }
}

let out = '';
out += '=== GIT STATUS ===\n' + run('git status') + '\n\n';
out += '=== GIT LOG (Last 5) ===\n' + run('git log -n 5 --oneline') + '\n\n';
out += '=== GIT DIFF HEAD ===\n' + run('git diff HEAD') + '\n\n';

fs.writeFileSync('c:\\Users\\Admin\\AITA\\git_output.txt', out);
console.log('Saved git_output.txt');
