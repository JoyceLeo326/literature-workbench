import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['.'];
const ignoredDirectories = new Set(['.git', 'node_modules']);
const allowedExamples = new Set(['.env.example']);
const patterns = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /(?:api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*["'][A-Za-z0-9_./+=-]{24,}["']/gi
];

function walk(target, found) {
  const absolute = path.resolve(root, target);
  if (!fs.existsSync(absolute)) return;
  const stat = fs.statSync(absolute);
  if (stat.isDirectory()) {
    if (ignoredDirectories.has(path.basename(absolute))) return;
    for (const name of fs.readdirSync(absolute)) walk(path.join(absolute, name), found);
    return;
  }
  if (allowedExamples.has(path.basename(absolute)) || stat.size > 2_000_000) return;
  const buffer = fs.readFileSync(absolute);
  if (buffer.includes(0)) return;
  const content = buffer.toString('utf8');
  if (patterns.some((pattern) => { pattern.lastIndex = 0; return pattern.test(content); })) {
    found.add(path.relative(root, absolute));
  }
}

const found = new Set();
for (const target of targets) walk(target, found);
if (found.size) {
  console.error(`Secret scan failed in ${found.size} file(s); values are intentionally hidden.`);
  process.exit(1);
}
console.log(`Secret scan passed for ${targets.length} target(s).`);
