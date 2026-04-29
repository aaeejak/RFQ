import type { ExcelPart } from '../../domain/excel-search/ExcelPart';
import { createExcelPart } from '../../domain/excel-search/ExcelPart';
import type { IFileParser, ParsedSheet, ColumnMapping } from './IFileParser';

/**
 * 엑셀 파일을 파싱하고, 사용자의 열 매핑을 적용하여
 * ExcelPart 도메인 엔티티 배열로 변환하는 유스케이스.
 */
export class ParseExcelUseCase {
  private readonly parser: IFileParser;

  constructor(parser: IFileParser) {
    this.parser = parser;
  }

  /**
   * 파일을 파싱하여 원본 행 데이터를 반환합니다.
   * 이 단계에서는 아직 열 매핑이 적용되지 않습니다.
   */
  async parseFile(file: File): Promise<ParsedSheet> {
    return this.parser.parse(file);
  }

  /**
   * 파싱된 시트에 열 매핑을 적용하여 ExcelPart 배열을 생성합니다.
   * - dataRows: 실제 데이터 행 (헤더 제외된 상태로 전달받음)
   * - 빈 MPN 행은 건너뜁니다.
   * - 수량이 숫자가 아니면 null로 처리합니다.
   */
  applyMapping(
    dataRows: string[][],
    columnCount: number,
    mapping: ColumnMapping
  ): ExcelPart[] {
    const { mpnColumnIndex, quantityColumnIndex } = mapping;

    if (mpnColumnIndex < 0 || mpnColumnIndex >= columnCount) {
      throw new Error('MPN 열 인덱스가 유효하지 않습니다.');
    }

    const parts: ExcelPart[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const mpnRaw = row[mpnColumnIndex] ?? '';

      // 빈 MPN은 건너뛰기
      if (mpnRaw.trim() === '') {
        continue;
      }

      let quantity: number | null = null;
      if (quantityColumnIndex !== null) {
        const qtyRaw = row[quantityColumnIndex] ?? '';
        const parsed = Number(qtyRaw);
        quantity = qtyRaw.trim() !== '' && !isNaN(parsed) ? parsed : null;
      }

      parts.push(
        createExcelPart({
          rowIndex: i,
          mpn: mpnRaw,
          quantity,
        })
      );
    }

    return parts;
  }
}
