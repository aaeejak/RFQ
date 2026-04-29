import { describe, it, expect, vi } from 'vitest';
import { ParseExcelUseCase } from './ParseExcelUseCase';
import type { IFileParser, ParsedSheet } from './IFileParser';

function createMockParser(sheet: ParsedSheet): IFileParser {
  return { parse: vi.fn().mockResolvedValue(sheet) };
}

function createDummyFile(): File {
  return new File(['dummy'], 'test.xlsx', { type: 'application/octet-stream' });
}

describe('ParseExcelUseCase', () => {
  const sampleSheet: ParsedSheet = {
    rawRows: [
      ['Part Number', 'Description', 'Qty'],  // 헤더 행
      ['LM358N', 'Op-Amp', '100'],
      ['ATmega328P', 'MCU', '50'],
      ['SN74HC595', 'Shift Register', '200'],
    ],
    columnCount: 3,
  };

  describe('parseFile', () => {
    it('파일을 파싱하여 ParsedSheet를 반환한다', async () => {
      const parser = createMockParser(sampleSheet);
      const useCase = new ParseExcelUseCase(parser);
      const result = await useCase.parseFile(createDummyFile());

      expect(result.rawRows).toHaveLength(4);
      expect(result.columnCount).toBe(3);
    });
  });

  describe('applyMapping', () => {
    // 데이터 행만 전달 (헤더 제외)
    const dataRows = sampleSheet.rawRows.slice(1);

    it('MPN 열 인덱스로 ExcelPart 배열을 생성한다', () => {
      const useCase = new ParseExcelUseCase(createMockParser(sampleSheet));
      const parts = useCase.applyMapping(dataRows, 3, {
        mpnColumnIndex: 0,
        quantityColumnIndex: 2,
      });

      expect(parts).toHaveLength(3);
      expect(parts[0].mpn).toBe('LM358N');
      expect(parts[0].quantity).toBe(100);
      expect(parts[1].mpn).toBe('ATmega328P');
      expect(parts[1].quantity).toBe(50);
    });

    it('수량 열 없이도 동작한다 (quantityColumnIndex = null)', () => {
      const useCase = new ParseExcelUseCase(createMockParser(sampleSheet));
      const parts = useCase.applyMapping(dataRows, 3, {
        mpnColumnIndex: 0,
        quantityColumnIndex: null,
      });

      expect(parts).toHaveLength(3);
      expect(parts[0].mpn).toBe('LM358N');
      expect(parts[0].quantity).toBeNull();
    });

    it('빈 MPN 행은 건너뛴다', () => {
      const rowsWithEmpty = [
        ['LM358N', '10'],
        ['', '5'],        // 빈 MPN
        ['  ', '3'],      // 공백만 있는 MPN
        ['SN74HC595', '20'],
      ];
      const useCase = new ParseExcelUseCase(createMockParser(sampleSheet));
      const parts = useCase.applyMapping(rowsWithEmpty, 2, {
        mpnColumnIndex: 0,
        quantityColumnIndex: 1,
      });

      expect(parts).toHaveLength(2);
      expect(parts[0].mpn).toBe('LM358N');
      expect(parts[1].mpn).toBe('SN74HC595');
    });

    it('수량이 숫자가 아니면 null로 처리한다', () => {
      const rowsWithBadQty = [
        ['LM358N', 'N/A'],
        ['ATmega328P', ''],
      ];
      const useCase = new ParseExcelUseCase(createMockParser(sampleSheet));
      const parts = useCase.applyMapping(rowsWithBadQty, 2, {
        mpnColumnIndex: 0,
        quantityColumnIndex: 1,
      });

      expect(parts[0].quantity).toBeNull();
      expect(parts[1].quantity).toBeNull();
    });

    it('잘못된 MPN 열 인덱스이면 에러를 던진다', () => {
      const useCase = new ParseExcelUseCase(createMockParser(sampleSheet));
      expect(() =>
        useCase.applyMapping(dataRows, 3, {
          mpnColumnIndex: 99,
          quantityColumnIndex: null,
        })
      ).toThrow('MPN 열 인덱스가 유효하지 않습니다.');
    });

    it('헤더 없이 전체 행을 데이터로 처리할 수 있다', () => {
      const allDataRows = sampleSheet.rawRows; // 헤더 행 포함
      const useCase = new ParseExcelUseCase(createMockParser(sampleSheet));
      const parts = useCase.applyMapping(allDataRows, 3, {
        mpnColumnIndex: 0,
        quantityColumnIndex: 2,
      });

      // 'Part Number'도 MPN으로 처리됨 (Qty가 NaN이므로 null)
      expect(parts).toHaveLength(4);
      expect(parts[0].mpn).toBe('Part Number');
      expect(parts[0].quantity).toBeNull();
    });
  });
});
