import * as XLSX from 'xlsx';
import type { IFileParser, ParsedSheet } from '../../application/excel-search/IFileParser';

/**
 * SheetJS(xlsx) 라이브러리를 사용한 파일 파서 구현체.
 * .xlsx, .xls, .csv 파일을 지원합니다.
 *
 * 다양한 파일 읽기 방식을 시도하여 호환성을 최대화합니다.
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

    // 1차 시도: readAsArrayBuffer → Uint8Array
    let workbook = await this.tryParseAsArrayBuffer(file);

    // 2차 시도: readAsBinaryString (폴백)
    if (!workbook || !this.hasValidSheet(workbook)) {
      console.log('[SheetJsFileParser] ArrayBuffer 방식 실패, BinaryString 시도...');
      workbook = await this.tryParseAsBinaryString(file);
    }

    if (!workbook) {
      throw new Error('파일을 파싱할 수 없습니다.');
    }

    // 시트 데이터 추출
    const sheet = this.extractSheet(workbook);
    return this.sheetToParsedSheet(sheet);
  }

  private async tryParseAsArrayBuffer(file: File): Promise<XLSX.WorkBook | null> {
    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      console.log('[SheetJsFileParser] ArrayBuffer 크기:', data.length);
      const wb = XLSX.read(data, { type: 'array', codepage: 949 });
      console.log('[SheetJsFileParser] [ArrayBuffer] 시트:', wb.SheetNames);
      return wb;
    } catch (err) {
      console.warn('[SheetJsFileParser] ArrayBuffer 파싱 실패:', err);
      return null;
    }
  }

  private async tryParseAsBinaryString(file: File): Promise<XLSX.WorkBook | null> {
    try {
      const binaryStr = await this.readFileAsBinaryString(file);
      const wb = XLSX.read(binaryStr, { type: 'binary', codepage: 949 });
      console.log('[SheetJsFileParser] [BinaryString] 시트:', wb.SheetNames);
      return wb;
    } catch (err) {
      console.warn('[SheetJsFileParser] BinaryString 파싱 실패:', err);
      return null;
    }
  }

  /**
   * workbook에서 첫 번째 유효한 시트를 추출합니다.
   * SheetNames[0]으로 접근이 안 되면 Object.entries로 직접 탐색합니다.
   */
  private extractSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
    const sheetNames = workbook.SheetNames;

    // 디버깅 상세 로그
    const sheetsObj = workbook.Sheets;
    const sheetsKeys = sheetsObj ? Object.keys(sheetsObj) : [];
    console.log('[SheetJsFileParser] extractSheet 디버그:', {
      sheetNames,
      sheetsKeys,
      sheetsType: typeof sheetsObj,
      sheetsIsNull: sheetsObj === null,
      sheetsIsUndefined: sheetsObj === undefined,
    });

    if (!sheetsObj) {
      throw new Error('워크북에 Sheets 객체가 없습니다.');
    }

    // 방법 1: SheetNames[0]으로 직접 접근
    if (sheetNames.length > 0) {
      const name = sheetNames[0];
      const sheet = sheetsObj[name];
      if (sheet && typeof sheet === 'object') {
        console.log('[SheetJsFileParser] 방법 1 성공: SheetNames[0] =', name);
        return sheet;
      }

      // 방법 2: 키 이름이 미묘하게 다를 수 있으므로 (인코딩 이슈) 키를 순회
      for (const key of sheetsKeys) {
        if (key === name || key.trim() === name.trim()) {
          const s = sheetsObj[key];
          if (s && typeof s === 'object') {
            console.log('[SheetJsFileParser] 방법 2 성공: 키 매칭 =', key);
            return s;
          }
        }
      }
    }

    // 방법 3: 키 순회로 첫 번째 유효한 시트 반환
    for (const key of sheetsKeys) {
      const s = sheetsObj[key];
      if (s && typeof s === 'object' && Object.keys(s).length > 0) {
        console.log('[SheetJsFileParser] 방법 3 성공: 첫 번째 유효 시트 =', key);
        return s;
      }
    }

    // 방법 4: Object.values 사용
    const allSheets = Object.values(sheetsObj);
    console.log('[SheetJsFileParser] 방법 4 시도: values 개수 =', allSheets.length);
    for (const s of allSheets) {
      if (s && typeof s === 'object') {
        console.log('[SheetJsFileParser] 방법 4 성공');
        return s as XLSX.WorkSheet;
      }
    }

    // 방법 5: for...in으로 프로토타입 체인 포함 탐색
    for (const key in sheetsObj) {
      const s = sheetsObj[key];
      if (s && typeof s === 'object') {
        console.log('[SheetJsFileParser] 방법 5 성공: for..in 키 =', key);
        return s;
      }
    }

    throw new Error(
      `시트 데이터에 접근할 수 없습니다. (SheetNames: [${sheetNames.join(', ')}], Keys: [${sheetsKeys.join(', ')}])`
    );
  }

  private hasValidSheet(workbook: XLSX.WorkBook): boolean {
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) return false;
    const sheets = workbook.Sheets;
    if (!sheets) return false;

    // 어떤 방식으로든 시트 데이터에 접근 가능한지 확인
    const name = workbook.SheetNames[0];
    if (sheets[name]) return true;
    if (Object.keys(sheets).length > 0) return true;

    return false;
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

    const rawRows = rawData.map((row) =>
      (Array.isArray(row) ? row : [row]).map((cell) => String(cell ?? ''))
    );

    const columnCount = Math.max(...rawRows.map((row) => row.length), 0);

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
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
      reader.readAsBinaryString(file);
    });
  }
}
