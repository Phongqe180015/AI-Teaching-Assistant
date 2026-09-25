const { execSync } = require('child_process');
const fs = require('fs');

try {
  execSync('npx tsc --noEmit', { cwd: 'c:/Users/Admin/AITA/be', stdio: 'pipe' });
  fs.writeFileSync('c:/Users/Admin/AITA/be/build-log.txt', 'BUILD SUCCESS');
} catch (e) {
  fs.writeFileSync('c:/Users/Admin/AITA/be/build-log.txt', e.stdout ? e.stdout.toString() : e.message);
}
