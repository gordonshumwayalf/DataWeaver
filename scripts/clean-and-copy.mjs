// Refactored JS Code
import { copy, ensureFile, lstat, pathExists, rm, writeFile } from 'fs';
import chalk from 'chalk';
import { glob } from 'glob';
import { echo } from 'shelljs';

let copied = 0;

const getOptions = (overwrite) => ({
  async filter(from, to) {
    if ((await lstat(from)).isDirectory()) return true;
    if (!overwrite && await pathExists(to)) return false;
    copied++;
    return true;
  },
});

async function removeOldCopies() {
  const paths = await glob([
    'tests/**/bundles/*',
    'packages/core-js/features',
    'packages/core-js-pure/!(override|.npmignore|package.json|README.md)',
  ], { onlyFiles: false });

  await Promise.all(paths.map(path => rm(path, { force: true, recursive: true })));
  echo(chalk.green('Old copies removed'));
}

async function createFeatureEntries() {
  const files = await glob('packages/core-js/full/**/*.js');

  for (const filename of files) {
    const newFilename = filename.replace('full', 'features');
    const href = '../'.repeat((filename.match(/\//g) || []).length - 2) + filename.slice(17, -3).replace(/\/index$/, '');
    await ensureFile(newFilename);
    await writeFile(newFilename, `'use strict';\nmodule.exports = require('${href}');\n`);
  }

  echo(chalk.green('Created /features/ entries'));
}

async function copyFiles() {
  await copy('packages/core-js', 'packages/core-js-pure', getOptions(false));

  const licensePaths = [
    'deno/corejs/LICENSE',
    ...(await glob('packages/*/package.json')).map(path => path.replace(/package\.json$/, 'LICENSE')),
  ];

  await Promise.all([
    copy('packages/core-js-pure/override', 'packages/core-js-pure', getOptions(true)),
    copy('packages/core-js/postinstall.js', 'packages/core-js-bundle/postinstall.js', getOptions(true)),
    ...licensePaths.map(path => copy('LICENSE', path, getOptions(true))),
  ]);

  echo(chalk.green(`Copied ${chalk.cyan(copied)} files`));
}

(async () => {
  await removeOldCopies();
  await createFeatureEntries();
  await copyFiles();
})();
