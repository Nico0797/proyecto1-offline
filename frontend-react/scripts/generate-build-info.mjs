import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(currentDir, '..');
const projectRoot = path.resolve(frontendRoot, '..');
const outputDir = path.join(frontendRoot, 'src', 'generated');
const outputFile = path.join(outputDir, 'buildInfo.ts');

const safeExec = (command, args, cwd) => {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

const buildAtIso = new Date().toISOString();
const buildAtDisplay = buildAtIso.replace('T', ' ').replace(/:\d{2}\.\d{3}Z$/, ' UTC');
const gitCommitShort = safeExec('git', ['rev-parse', '--short', 'HEAD'], projectRoot) || 'unknown';
const apiBaseUrl = process.env.VITE_API_BASE_URL || '/api';
const nodeEnv = process.env.NODE_ENV || 'production';

const source = `export const buildInfo = {
  builtAtIso: ${JSON.stringify(buildAtIso)},
  builtAtDisplay: ${JSON.stringify(buildAtDisplay)},
  gitCommitShort: ${JSON.stringify(gitCommitShort)},
  apiBaseUrl: ${JSON.stringify(apiBaseUrl)},
  nodeEnv: ${JSON.stringify(nodeEnv)},
} as const;
`;

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputFile, source, 'utf8');
console.log(`[build-info] wrote ${path.relative(frontendRoot, outputFile)} @ ${buildAtIso} (${gitCommitShort})`);
