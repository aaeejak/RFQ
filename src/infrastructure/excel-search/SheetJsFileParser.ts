import * as XLSX from 'xlsx';
import type { IFileParser, ParsedSheet } from '../../application/excel-search/IFileParser';

/**
 * 엑셀 파일(진짜 엑셀, HTML 위장 엑셀, CSV 등)을 파싱하는 클래스입니다.
 * 
 * 국내 기업에서 자주 사용하는 "HTML 테이블이나 XML을 .xlsx/.xls 확장자로 저장한 파일"들을
 * 완벽하게 지원하기 위해 다중 폴백(Fallback) 파싱 전략을 사용합니다.
 */
export class SheetJsFileParser implements IFileParser {
  async parse(file: File): Promise<ParsedSheet> {
    console.log('[FileParser] 파일 정보:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (file.size === 0) {
      throw new Error('파일이 비어있습니다 (0 bytes).');
    }

    const ext = file.name.toLowerCase().split('.').pop() ?? '';

    // CSV는 직접 파싱하는 것이 인코딩 및 따옴표 처리에 가장 안정적입니다.
    if (ext === 'csv') {
      return this.parseCsv(file);
    }

    // 1단계: 정상적인 엑셀 파일로 가정하고 ArrayBuffer로 파싱 시도
    let workbook = await this.tryParseAsArrayBuffer(file);

    // 2단계: ArrayBuffer로 읽었으나 시트 데이터가 없는 경우 (HTML/XML 위장 엑셀일 확률 99%)
    // 파일 전체를 텍스트로 읽어서 파싱을 재시도합니다.
    if (!workbook || !this.hasValidSheet(workbook)) {
      console.log('[FileParser] 바이너리 파싱 실패 또는 빈 시트. 텍스트 파싱 폴백 시도...');
      workbook = await this.tryParseAsText(file);
    }

    if (!workbook || !this.hasValidSheet(workbook)) {
      throw new Error('엑셀 파일 포맷을 인식할 수 없거나 데이터가 없습니다.');
    }

    const sheet = this.extractSheet(workbook);
    return this.sheetToParsedSheet(sheet);
  }

  private async tryParseAsArrayBuffer(file: File): Promise<XLSX.WorkBook | null> {
    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      console.log('[FileParser] ArrayBuffer 크기:', data.length);
      const wb = XLSX.read(data, { type: 'array', codepage: 949 });
      console.log('[FileParser] [ArrayBuffer] 시트 이름 목록:', wb.SheetNames);
      return wb;
    } catch (err) {
      console.warn('[FileParser] ArrayBuffer 파싱 실패:', err);
      return null;
    }
  }

  private async tryParseAsText(file: File): Promise<XLSX.WorkBook | null> {
    try {
      const text = await file.text();
      console.log('[FileParser] 텍스트 크기:', text.length);
      
      // SheetJS는 HTML table 구조나 XML Spreadsheet 구조가 텍스트로 들어오면 자동으로 인식합니다.
      const wb = XLSX.read(text, { type: 'string', codepage: 949 });
      console.log('[FileParser] [Text] 시트 이름 목록:', wb.SheetNames);
      return wb;
    } catch (err) {
      console.warn('[FileParser] Text 파싱 실패:', err);
      return null;
    }
  }

  private extractSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
    const sheetNames = workbook.SheetNames;
    const sheetsObj = workbook.Sheets;

    if (!sheetsObj) {
      throw new Error('워크북에 Sheets 객체가 없습니다.');
    }

    // 첫 번째 시트 이름으로 접근
    if (sheetNames.length > 0) {
      const name = sheetNames[0];
      const sheet = sheetsObj[name];
      if (sheet && typeof sheet === 'object' && Object.keys(sheet).length > 0) {
        return sheet;
      }
    }

    // 이름으로 못 찾았다면 객체를 순회하여 첫 번째 유효한 시트를 반환
    for (const key in sheetsObj) {
      const s = sheetsObj[key];
      if (s && typeof s === 'object' && Object.keys(s).length > 0) {
        console.log(`[FileParser] 대체 시트 접근 성공: ${key}`);
        return s;
      }
    }

    throw new Error('시트 데이터에 접근할 수 없습니다. (빈 시트)');
  }

  private hasValidSheet(workbook: XLSX.WorkBook): boolean {
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) return false;
    const sheets = workbook.Sheets;
    if (!sheets) return false;

    const name = workbook.SheetNames[0];
    const sheet = sheets[name];
    
    // 시트가 존재하고, 안에 속성(셀 데이터 등)이 1개라도 있으면 유효하다고 판단
    if (sheet && Object.keys(sheet).length > 0) return true;

    // 첫 시트 이름으로 못 찾았더라도 순회해서 데이터가 있으면 유효함
    for (const key in sheets) {
       const s = sheets[key];
       if (s && Object.keys(s).length > 0) return true;
    }

    return false;
  }

  private sheetToParsedSheet(sheet: XLSX.WorkSheet): ParsedSheet {
    let rawData: unknown[][] = [];
    try {
      rawData = XLSX.utils.sheet_to_json(sheet, {
        header: 1, // 2차원 배열 형태로 반환
        defval: '', // 빈 셀은 빈 문자열로
        raw: false, // 포맷팅된 문자열 텍스트 그대로 가져오기
      });
      console.log('[FileParser] 파싱된 행 수:', rawData.length);
    } catch (err) {
      console.error('[FileParser] sheet_to_json 실패:', err);
      throw new Error(`데이터 추출 실패: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!rawData || rawData.length === 0) {
      throw new Error('시트 내에 데이터가 비어있습니다.');
    }

    // 모든 데이터를 string으로 안전하게 변환
    const stringRows = rawData.map((row) =>
      (Array.isArray(row) ? row : [row]).map((cell) => String(cell ?? '').trim())
    );

    // 가장 긴 행을 찾음
    const maxColumns = Math.max(...stringRows.map((row) => row.length), 0);

    // 모든 행의 열 개수를 일치시킴
    const normalizedRows = stringRows.map((row) => {
      if (row.length < maxColumns) {
        return [...row, ...Array<string>(maxColumns - row.length).fill('')];
      }
      return row;
    });

    console.log('[FileParser] 최종 결과:', { rowCount: normalizedRows.length, columnCount: maxColumns });

    return { rawRows: normalizedRows, columnCount: maxColumns };
  }

  private async parseCsv(file: File): Promise<ParsedSheet> {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');

    if (lines.length === 0) {
      throw new Error('CSV 파일에 데이터가 없습니다.');
    }

    const rawRows = lines.map((line) => this.parseCsvLine(line));
    const maxColumns = Math.max(...rawRows.map((row) => row.length), 0);

    const normalizedRows = rawRows.map((row) => {
      if (row.length < maxColumns) {
        return [...row, ...Array<string>(maxColumns - row.length).fill('')];
      }
      return row;
    });

    console.log('[FileParser] CSV 파싱 완료:', { rowCount: normalizedRows.length, columnCount: maxColumns });

    return { rawRows: normalizedRows, columnCount: maxColumns };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current.trim());
    return result;
  }
}
