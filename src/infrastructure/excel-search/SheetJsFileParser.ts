import * as XLSX from 'xlsx';
import type { IFileParser, ParsedSheet } from '../../application/excel-search/IFileParser';

/**
 * SheetJS(xlsx) 라이브러리를 사용한 파일 파서 구현체.
 * .xlsx, .xls, .csv 파일을 지원합니다.
 *
 * 브라우저 호환성을 위해 FileReader.readAsBinaryString()을 사용합니다.
 */
export class SheetJsFileParser implements IFileParser {
  async parse(file: File): Promise<ParsedSheet> {
    console.log('[SheetJsFileParser] 파일 정보:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (file.size === 0) {
      throw new Error('파일이 비어있습니다 (0 bytes).');
    }

    // FileReader로 바이너리 문자열 읽기 (브라우저 호환성 최적)
    const binaryStr = await this.readFileAsBinaryString(file);
    console.log('[SheetJsFileParser] 바이너리 문자열 길이:', binaryStr.length);

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(binaryStr, { type: 'binary' });
      console.log('[SheetJsFileParser] 시트 목록:', workbook.SheetNames);
    } catch (err) {
      console.error('[SheetJsFileParser] XLSX.read 실패:', err);
      throw new Error(`파일 형식을 읽을 수 없습니다: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('파일에 시트가 없습니다.');
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    console.log('[SheetJsFileParser] 시트 접근:', {
      sheetName,
      sheetExists: !!sheet,
      sheetsKeys: Object.keys(workbook.Sheets || {}),
    });

    if (!sheet) {
      // 폴백: Sheets 객체의 첫 번째 값을 직접 사용
      const firstSheet = Object.values(workbook.Sheets || {})[0];
      if (!firstSheet) {
        throw new Error('시트 데이터를 읽을 수 없습니다.');
      }
      return this.sheetToParsedSheet(firstSheet);
    }

    return this.sheetToParsedSheet(sheet);
  }

  private sheetToParsedSheet(sheet: XLSX.WorkSheet): ParsedSheet {
    let rawData: unknown[][];
    try {
      rawData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: false,
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

    // 모든 행을 같은 열 수로 맞추기
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

  private readFileAsBinaryString(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error('파일을 읽을 수 없습니다.'));
      };
      reader.readAsBinaryString(file);
    });
  }
}
