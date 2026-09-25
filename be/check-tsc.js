import { spawnSync } from 'child_process';
import fs from 'fs';

const res = spawnSync('npx', ['tsc', '--noEmit'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  shell: true
});

const output = (res.stdout || '') + '\n' + (res.stderr || '');
fs.writeFileSync('tsc-result.txt', output);
console.log('Done writing tsc-result.txt, status code:', res.status);
