/**
 * Purpose: Guard the RuView MCP server's reviewed transitive security pins.
 * Input: A completed `npm ci` in tools/ruview-mcp and npm audit metadata.
 * Output: Concise success messages or an actionable non-zero failure.
 * Invariants: No credentials are read or logged; every installed copy must use
 * the reviewed version, and unrelated advisories cannot hide js-yaml status.
 * Debugging: Run `npm ls js-yaml --all`, then execute this file with Node.
 */

'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const yaml = require('js-yaml');

const EXPECTED_JS_YAML_VERSION = '4.3.1';
const PROJECT_DIRECTORY = path.resolve(__dirname, '..');

/** Why this exists: an override is only effective when every transitive
 * consumer resolves to it; `npm ls` detects a reintroduced nested copy. */
function verifyInstalledTree() {
  const packageMetadata = require('js-yaml/package.json');
  assert.equal(
    packageMetadata.version,
    EXPECTED_JS_YAML_VERSION,
    `Expected js-yaml ${EXPECTED_JS_YAML_VERSION}, found ${packageMetadata.version}. ` +
      'Run npm install --package-lock-only and review the lockfile.',
  );

  const dependencyTree = spawnSync('npm', ['ls', 'js-yaml', '--all', '--json'], {
    cwd: PROJECT_DIRECTORY,
    encoding: 'utf8',
    shell: false,
  });
  if (dependencyTree.status !== 0 || !dependencyTree.stdout) {
    throw new Error(
      `npm could not resolve the js-yaml tree (exit ${dependencyTree.status ?? 'unknown'}). ` +
        `stderr: ${dependencyTree.stderr.trim() || 'empty'}`,
    );
  }

  const versions = new Set();
  const visit = (node) => {
    const dependency = node.dependencies?.['js-yaml'];
    if (dependency?.version) versions.add(dependency.version);
    for (const child of Object.values(node.dependencies ?? {})) visit(child);
  };
  visit(JSON.parse(dependencyTree.stdout));

  assert.deepEqual(
    [...versions],
    [EXPECTED_JS_YAML_VERSION],
    `Expected every js-yaml consumer to resolve to ${EXPECTED_JS_YAML_VERSION}; ` +
      `found: ${[...versions].join(', ') || 'none'}`,
  );
  assert.deepEqual(yaml.load('service:\n  enabled: true\n'), {
    service: { enabled: true },
  });
  console.log(`js-yaml-version: ${packageMetadata.version} (all consumers; API compatible)`);
}

/** Why this exists: a version assertion alone cannot prove the current npm
 * advisory database considers that version safe. */
function verifyAudit() {
  const audit = spawnSync('npm', ['audit', '--json'], {
    cwd: PROJECT_DIRECTORY,
    encoding: 'utf8',
    shell: false,
  });
  if (!audit.stdout) {
    throw new Error(
      `npm audit returned no JSON (exit ${audit.status ?? 'unknown'}). ` +
        `stderr: ${audit.stderr.trim() || 'empty'}`,
    );
  }

  const report = JSON.parse(audit.stdout);
  const advisory = report.vulnerabilities?.['js-yaml'];
  assert.equal(
    advisory,
    undefined,
    `npm still reports a js-yaml advisory: ${JSON.stringify(advisory)}`,
  );
  const counts = report.metadata?.vulnerabilities ?? {};
  console.log(`js-yaml-audit: clear (other MCP advisories: ${counts.total ?? 'unknown'})`);
}

try {
  verifyInstalledTree();
  verifyAudit();
} catch (error) {
  console.error(`Dependency security verification failed: ${error.message}`);
  process.exitCode = 1;
}
