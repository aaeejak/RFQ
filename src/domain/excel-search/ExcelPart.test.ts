import { describe, it, expect } from 'vitest';
import { createExcelPart } from './ExcelPart';

describe('ExcelPart', () => {
  it('유효한 입력으로 ExcelPart를 생성한다', () => {
    const part = createExcelPart({ rowIndex: 1, mpn: 'LM358N', quantity: 100 });
    expect(part.rowIndex).toBe(1);
    expect(part.mpn).toBe('LM358N');
    expect(part.quantity).toBe(100);
  });

  it('수량이 없어도 생성할 수 있다 (quantity = null)', () => {
    const part = createExcelPart({ rowIndex: 0, mpn: 'ATmega328P', quantity: null });
    expect(part.mpn).toBe('ATmega328P');
    expect(part.quantity).toBeNull();
  });

  it('MPN 앞뒤 공백을 제거한다', () => {
    const part = createExcelPart({ rowIndex: 2, mpn: '  SN74HC595  ', quantity: 10 });
    expect(part.mpn).toBe('SN74HC595');
  });

  it('빈 MPN이면 에러를 던진다', () => {
    expect(() => createExcelPart({ rowIndex: 0, mpn: '', quantity: 5 }))
      .toThrow('MPN은 비어있을 수 없습니다.');
  });

  it('공백만 있는 MPN도 에러를 던진다', () => {
    expect(() => createExcelPart({ rowIndex: 0, mpn: '   ', quantity: null }))
      .toThrow('MPN은 비어있을 수 없습니다.');
  });

  it('음수 수량이면 에러를 던진다', () => {
    expect(() => createExcelPart({ rowIndex: 0, mpn: 'LM358N', quantity: -1 }))
      .toThrow('수량은 0 이상이어야 합니다.');
  });
});
