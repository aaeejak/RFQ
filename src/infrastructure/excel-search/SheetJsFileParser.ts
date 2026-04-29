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

    let parsed = await this.tryParseWithSheetJS(file, 'array');
    if (parsed) return parsed;

    parsed = await this.tryParseWithSheetJS(file, 'string');
    if (parsed) return parsed;

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

  private getElementsByLocalName(element: Element | Document, localName: string): Element[] {
    const result: Element[] = [];
    const all = element.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) {
      const node = all[i];
      // node.localName은 네임스페이스 접두사를 제외한 태그 이름 ('x:row' -> 'row')
      // fallback으로 node.nodeName이나 tagName을 사용
      const name = (node.localName || node.tagName).toLowerCase();
      // 'x:row' 같은 경우 분리
      const cleanName = name.includes(':') ? name.split(':')[1] : name;
      if (cleanName === localName.toLowerCase()) {
        result.push(node);
      }
    }
    return result;
  }

  private async parseRawXlsxWithZip(file: File): Promise<ParsedSheet | null> {
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);

    const sharedStrings: string[] = [];
    
    // sharedStrings 파일 찾기 (대소문자/경로 유연하게)
    const filesArray = Object.values(zip.files);
    const ssFile = filesArray.find(f => f.name.toLowerCase().includes('sharedstrings.xml'));
    
    if (ssFile) {
      const ssXml = await ssFile.async('text');
      const doc = new DOMParser().parseFromString(ssXml, 'application/xml');
      const siNodes = this.getElementsByLocalName(doc, 'si');
      for (let i = 0; i < siNodes.length; i++) {
        const tNodes = this.getElementsByLocalName(siNodes[i], 't');
        let text = '';
        for (let j = 0; j < tNodes.length; j++) {
          text += tNodes[j].textContent || '';
        }
        sharedStrings.push(text);
      }
      console.log('[FileParser] Raw ZIP: 공유 문자열 추출 완료', sharedStrings.length);
    } else {
      console.log('[FileParser] Raw ZIP: sharedStrings.xml 없음 (숫자/인라인 문자열 위주일 수 있음)');
    }

    const sheetXmlFile = filesArray.find(f => 
      !f.dir && f.name.toLowerCase().includes('worksheets/') && f.name.toLowerCase().endsWith('.xml')
    );

    if (!sheetXmlFile) {
      throw new Error('ZIP 내에 워크시트 XML이 존재하지 않습니다.');
    }

    const sheetXml = await sheetXmlFile.async('text');
    console.log('[FileParser] Raw ZIP: 워크시트 XML 로드 완료. (첫 200자):', sheetXml.substring(0, 200));

    const doc = new DOMParser().parseFromString(sheetXml, 'application/xml');
    
    // 네임스페이스를 무시하고 <row> 태그 모두 찾기
    const rowNodes = this.getElementsByLocalName(doc, 'row');
    console.log('[FileParser] Raw ZIP: 찾은 <row> 개수:', rowNodes.length);

    if (rowNodes.length === 0) {
      // 정규식 폴백 (DOMParser가 완전히 실패했을 경우 대비)
      return this.parseXmlWithRegex(sheetXml, sharedStrings);
    }

    const rawRows: string[][] = [];
    let maxColumns = 0;

    for (let i = 0; i < rowNodes.length; i++) {
      const rowNode = rowNodes[i];
      const rowIndexAttr = rowNode.getAttribute('r');
      const rowIndex = rowIndexAttr ? parseInt(rowIndexAttr, 10) - 1 : rawRows.length;

      while (rawRows.length <= rowIndex) {
        rawRows.push([]);
      }
      const currentRow = rawRows[rowIndex];

      const cNodes = this.getElementsByLocalName(rowNode, 'c');
      for (let j = 0; j < cNodes.length; j++) {
        const cNode = cNodes[j];
        const rAttr = cNode.getAttribute('r'); 
        
        let colIndex = currentRow.length;
        if (rAttr) {
          colIndex = this.colLettersToIndex(rAttr.replace(/[0-9]/g, ''));
        }

        while (currentRow.length <= colIndex) {
          currentRow.push('');
        }

        const tAttr = cNode.getAttribute('t');
        const vNode = this.getElementsByLocalName(cNode, 'v')[0];
        const isNode = this.getElementsByLocalName(cNode, 'is')[0];

        let val = '';
        if (vNode) {
          const v = vNode.textContent || '';
          if (tAttr === 's') {
            val = sharedStrings[parseInt(v, 10)] ?? v;
          } else {
            val = v; 
          }
        } else if (isNode) {
          const tNodes = this.getElementsByLocalName(isNode, 't');
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

    const normalizedRows = rawRows.map(row => {
      if (row.length < maxColumns) {
        return [...row, ...Array<string>(maxColumns - row.length).fill('')];
      }
      return row;
    });

    console.log('[FileParser] Raw ZIP 파싱 완료:', { rowCount: normalizedRows.length, columnCount: maxColumns });
    return { rawRows: normalizedRows, columnCount: maxColumns };
  }

  /**
   * DOMParser조차 실패하는 극단적인 경우를 위한 정규식 파서
   */
  private parseXmlWithRegex(sheetXml: string, sharedStrings: string[]): ParsedSheet | null {
    console.log('[FileParser] DOMParser가 <row>를 찾지 못함. 정규식(Regex) 파서를 시도합니다...');
    
    const rawRows: string[][] = [];
    let maxColumns = 0;

    // 대소문자 구분 없이 <row> 태그 추출
    const rowRegex = /<[a-z0-9:]*row[^>]*>([\s\S]*?)<\/[a-z0-9:]*row>/gi;
    let rowMatch;
    
    while ((rowMatch = rowRegex.exec(sheetXml)) !== null) {
      const rowInnerHtml = rowMatch[1];
      const currentRow: string[] = [];
      
      // 일단 단순하게 모든 v 값을 순서대로 추출 (r 속성 미지원 한계)
      // t="s" 인지 확인하는 정규식 추출이 복잡하므로 간단화된 로직 적용
      const cellRegex = /<[a-z0-9:]*c([^>]*)>([\s\S]*?)<\/[a-z0-9:]*c>/gi;
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(rowInnerHtml)) !== null) {
        const cAttrs = cellMatch[1];
        const cInner = cellMatch[2];
        
        const isString = cAttrs.includes('t="s"');
        const vMatch = /<[a-z0-9:]*v>([^<]*)<\/[a-z0-9:]*v>/i.exec(cInner);
        
        let val = '';
        if (vMatch) {
          const v = vMatch[1];
          if (isString) {
            val = sharedStrings[parseInt(v, 10)] ?? v;
          } else {
            val = v;
          }
        }
        currentRow.push(val);
      }
      
      rawRows.push(currentRow);
      if (currentRow.length > maxColumns) {
        maxColumns = currentRow.length;
      }
    }
    
    if (rawRows.length === 0) return null;
    
    const normalizedRows = rawRows.map(row => {
      if (row.length < maxColumns) {
        return [...row, ...Array<string>(maxColumns - row.length).fill('')];
      }
      return row;
    });

    console.log('[FileParser] Regex 파싱 완료:', { rowCount: normalizedRows.length, columnCount: maxColumns });
    return { rawRows: normalizedRows, columnCount: maxColumns };
  }

  private colLettersToIndex(letters: string): number {
    let sum = 0;
    for (let i = 0; i < letters.length; i++) {
      sum *= 26;
      sum += (letters.toUpperCase().charCodeAt(i) - 64);
    }
    return sum - 1;
  }

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
