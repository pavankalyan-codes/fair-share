const { spawnSync } = require('node:child_process');

const files = [
  'js/config.js',
  'js/firebase-config.template.js',
  'js/firebase-service.js',
  'js/core.js',
  'js/storage.js',
  'js/dom.js',
  'js/csv.js',
  'js/app.js',
  'tests/core.test.js',
  'tests/storage.test.js',
];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status);
  }
}

console.log(`ok - syntax check passed for ${files.length} files`);
