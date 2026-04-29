import * as XLSX from 'xlsx';
import type { IFileParser, ParsedSheet } from '../../application/excel-search/IFileParser';

/**
 * SheetJS(xlsx) 라이브러리를 사용한 파일 파서 구현체.
 * .xlsx, .xls, .csv 파일을 지원합니다.
 * 헤더/데이터 구분 없이 모든 행을 원본 그대로 반환합니다.
 */
export class SheetJsFileParser implements IFileParser {
  async parse(file: File): Promise<ParsedSheet> {
    console.log('[SheetJsFileParser] 파일 정보:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
      console.log('[SheetJsFileParser] ArrayBuffer 크기:', buffer.byteLength);
    } catch (err) {
      console.error('[SheetJsFileParser] ArrayBuffer 변환 실패:', err);
      throw new Error(`파일을 읽을 수 없습니다: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (buffer.byteLength === 0) {
      throw new Error('파일이 비어있습니다 (0 bytes).');
    }

    let workbook: XLSX.WorkBook;
    try {
      // Uint8Array로 변환하여 전달 (더 안정적)
      const data = new Uint8Array(buffer);
      workbook = XLSX.read(data, { type: 'array' });
      console.log('[SheetJsFileParser] 시트 목록:', workbook.SheetNames);
    } catch (err) {
      console.error('[SheetJsFileParser] XLSX.read 실패:', err);
      throw new Error(`파일 형식을 읽을 수 없습니다: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 첫 번째 시트 사용
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('파일에 시트가 없습니다.');
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error('시트 데이터를 읽을 수 없습니다.');
    }

    // header: 1 → 2D 배열로 변환 (각 행이 값 배열)
    let rawData: unknown[][];
    try {
      rawData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: false, // 모든 값을 문자열로
      });
      console.log('[SheetJsFileParser] 파싱된 행 수:', rawData.length);
      if (rawData.length > 0) {
        console.log('[SheetJsFileParser] 첫 번째 행:', rawData[0]);
      }
    } catch (err) {
      console.error('[SheetJsFileParser] sheet_to_json 실패:', err);
      throw new Error(`시트 데이터 변환 실패: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (rawData.length === 0) {
      throw new Error('파일에 데이터가 없습니다.');
    }

    // 모든 행을 문자열 2D 배열로 변환
    const rawRows = rawData.map((row) =>
      (Array.isArray(row) ? row : [row]).map((cell) => String(cell ?? ''))
    );

    // 가장 긴 행을 기준으로 열 수 결정
    const columnCount = Math.max(...rawRows.map((row) => row.length), 0);

    // 모든 행을 같은 열 수로 맞추기 (짧은 행은 빈 문자열로 패딩)
    const normalizedRows = rawRows.map((row) => {
      if (row.length < columnCount) {
        return [...row, ...Array<string>(columnCount - row.length).fill('')];
      }
      return row;
    });

    console.log('[SheetJsFileParser] 최종 결과:', {
      rowCount: normalizedRows.length,
      columnCount,
    });

    return { rawRows: normalizedRows, columnCount };
  }
}
