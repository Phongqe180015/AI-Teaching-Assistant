const { execSync } = require('child_process');
const fs = require('fs');

console.log('=== CHECKING BE TYPESCRIPT ===');
try {
  const beOut = execSync('npx tsc --noEmit', { cwd: 'c:\\Users\\Admin\\AITA\\be', encoding: 'utf-8' });
  console.log('BE TS Check PASSED cleanly!');
  fs.writeFileSync('c:\\Users\\Admin\\AITA\\be_tsc_result.txt', 'BE PASSED\n' + beOut);
} catch (err) {
  console.error('BE TS Errors:');
  console.error(err.stdout || err.message);
  fs.writeFileSync('c:\\Users\\Admin\\AITA\\be_tsc_result.txt', 'BE ERRORS\n' + (err.stdout || err.message));
}

console.log('=== CHECKING FE TYPESCRIPT ===');
try {
  const feOut = execSync('npx tsc --noEmit', { cwd: 'c:\\Users\\Admin\\AITA\\FE', encoding: 'utf-8' });
  console.log('FE TS Check PASSED cleanly!');
  fs.writeFileSync('c:\\Users\\Admin\\AITA\\fe_tsc_result.txt', 'FE PASSED\n' + feOut);
} catch (err) {
  console.error('FE TS Errors:');
  console.error(err.stdout || err.message);
  fs.writeFileSync('c:\\Users\\Admin\\AITA\\fe_tsc_result.txt', 'FE ERRORS\n' + (err.stdout || err.message));
}
