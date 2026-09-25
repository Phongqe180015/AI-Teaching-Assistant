const { execSync } = require('child_process');
const fs = require('fs');

function run(cmd, cwd = 'c:\\Users\\Admin\\AITA') {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    return (e.stdout || '') + '\n' + (e.stderr || '') + '\n' + (e.message || '');
  }
}

let log = '';

log += '=== REFLOG ===\n';
log += run('git reflog -n 30');

log += '\n=== SEARCH COMMIT CONTENTS FOR AdminSubjectDetail ===\n';
log += run('git log -p -n 10');

log += '\n=== SEARCH STASH SHOW ===\n';
log += run('git stash show -p p0');

log += '\n=== SEARCH UNTRACKED OR STASHED FILES ===\n';
log += run('git log --all --name-only --oneline');

fs.writeFileSync('c:\\Users\\Admin\\AITA\\git_history_report.txt', log);
console.log('Done');
