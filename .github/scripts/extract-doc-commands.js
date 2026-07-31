#!/usr/bin/env node
/*
 * Extracts documented shell commands straight from the installation guide so
 * CI runs exactly what the docs tell users to run (no hardcoded copies that can
 * drift). Commands are identified by the stable id attached to their fenced
 * code block in Markdown, e.g.:
 *
 *     ```bash {#build-drasi-server}
 *     cargo install --path . --root . --locked
 *     ```
 *
 * Usage:
 *   node .github/scripts/extract-doc-commands.js <linux|macos> <prereqs|build>
 *
 * Prints the concatenated command text (in documented order) to stdout.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PREREQS = 'docs/shared-content/installation/drasi-server/build-from-source-prereqs.md';
const BUILD = 'docs/content/drasi-server/how-to-guides/installation/build-from-source/_index.md';
const SSE = 'docs/content/drasi-server/how-to-guides/installation/install-sse-cli/_index.md';

// The build/verify sequence is identical across platforms; only the native
// dependency step differs. Each entry is [file, snippetId] in execution order.
const BUILD_SEQUENCE = [
  [BUILD, 'clone-drasi-server'],
  [BUILD, 'build-drasi-server'],
  [BUILD, 'verify-drasi-server'],
  [SSE, 'build-sse-cli'],
  [SSE, 'verify-sse-cli'],
];

const MANIFEST = {
  linux: {
    prereqs: [[PREREQS, 'linux-native-deps']],
    build: BUILD_SEQUENCE,
  },
  macos: {
    prereqs: [[PREREQS, 'macos-native-deps'], [PREREQS, 'macos-jq-lib-dir']],
    build: BUILD_SEQUENCE,
  },
};

/**
 * Return the body of the fenced code block whose opening fence carries `{#id}`.
 * @param {string} file Repo-relative path to a Markdown file.
 * @param {string} id Snippet id declared as `{#id}` on the code fence.
 */
function extractSnippet(file, id) {
  const abs = path.join(REPO_ROOT, file);
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  const escaped = id.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const openFence = new RegExp('^```.*\\{#' + escaped + '\\}');

  let i = lines.findIndex((line) => openFence.test(line));
  if (i === -1) {
    throw new Error(`Snippet #${id} not found in ${file}`);
  }

  const body = [];
  for (i += 1; i < lines.length; i++) {
    if (/^```\s*$/.test(lines[i])) {
      return body.join('\n');
    }
    body.push(lines[i]);
  }
  throw new Error(`Unterminated snippet #${id} in ${file}`);
}

function main() {
  const [platform, group] = process.argv.slice(2);
  const groups = MANIFEST[platform];
  if (!groups || !groups[group]) {
    process.stderr.write(
      'Usage: node .github/scripts/extract-doc-commands.js <linux|macos> <prereqs|build>\n'
    );
    process.exit(2);
  }

  const script = groups[group].map(([file, id]) => extractSnippet(file, id)).join('\n');
  process.stdout.write(script + '\n');
}

main();
