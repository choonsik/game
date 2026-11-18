// Text lint. Approximates a subset of ASD-STE100. See docs/spec/TEXT-RULES.md.
// It does not check the approved-word dictionary. It does not replace review by a person.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MAX_WORDS = 20;
const BANNED = ['seamless', 'seamlessly', 'robust', 'leverage', 'leveraging', 'comprehensive', 'delve', 'cutting-edge', 'state-of-the-art',
  'powerful', 'elegant', 'immersive', 'streamline', 'empower', 'holistic', 'synergy', 'game-changing', 'revolutionary', 'unlock', 'journey',
  'crucial', 'pivotal', 'landscape', 'tapestry', 'utilize', 'ensure', 'simply', 'basically', 'essentially', 'just', 'very', 'really',
  'in order to', 'it is important to note', 'please note', 'shall', 'e.g.', 'i.e.', 'etc.', 'and/or'];
const bannedRe = BANNED.map(w => [w, new RegExp(`(^|[^\\w-])${w.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')}(?![\\w-])`, 'i')]);
const PASSIVE = /\b(is|are|was|were|be|been|being)\s+(\w+ed|shown|made|done|given|taken|written|chosen|built|kept)\b/i;

const errors = [], warnings = [];
let units = 0;

function lintUnit(file, line, text) {
  const t = text.trim();
  if (!t) return;
  units++;
  if (/[^\x00-\x7f]/.test(t)) errors.push(`${file}:${line} non-ASCII character: "${t.slice(0, 60)}"`);
  const words = t.split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w));
  if (words.length > MAX_WORDS) errors.push(`${file}:${line} ${words.length} words (max ${MAX_WORDS}): "${t.slice(0, 70)}..."`);
  for (const [w, re] of bannedRe) if (re.test(t)) errors.push(`${file}:${line} banned word or phrase "${w}"`);
  if (/\b\w+n't\b|\b(it|that|there|we|you|they|I)'(s|ll|re|ve|d|m)\b/i.test(t)) errors.push(`${file}:${line} contraction: "${t.slice(0, 60)}"`);
  if (/[!]/.test(t)) errors.push(`${file}:${line} exclamation mark`);
  if (/\s[-–—]\s|--/.test(t)) errors.push(`${file}:${line} dash used as punctuation`);
  if (PASSIVE.test(t)) warnings.push(`${file}:${line} possible passive voice: "${t.slice(0, 60)}"`);
}

function lintMarkdown(file, src) {
  let fence = false;
  src.split('\n').forEach((raw, i) => {
    if (raw.trim().startsWith('```')) { fence = !fence; return; }
    if (fence || /^\|[\s|:-]+\|?$/.test(raw.trim())) return;
    let s = raw.replace(/`[^`]*`/g, 'X').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^[#>\-*\d.\s]+/, '').replace(/\*\*/g, '');
    const cells = s.startsWith('|') ? s.split('|') : [s];
    for (const c of cells) for (const sentence of c.split(/(?<=[.?])\s+/)) lintUnit(file, i + 1, sentence);
  });
}

// Strings in src/strings.ts: lint each quoted literal and each template literal part.
function lintStrings(file, src) {
  const lines = src.split('\n');
  lines.forEach((l, i) => {
    if (l.trim().startsWith('//')) return;
    for (const m of l.matchAll(/(['`])((?:\\.|(?!\1).)*)\1/g)) {
      const s = m[2].replace(/\$\{[^}]*\}/g, 'X').replace(/\\n/g, '\n');
      if (!/[A-Za-z]{2}/.test(s)) continue;
      for (const part of s.split('\n')) for (const sentence of part.split(/(?<=[.?])\s+/)) lintUnit(file, i + 1, sentence);
    }
  });
}

function lintHtml(file, src) {
  const body = src.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ');
  body.split('\n').forEach((l, i) => lintUnit(file, i + 1, l));
}

const specDir = join(root, 'docs/spec');
for (const f of readdirSync(specDir).filter(f => f.endsWith('.md'))) {
  // TEXT-RULES.md defines the banned words, so it cannot pass its own word check. Only check it for non-ASCII.
  if (f === 'TEXT-RULES.md') { if (/[^\x00-\x7f]/.test(readFileSync(join(specDir, f), 'utf8'))) errors.push(`docs/spec/${f} has a non-ASCII character`); continue; }
  lintMarkdown(`docs/spec/${f}`, readFileSync(join(specDir, f), 'utf8'));
}
lintStrings('src/strings.ts', readFileSync(join(root, 'src/strings.ts'), 'utf8'));
lintHtml('index.html', readFileSync(join(root, 'index.html'), 'utf8'));

for (const w of warnings) console.warn('WARN  ' + w);
for (const e of errors) console.error('ERROR ' + e);
console.log(`Text check: ${units} units, ${errors.length} errors, ${warnings.length} warnings.`);
process.exit(errors.length ? 1 : 0);
