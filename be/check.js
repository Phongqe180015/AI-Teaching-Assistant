const { execSync } = require('child_process');
const fs = require('fs');
try {
  const out = execSync('npx tsc --noEmit');
  fs.writeFileSync('tsc-out.txt', out);
} catch (e) {
  fs.writeFileSync('tsc-out.txt', e.stdout ? e.stdout.toString() : e.message);
}
