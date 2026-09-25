const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log("Running tsc in backend...");
  execSync('npx tsc --noEmit', { cwd: 'c:\\Users\\Admin\\AITA\\be', stdio: 'pipe' });
  fs.writeFileSync('c:\\Users\\Admin\\AITA\\be\\tsc-output.txt', 'TSC SUCCESS');
} catch (error) {
  fs.writeFileSync('c:\\Users\\Admin\\AITA\\be\\tsc-output.txt', error.stdout ? error.stdout.toString() : error.message);
}

try {
  console.log("Running tsc in frontend...");
  execSync('npx tsc --noEmit', { cwd: 'c:\\Users\\Admin\\AITA\\fe', stdio: 'pipe' });
  fs.writeFileSync('c:\\Users\\Admin\\AITA\\fe\\tsc-output.txt', 'TSC SUCCESS');
} catch (error) {
  fs.writeFileSync('c:\\Users\\Admin\\AITA\\fe\\tsc-output.txt', error.stdout ? error.stdout.toString() : error.message);
}
