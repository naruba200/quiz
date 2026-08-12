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

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LINES = [];
const jsonDump = {};
let total = 0;

for (const quiz of QUIZZES) {
  const filePath = path.join(OLD_DIR, quiz.file);
  if (!fs.existsSync(filePath)) { console.error('MISSING file: ' + filePath); process.exit(1); }
  const html = fs.readFileSync(filePath, 'utf8');
  const arrText = extractArray(html, 'const questions =');
  const arr = vm.runInNewContext('(' + arrText + ')');
  if (!Array.isArray(arr)) throw new Error('Not an array in ' + quiz.file);
  for (const q of arr) {
    if (!q || typeof q.q !== 'string' || !Array.isArray(q.a) || typeof q.c !== 'number') {
      throw new Error('Malformed question in ' + quiz.file);
    }
    if (q.c < 0 || q.c >= q.a.length) {
      throw new Error('Invalid answer index in ' + quiz.file + ': ' + String(q.q).slice(0, 50));
    }
  }
  jsonDump[quiz.key] = { title: quiz.title, questions: arr };
  total += arr.length;
  LINES.push('### ' + quiz.key + ' | ' + quiz.title);
  LINES.push('');
  arr.forEach((q) => {
    LINES.push('#' + q.q);
    q.a.forEach((opt, idx) => LINES.push(letters[idx] + '. ' + opt));
    LINES.push('@' + letters[q.c]);
    LINES.push('');
  });
  console.log(quiz.file + '  ->  ' + quiz.key + ' (' + quiz.title + '): ' + arr.length + ' câu');
}

fs.writeFileSync(path.join(ROOT, 'questions.txt'), LINES.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(__dirname, '_source_check.json'), JSON.stringify(jsonDump, null, 1), 'utf8');
console.log('TOTAL: ' + total + ' câu -> questions.txt');