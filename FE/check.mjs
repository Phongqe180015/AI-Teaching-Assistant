import { exec } from 'child_process';
exec('npx tsc --noEmit', { cwd: process.cwd() }, (err, stdout, stderr) => {
  console.log("STDOUT:", stdout);
  console.log("STDERR:", stderr);
});
