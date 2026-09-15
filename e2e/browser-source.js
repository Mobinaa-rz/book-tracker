/**
 * Works out which Chromium binary Playwright should drive.
 *
 * Three strategies, tried in order:
 *
 *   1. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` - an explicit override. Useful in
 *      CI images that already ship a browser.
 *   2. Playwright's own browser, installed with `npx playwright install chromium`.
 *      This is the normal path and needs no configuration.
 *   3. `@sparticuz/chromium` - a Chromium build published to the npm registry.
 *      This is a *fallback only*, for sandboxes and restricted networks where
 *      Playwright's download CDN is unreachable but npm is. The package is
 *      optional: when it is absent we fall through and let Playwright report
 *      its usual "browser is not installed" error.
 *
 * Strategy 3 also unpacks the NSS/NSPR shared libraries bundled with that
 * build, because slim Linux images often lack them and `apt` may be
 * unavailable. They are only ever *prepended to* `LD_LIBRARY_PATH` for the
 * browser process; no system file is touched.
 *
 * Everything here is synchronous on purpose: `playwright.config.js` must export
 * a plain object, so the config is evaluated before any async work can happen.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

/** Extra flags every launch gets. Safe for headless containers. */
export const baseLaunchArgs = ['--disable-dev-shm-usage'];

/** Where the fallback browser and its libraries are unpacked. */
const cacheRoot = path.join(repoRoot, 'node_modules', '.cache', 'book-tracker-e2e');

/** True when Playwright's own Chromium is present on disk. */
function bundledBrowserIsInstalled() {
  try {
    const executablePath = require('@playwright/test').chromium.executablePath();
    return Boolean(executablePath) && fs.existsSync(executablePath);
  } catch {
    return false;
  }
}

/** Finds the installed `@sparticuz/chromium` package directory, or null. */
function findSparticuzPackageDir() {
  for (const candidate of ['@sparticuz/chromium/package.json', '@sparticuz/chromium']) {
    try {
      const resolved = require.resolve(candidate);
      // Either the package.json itself, or build/index.js one level below it.
      const dir = candidate.endsWith('package.json')
        ? path.dirname(resolved)
        : path.resolve(path.dirname(resolved), '..');
      if (fs.existsSync(path.join(dir, 'bin'))) return dir;
    } catch {
      // Not resolvable - try the next candidate.
    }
  }
  return null;
}

/**
 * Inflates `bin/chromium.br` (a brotli-compressed executable) into the cache
 * directory, once, and returns its path.
 */
function inflateChromiumBinary(packageDir) {
  const archive = path.join(packageDir, 'bin', 'chromium.br');
  if (!fs.existsSync(archive)) return null;

  const target = path.join(cacheRoot, 'chromium');
  try {
    // Reuse a previous run's binary unless the archive is newer than it.
    if (fs.existsSync(target) && fs.statSync(target).mtimeMs >= fs.statSync(archive).mtimeMs) {
      fs.chmodSync(target, 0o755);
      return target;
    }

    fs.mkdirSync(cacheRoot, { recursive: true });
    const partial = `${target}.partial-${process.pid}`;
    fs.writeFileSync(partial, zlib.brotliDecompressSync(fs.readFileSync(archive)), { mode: 0o755 });
    fs.renameSync(partial, target);
    fs.chmodSync(target, 0o755);
    return target;
  } catch {
    return null;
  }
}

/**
 * Unpacks the NSS/NSPR libraries that ship alongside the fallback Chromium
 * build and returns their directory, or null when unavailable.
 */
function extractCompanionLibraries(packageDir) {
  const archive = path.join(packageDir, 'bin', 'al2023.tar.br');
  if (!fs.existsSync(archive)) return null;

  const libDir = path.join(cacheRoot, 'nss-libs');
  const marker = path.join(libDir, 'libnss3.so');
  if (fs.existsSync(marker)) return libDir;

  try {
    fs.mkdirSync(libDir, { recursive: true });
    const tarPath = path.join(os.tmpdir(), `book-tracker-e2e-nss-${process.pid}.tar`);
    fs.writeFileSync(tarPath, zlib.brotliDecompressSync(fs.readFileSync(archive)));
    execFileSync('tar', ['-xf', tarPath, '-C', libDir, '--strip-components=1'], { stdio: 'ignore' });
    fs.rmSync(tarPath, { force: true });
    return fs.existsSync(marker) ? libDir : null;
  } catch {
    // Best effort - the browser may still run without these libraries.
    return null;
  }
}

/**
 * Resolves the Chromium launch options for this machine.
 *
 * @returns {{executablePath: string|undefined, env: Object<string,string>, args: string[], source: string}}
 */
export function resolveChromium() {
  const fallback = { executablePath: undefined, env: {}, args: [...baseLaunchArgs] };

  const explicit = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (explicit) {
    if (!fs.existsSync(explicit)) {
      throw new Error(
        `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH points at "${explicit}", which does not exist.`,
      );
    }
    return { ...fallback, executablePath: explicit, source: 'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH' };
  }

  if (bundledBrowserIsInstalled()) {
    return { ...fallback, source: 'playwright bundled (npx playwright install)' };
  }

  const packageDir = findSparticuzPackageDir();
  if (packageDir) {
    const executablePath = inflateChromiumBinary(packageDir);
    if (executablePath) {
      const libDir = extractCompanionLibraries(packageDir);
      const env = {};
      if (libDir) {
        env.LD_LIBRARY_PATH = process.env.LD_LIBRARY_PATH
          ? `${libDir}${path.delimiter}${process.env.LD_LIBRARY_PATH}`
          : libDir;
      }
      return { ...fallback, executablePath, env, source: '@sparticuz/chromium (npm fallback)' };
    }
  }

  // Nothing usable found - let Playwright produce its standard, actionable error.
  return { ...fallback, source: 'playwright default (browser not installed)' };
}
