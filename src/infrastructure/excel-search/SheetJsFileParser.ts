import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import type { IFileParser, ParsedSheet } from '../../application/excel-search/IFileParser';

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

    // 1단계: SheetJS ArrayBuffer 파싱 시도
    let parsed = await this.tryParseWithSheetJS(file, 'array');
    if (parsed) return parsed;

    // 2단계: SheetJS Text 파싱 시도 (HTML/XML 위장 엑셀 대응)
    parsed = await this.tryParseWithSheetJS(file, 'string');
    if (parsed) return parsed;

    // 3단계: 궁극의 폴백 - JSZip을 이용한 Raw XML 직접 파싱
    // (SheetJS, ExcelJS 모두 뻗어버리는 비표준/손상된 한국형 ERP 엑셀 파일 대응)
    console.log('[FileParser] 라이브러리 파싱 실패. Raw ZIP/XML 직접 파싱을 시도합니다...');
    try {
      parsed = await this.parseRawXlsxWithZip(file);
      if (parsed) return parsed;
    } catch (err) {
      console.warn('[FileParser] Raw ZIP 파싱 실패:', err);
    }

    throw new Error('엑셀 파일 포맷을 인식할 수 없거나 데이터가 없습니다.');
  }

  private async tryParseWithSheetJS(file: File, type: 'array' | 'string'): Promise<ParsedSheet | null> {
    try {
      let data: any;
      if (type === 'array') {
        data = new Uint8Array(await file.arrayBuffer());
      } else {
        data = await file.text();
      }

      const wb = XLSX.read(data, { type, codepage: 949 });
      if (!this.hasValidSheet(wb)) return null;

      const sheet = this.extractSheet(wb);
      return this.sheetToParsedSheet(sheet);
    } catch (err) {
      console.warn(`[FileParser] SheetJS(${type}) 파싱 실패:`, err);
      return null;
    }
  }

  /**
   * JSZip과 DOMParser를 사용하여 엑셀 파일의 핵심 데이터만 무식하고 안전하게 뽑아냅니다.
   * 메타데이터나 스타일 누락으로 인해 라이브러리들이 뻗는 문제를 완벽하게 회피합니다.
   */
  private async parseRawXlsxWithZip(file: File): Promise<ParsedSheet | null> {
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);

    // 1. sharedStrings.xml 파싱
    const sharedStrings: string[] = [];
    const ssFile = zip.file('xl/sharedStrings.xml');
    if (ssFile) {
      const ssXml = await ssFile.async('text');
      const doc = new DOMParser().parseFromString(ssXml, 'application/xml');
      const siNodes = doc.getElementsByTagName('si');
      for (let i = 0; i < siNodes.length; i++) {
        // 여러 <t> 태그가 있을 수 있으므로 합침 (서식 등)
        const tNodes = siNodes[i].getElementsByTagName('t');
        let text = '';
        for (let j = 0; j < tNodes.length; j++) {
          text += tNodes[j].textContent || '';
        }
        sharedStrings.push(text);
      }
      console.log('[FileParser] Raw ZIP: 공유 문자열 추출 완료', sharedStrings.length);
    }

    // 2. 워크시트 찾기 (xl/worksheets/sheet1.xml 등)
    const filesArray = Object.values(zip.files);
    const sheetXmlFile = filesArray.find(f => 
      !f.dir && f.name.startsWith('xl/worksheets/') && f.name.endsWith('.xml')
    );

    if (!sheetXmlFile) {
      throw new Error('ZIP 내에 워크시트 XML이 존재하지 않습니다.');
    }

    const sheetXml = await sheetXmlFile.async('text');
    const doc = new DOMParser().parseFromString(sheetXml, 'application/xml');
    
    // 3. 행(row) 파싱
    const rawRows: string[][] = [];
    let maxColumns = 0;

    const rowNodes = doc.getElementsByTagName('row');
    for (let i = 0; i < rowNodes.length; i++) {
      const rowNode = rowNodes[i];
      const rowIndexAttr = rowNode.getAttribute('r');
      const rowIndex = rowIndexAttr ? parseInt(rowIndexAttr, 10) - 1 : rawRows.length;

      // 누락된 빈 행 채우기
      while (rawRows.length <= rowIndex) {
        rawRows.push([]);
      }
      const currentRow = rawRows[rowIndex];

      const cNodes = rowNode.getElementsByTagName('c');
      for (let j = 0; j < cNodes.length; j++) {
        const cNode = cNodes[j];
        const rAttr = cNode.getAttribute('r'); // "A1", "B1" 등
        
        let colIndex = currentRow.length;
        if (rAttr) {
          colIndex = this.colLettersToIndex(rAttr.replace(/[0-9]/g, ''));
        }

        // 누락된 빈 셀 채우기
        while (currentRow.length <= colIndex) {
          currentRow.push('');
        }

        const tAttr = cNode.getAttribute('t'); // "s"면 sharedString 인덱스
        const vNode = cNode.getElementsByTagName('v')[0];
        const isNode = cNode.getElementsByTagName('is')[0];

        let val = '';
        if (vNode) {
          const v = vNode.textContent || '';
          if (tAttr === 's') {
            val = sharedStrings[parseInt(v, 10)] ?? v;
          } else {
            val = v; // 숫자 등
          }
        } else if (isNode) {
          // 인라인 스트링
          const tNodes = isNode.getElementsByTagName('t');
          for (let k = 0; k < tNodes.length; k++) {
            val += tNodes[k].textContent || '';
          }
        }

        currentRow[colIndex] = val;
      }

      if (currentRow.length > maxColumns) {
        maxColumns = currentRow.length;
      }
    }

    if (rawRows.length === 0) {
      return null;
    }

    // 모든 행을 같은 열 개수로 정규화
    const normalizedRows = rawRows.map(row => {
      if (row.length < maxColumns) {
        return [...row, ...Array<string>(maxColumns - row.length).fill('')];
      }
      return row;
    });

    console.log('[FileParser] Raw ZIP 파싱 완료:', { rowCount: normalizedRows.length, columnCount: maxColumns });
    return { rawRows: normalizedRows, columnCount: maxColumns };
  }

  /** "A" -> 0, "Z" -> 25, "AA" -> 26 */
  private colLettersToIndex(letters: string): number {
    let sum = 0;
    for (let i = 0; i < letters.length; i++) {
      sum *= 26;
      sum += (letters.charCodeAt(i) - 64);
    }
    return sum - 1;
  }

  // --- 기존 유틸리티 메서드들 유지 ---

  private extractSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
    const sheetNames = workbook.SheetNames;
    const sheetsObj = workbook.Sheets;
    if (!sheetsObj) throw new Error('워크북에 Sheets 객체가 없습니다.');

    if (sheetNames.length > 0) {
      const name = sheetNames[0];
      const sheet = sheetsObj[name];
      if (sheet && Object.keys(sheet).length > 0) return sheet;
    }

    for (const key in sheetsObj) {
      const s = sheetsObj[key];
      if (s && Object.keys(s).length > 0) return s;
    }
    throw new Error('시트 데이터에 접근할 수 없습니다. (빈 시트)');
  }

  private hasValidSheet(workbook: XLSX.WorkBook): boolean {
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) return false;
    const sheets = workbook.Sheets;
    if (!sheets) return false;

    const name = workbook.SheetNames[0];
    const sheet = sheets[name];
    if (sheet && Object.keys(sheet).length > 0) return true;

    for (const key in sheets) {
       const s = sheets[key];
       if (s && Object.keys(s).length > 0) return true;
    }
    return false;
  }

  private sheetToParsedSheet(sheet: XLSX.WorkSheet): ParsedSheet {
    let rawData: unknown[][] = [];
    try {
      rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    } catch (err) {
      throw new Error(`데이터 추출 실패: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!rawData || rawData.length === 0) throw new Error('시트 내에 데이터가 비어있습니다.');

    const stringRows = rawData.map((row) =>
      (Array.isArray(row) ? row : [row]).map((cell) => String(cell ?? '').trim())
    );

    const maxColumns = Math.max(...stringRows.map((row) => row.length), 0);
    const normalizedRows = stringRows.map((row) => {
      if (row.length < maxColumns) {
        return [...row, ...Array<string>(maxColumns - row.length).fill('')];
      }
      return row;
    });

    return { rawRows: normalizedRows, columnCount: maxColumns };
  }

  private async parseCsv(file: File): Promise<ParsedSheet> {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');

    if (lines.length === 0) throw new Error('CSV 파일에 데이터가 없습니다.');

    const rawRows = lines.map((line) => this.parseCsvLine(line));
    const maxColumns = Math.max(...rawRows.map((row) => row.length), 0);

    const normalizedRows = rawRows.map((row) => {
      if (row.length < maxColumns) {
        return [...row, ...Array<string>(maxColumns - row.length).fill('')];
      }
      return row;
    });

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
