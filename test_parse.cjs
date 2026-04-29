// Node.js에서 SheetJS 파싱 직접 테스트
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'test_parts.xlsx');
const buffer = fs.readFileSync(filePath);

console.log('파일 크기:', buffer.byteLength, 'bytes');

try {
  const data = new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: 'array' });
  console.log('시트 목록:', workbook.SheetNames);

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  console.log('행 수:', rawData.length);
  console.log('데이터:');
  rawData.forEach((row, i) => {
    console.log(`  행 ${i}:`, row);
  });
} catch (err) {
  console.error('파싱 에러:', err.message);
}
