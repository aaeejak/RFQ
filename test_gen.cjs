// 테스트용 xlsx 파일 생성 스크립트
const XLSX = require('xlsx');
const path = require('path');

const ws_data = [
  ['Part Number', 'Description', 'Qty'],
  ['LM358N', 'Op-Amp', '100'],
  ['ATmega328P', 'MCU', '50'],
  ['SN74HC595', 'Shift Register', '200'],
  ['NE555P', 'Timer IC', '150'],
];

const ws = XLSX.utils.aoa_to_sheet(ws_data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Parts');

const filePath = path.join(__dirname, 'test_parts.xlsx');
XLSX.writeFile(wb, filePath);
console.log('Created:', filePath);
