#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function compareMajorVersion(version, requiredMajor) {
  const match = String(version || '').match(/^v?(\d+)/);
  const major = match ? Number(match[1]) : 0;
  return major >= requiredMajor;
}

async function commandAvailable(command, args = ['--help']) {
  try {
    await execFileAsync(command, args, { timeout: 8000 });
    return { ok: true };
  } catch (error) {
    if (error.code === 'ENOENT') return { ok: false, reason: 'missing' };
    return { ok: true };
  }
}

async function main() {
  const nodeOk = compareMajorVersion(process.version, 22);
  const articrab = await commandAvailable('articrab');

  const result = {
    ok: nodeOk && articrab.ok,
    checks: {
      node: {
        current: process.version,
        required: '>=22',
        ok: nodeOk,
      },
      articrab: {
        ok: articrab.ok,
        reason: articrab.reason || null,
      },
    },
    guidance: {
      install: [
        'npm install -g articrab',
      ],
      configureToken: [
        'articrab set-jina-token jina_xxx',
      ],
      fetchExample: [
        'articrab "https://example.com/article" --output ./content',
      ],
      notes: [
        'A valid Jina token is required before fetch will succeed.',
        'Prepare only verifies tool availability; token validity is confirmed during fetch.',
      ],
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
