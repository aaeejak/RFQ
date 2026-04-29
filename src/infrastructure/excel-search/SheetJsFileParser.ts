import * as XLSX from 'xlsx';
import type { IFileParser, ParsedSheet } from '../../application/excel-search/IFileParser';

/**
 * SheetJS(xlsx) 라이브러리를 사용한 파일 파서 구현체.
 * .xlsx, .xls, .csv 파일을 지원합니다.
 * 헤더/데이터 구분 없이 모든 행을 원본 그대로 반환합니다.
 */
export class SheetJsFileParser implements IFileParser {
  async parse(file: File): Promise<ParsedSheet> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    // 첫 번째 시트 사용
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('파일에 시트가 없습니다.');
    }

    const sheet = workbook.Sheets[sheetName];

    // header: 1 → 2D 배열로 변환 (각 행이 값 배열)
    const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false, // 모든 값을 문자열로
    });

    if (rawData.length === 0) {
      throw new Error('파일에 데이터가 없습니다.');
    }

    // 모든 행을 문자열 2D 배열로 변환
    const rawRows = rawData.map((row) =>
      row.map((cell) => String(cell ?? ''))
    );

    // 가장 긴 행을 기준으로 열 수 결정
    const columnCount = Math.max(...rawRows.map((row) => row.length), 0);

    // 모든 행을 같은 열 수로 맞추기 (짧은 행은 빈 문자열로 패딩)
    const normalizedRows = rawRows.map((row) => {
      if (row.length < columnCount) {
        return [...row, ...Array(columnCount - row.length).fill('')];
      }
      return row;
    });

    return { rawRows: normalizedRows, columnCount };
  }
}
