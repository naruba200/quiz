const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'questions.txt');

const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/);
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const data = {};
let current = null;
let pendingQ = null;

function flush() {
  if (!pendingQ) return;
  if (pendingQ.a.length === 0) throw new Error('Câu hỏi thiếu đáp án: ' + pendingQ.q.slice(0, 50));
  if (pendingQ.c < 0) throw new Error('Câu hỏi thiếu ký tự đáp án (@A..@Z): ' + pendingQ.q.slice(0, 50));
  current.questions.push({ q: pendingQ.q, a: pendingQ.a, c: pendingQ.c });
  pendingQ = null;
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.trim() === '') continue;
  if (line.startsWith('### ')) {
    flush();
    const m = line.match(/^###\s+(.+?)\s*\|\s*(.+)$/);
    if (!m) throw new Error('Header sai (dòng ' + (i + 1) + '): ' + line.slice(0, 60));
    const key = m[1].trim();
    if (data[key]) throw new Error('Key trùng lặp: ' + key);
    current = { key, title: m[2].trim(), questions: [] };
    data[key] = current;
    continue;
  }
  if (!current) throw new Error('Câu hỏi xuất hiện trước header (dòng ' + (i + 1) + ')');
  if (line.startsWith('#')) {
    flush();
    pendingQ = { q: line.slice(1), a: [], c: -1 };
  } else if (/^@[A-Z]$/.test(line)) {
    if (!pendingQ) throw new Error('Ký tự @ nhưng không có câu hỏi (dòng ' + (i + 1) + ')');
    pendingQ.c = letters.indexOf(line[1]);
  } else if (/^[A-Z]\. /.test(line)) {
    if (!pendingQ) throw new Error('Đáp án trước câu hỏi (dòng ' + (i + 1) + ')');
    pendingQ.a.push(line.slice(3));
  } else {
    if (!pendingQ) throw new Error('Dòng không nhận diện được (dòng ' + (i + 1) + '): ' + line.slice(0, 60));
    pendingQ.q += '\n' + line;
  }
}
flush();

const keys = Object.keys(data);
if (keys.length === 0) throw new Error('Không parse được quiz nào từ questions.txt');

const out = [];
out.push('// File tự sinh từ questions.txt bằng lệnh: node tools/build.js');
out.push('// KHÔNG sửa trực tiếp file này - hãy sửa questions.txt rồi chạy lại.');
out.push('');
out.push('const QUIZ_DATA = {');
for (const key of keys) {
  const quiz = data[key];
  const qs = quiz.questions;
  out.push('  "' + key + '": {');
  out.push('    "title": ' + JSON.stringify(quiz.title) + ',');
  out.push('    "questions": [');
  for (const q of qs) out.push('      ' + JSON.stringify({ q: q.q, a: q.a, c: q.c }) + ',');
  out.push('    ]');
  out.push('  },');
}
out.push('};');
out.push('');
fs.writeFileSync(path.join(ROOT, 'questions.js'), out.join('\n'), 'utf8');

let count = 0;
for (const key of keys) count += data[key].questions.length;

const checkPath = path.join(__dirname, '_source_check.json');
if (fs.existsSync(checkPath)) {
  const check = JSON.parse(fs.readFileSync(checkPath, 'utf8'));
  let ok = true;
  let totalCheck = 0;
  for (const key of Object.keys(check)) {
    totalCheck += check[key].questions.length;
    if (JSON.stringify(data[key].questions) !== JSON.stringify(check[key].questions)) {
      ok = false;
      console.error('MISMATCH: ' + key);
    }
  }
  console.log(ok && totalCheck === count ? 'ROUND-TRIP OK: questions.txt khớp 100% dữ liệu gốc (' + totalCheck + ' câu)' : 'ROUND-TRIP FAILED');
}
console.log('Đã tạo questions.js: ' + keys.length + ' bộ đề, ' + count + ' câu hỏi');