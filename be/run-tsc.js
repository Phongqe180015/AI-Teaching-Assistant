import { execSync } from 'child_process';
import fs from 'fs';

try {
  const output = execSync('npx tsc', { encoding: 'utf8', cwd: process.cwd() });
  fs.writeFileSync('tsc-output.txt', 'SUCCESS:\n' + output);
  console.log('Build succeeded without errors!');
} catch (error) {
  const errOutput = (error.stdout || '') + '\n' + (error.stderr || '') + '\n' + (error.message || '');
  fs.writeFileSync('tsc-output.txt', 'ERRORS:\n' + errOutput);
  console.log('Build errors captured in tsc-output.txt');
}
