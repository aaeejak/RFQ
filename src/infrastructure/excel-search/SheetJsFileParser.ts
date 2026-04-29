import readXlsxFile from 'read-excel-file';
import type { IFileParser, ParsedSheet } from '../../application/excel-search/IFileParser';

/**
 * read-excel-file 라이브러리를 사용한 파일 파서 구현체.
 * .xlsx, .csv 파일을 지원합니다.
 *
 * ExcelJS의 "Cannot read properties of undefined (reading 'company')" 에러
 * (한컴, 구글 시트 등 비표준 앱 생성 엑셀 파일 메타데이터 누락 문제)를 피하기 위해
 * 브라우저 환경에서 가장 안정적이고 가벼운 read-excel-file 라이브러리를 사용합니다.
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

    return this.parseXlsx(file);
  }

  private async parseXlsx(file: File): Promise<ParsedSheet> {
    console.log('[FileParser] read-excel-file 파싱 시도...');

    let rawRows: any[][];
    try {
      rawRows = await readXlsxFile(file);
    } catch (err) {
      console.error('[FileParser] readXlsxFile 실패:', err);
      throw new Error(
        `엑셀 파일을 읽을 수 없습니다: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (!rawRows || rawRows.length === 0) {
      throw new Error('파일에 데이터가 없습니다.');
    }

    // 각 셀의 값을 문자열로 변환 (null/undefined는 빈 문자열로)
    const stringRows = rawRows.map((row) =>
      row.map((cell) => {
        if (cell === null || cell === undefined) return '';
        if (cell instanceof Date) return cell.toLocaleDateString('ko-KR');
        return String(cell);
      })
    );

    // 가장 긴 행을 기준으로 열 수 결정
    const maxColumns = Math.max(...stringRows.map((row) => row.length), 0);

    // 모든 행을 같은 열 수로 정규화
    const normalizedRows = stringRows.map((row) => {
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
}
