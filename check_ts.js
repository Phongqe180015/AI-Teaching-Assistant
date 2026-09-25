const { exec } = require('child_process');
const fs = require('fs');

exec('npx tsc --noEmit', { cwd: 'c:\\Users\\Admin\\AITA\\BE' }, (error, stdout, stderr) => {
  fs.writeFileSync('c:\\Users\\Admin\\AITA\\be_tsc_output.txt', stdout + '\n' + stderr);
});

exec('npx tsc --noEmit', { cwd: 'c:\\Users\\Admin\\AITA\\FE' }, (error, stdout, stderr) => {
  fs.writeFileSync('c:\\Users\\Admin\\AITA\\fe_tsc_output.txt', stdout + '\n' + stderr);
});
