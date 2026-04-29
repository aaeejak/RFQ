import ExcelJS from 'exceljs';
import type { IFileParser, ParsedSheet } from '../../application/excel-search/IFileParser';

/**
 * ExcelJS 라이브러리를 사용한 파일 파서 구현체.
 * .xlsx, .csv 파일을 지원합니다.
 *
 * SheetJS Community Edition의 시트 데이터 누락 문제를 해결하기 위해
 * 완전한 오픈소스 라이브러리인 ExcelJS로 교체했습니다.
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

    if (ext === 'csv') {
      return this.parseCsv(file);
    }

    // xlsx (xls는 ExcelJS가 지원하지 않으므로 xlsx로 시도)
    return this.parseXlsx(file);
  }

  private async parseXlsx(file: File): Promise<ParsedSheet> {
    const buffer = await file.arrayBuffer();
    console.log('[FileParser] ArrayBuffer 크기:', buffer.byteLength);

    const workbook = new ExcelJS.Workbook();

    try {
      await workbook.xlsx.load(buffer);
    } catch (err) {
      console.error('[FileParser] xlsx.load 실패:', err);
      throw new Error(
        `엑셀 파일을 읽을 수 없습니다: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    console.log('[FileParser] 시트 수:', workbook.worksheets.length);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('파일에 시트가 없습니다.');
    }

    console.log('[FileParser] 시트 이름:', worksheet.name, '행 수:', worksheet.rowCount);

    const rawRows: string[][] = [];
    let maxColumns = 0;

    worksheet.eachRow({ includeEmpty: true }, (row) => {
      const values: string[] = [];
      // ExcelJS 행은 1-indexed이고, row.values[0]은 항상 undefined
      const rowValues = row.values as (string | number | boolean | Date | null | undefined)[];
      for (let i = 1; i < rowValues.length; i++) {
        const cell = rowValues[i];
        values.push(this.cellToString(cell));
      }
      rawRows.push(values);
      if (values.length > maxColumns) {
        maxColumns = values.length;
      }
    });

    if (rawRows.length === 0) {
      throw new Error('파일에 데이터가 없습니다.');
    }

    // 모든 행을 같은 열 수로 정규화
    const normalizedRows = rawRows.map((row) => {
      if (row.length < maxColumns) {
        return [...row, ...Array<string>(maxColumns - row.length).fill('')];
      }
      return row;
    });

    console.log('[FileParser] 최종 결과:', {
      rowCount: normalizedRows.length,
      columnCount: maxColumns,
    });

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

    console.log('[FileParser] CSV 결과:', {
      rowCount: normalizedRows.length,
      columnCount: maxColumns,
    });

    return { rawRows: normalizedRows, columnCount: maxColumns };
  }

  /** CSV 한 줄을 파싱 (따옴표로 감싸진 필드 지원) */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
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

  private cellToString(cell: unknown): string {
    if (cell === null || cell === undefined) return '';
    if (cell instanceof Date) {
      return cell.toLocaleDateString('ko-KR');
    }
    if (typeof cell === 'object' && cell !== null) {
      // ExcelJS rich text 등
      const richText = (cell as { richText?: { text: string }[] }).richText;
      if (richText) {
        return richText.map((r) => r.text).join('');
      }
      // formula result
      const result = (cell as { result?: unknown }).result;
      if (result !== undefined) return String(result);
      return String(cell);
    }
    return String(cell);
  }
}
