const { exec } = require('child_process');
const fs = require('fs');

exec('npx tsc --noEmit', { cwd: 'c:\\Users\\Admin\\AITA\\fe' }, (error, stdout, stderr) => {
  fs.writeFileSync('c:\\Users\\Admin\\AITA\\fe\\tsc-errors.txt', stdout + '\n' + stderr);
});

exec('npx eslint src/', { cwd: 'c:\\Users\\Admin\\AITA\\fe' }, (error, stdout, stderr) => {
  fs.writeFileSync('c:\\Users\\Admin\\AITA\\fe\\eslint-errors.txt', stdout + '\n' + stderr);
});
