import semver from 'semver';
import chalk from 'chalk';
import fetch from 'node-fetch';

const { coerce, cmp } = semver;
const { cyan, green } = chalk;
const ALL = !argv._.includes('main-only');

const downloads = { patch: {}, minor: {}, major: {} };
let total = 0;

async function getStat(pkg) {
  const res = await fetch(`https://api.npmjs.org/versions/${encodeURIComponent(pkg)}/last-week`);
  const { downloads } = await res.json();
  return downloads;
}

async function fetchDownloads() {
  const [core, pure, bundle] = await Promise.all([
    getStat('core-js'),
    ALL && getStat('core-js-pure'),
    ALL && getStat('core-js-bundle'),
  ]);

  for (const [patch, count] of Object.entries(core)) {
    const version = coerce(patch);
    const { major, minor } = version;
    const totalDownloads = count + (ALL ? ((pure[patch] ?? 0) + (bundle[patch] ?? 0)) : 0);

    downloads.patch[patch] = totalDownloads;
    downloads.minor[`${major}.${minor}`] = (downloads.minor[`${major}.${minor}`] ?? 0) + totalDownloads;
    downloads.major[major] = (downloads.major[major] ?? 0) + totalDownloads;
    total += totalDownloads;
  }
}

function logDownloads(kind, data) {
  console.log(green(`Downloads for 7 days by ${cyan(kind)} releases:`));
  console.table(
    Object.entries(data)
      .sort(([a], [b]) => (cmp(coerce(a), '>', coerce(b)) ? 1 : -1))
      .reduce((acc, [version, count]) => {
        acc[version] = { count, '%': `${((count / total) * 100).toFixed(2)} %` };
        return acc;
      }, {})
  );
}

(async () => {
  await fetchDownloads();
  ['patch', 'minor', 'major'].forEach(kind => logDownloads(kind, downloads[kind]));
})();
