const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const OLD_DIR = path.join(ROOT, '_old');

const QUIZZES = [
  { file: 'TTHCM.html', key: 'tthcm', title: 'TTHCM — Tổng hợp' },
  { file: 'TTHCM2.html', key: 'tthcm2', title: 'TTHCM — Đề 2' },
  { file: 'TTHCM3.html', key: 'tthcm3', title: 'TTHCM — Đề 3' },
  { file: 'TTHCM4.html', key: 'tthcm4', title: 'TTHCM — Đề 4' },
  { file: 'TTHCM5.html', key: 'tthcm5', title: 'TTHCM — Đề 5' },
  { file: 'TTHCM6.html', key: 'tthcm6', title: 'TTHCM — Đề 6' },
  { file: 'CNXHKH.html', key: 'cnxkh1', title: 'CNXH KH — Chương 1: Nhập môn' },
  { file: 'CNXHKH 2.html', key: 'cnxkh2', title: 'CNXH KH — Chương 2: Sứ mệnh giai cấp công nhân' },
  { file: 'CNXHKH 3.html', key: 'cnxkh3', title: 'CNXH KH — Chương 3: CNXH và thời kỳ quá độ' },
  { file: 'CNXHKH 4.html', key: 'cnxkh4', title: 'CNXH KH — Chương 4: Dân chủ XHCN và Nhà nước XHCN' },
  { file: 'CNXHKH 5.html', key: 'cnxkh5', title: 'CNXH KH — Chương 5: Cơ cấu XH - giai cấp' },
  { file: 'CNXHKH 6.html', key: 'cnxkh6', title: 'CNXH KH — Chương 6: Vấn đề dân tộc, tôn giáo' },
  { file: 'CNXHKH 7.html', key: 'cnxkh7', title: 'CNXH KH — Chủ đề Gia đình' },
];

function extractArray(html, marker) {
  const re = new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\[', 'm');
  const m = re.exec(html);
  if (!m) throw new Error('Cannot find "' + marker + '"');
  let i = m.index + m[0].length;
  let depth = 1;
  let quote = null;
  let out = '[';
  while (i < html.length) {
    const ch = html[i];
    if (quote) {
      out += ch;
      if (ch === '\\') {
        if (i + 1 < html.length) { out += html[i + 1]; i += 2; }
        else i++;
        continue;
      }
      if (ch === quote) quote = null;
    } else {
      if (ch === '"' || ch === "'") { quote = ch; out += ch; }
      else if (ch === '[') { depth++; out += ch; }
      else if (ch === ']') {
        depth--;
        if (depth === 0) { out += ']'; return out; }
        out += ch;
      }
      else out += ch;
    }
    i++;
  }
  throw new Error('Unbalanced array for "' + marker + '"');
}

const sourceData = {};
let sourceTotal = 0;
for (const quiz of QUIZZES) {
  const html = fs.readFileSync(path.join(OLD_DIR, quiz.file), 'utf8');
  const arr = vm.runInNewContext('(' + extractArray(html, 'const questions =') + ')');
  sourceData[quiz.key] = { title: quiz.title, questions: arr };
  sourceTotal += arr.length;
}

const jsSrc = fs.readFileSync(path.join(ROOT, 'questions.js'), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(jsSrc, sandbox);
const builtData = vm.runInContext('QUIZ_DATA', sandbox);
if (!builtData) throw new Error('questions.js không khai báo QUIZ_DATA');

let ok = true;
let builtTotal = 0;
console.log('KEY      BUILT  SOURCE   MATCH');
for (const key of Object.keys(sourceData)) {
  const b = builtData[key];
  const s = sourceData[key];
  if (!b) { ok = false; console.log(key.padEnd(8) + '  MISSING in questions.js'); continue; }
  builtTotal += b.questions.length;
  const same = JSON.stringify(b.questions) === JSON.stringify(s.questions);
  if (!same) ok = false;
  const qm = same ? 'OK' : 'MISMATCH';
  console.log(key.padEnd(8) + '   ' + String(b.questions.length).padStart(4) + '   ' + String(s.questions.length).padStart(5) + '      ' + qm);
}
console.log('TOTAL built: ' + builtTotal + ' / source: ' + sourceTotal + '  ->  ' + (ok && builtTotal === sourceTotal ? 'PASS' : 'FAIL'));
process.exit(ok ? 0 : 1);