/**
 * 엑셀/CSV 파일에서 파싱된 시트 데이터.
 * 헤더/데이터 구분 없이 모든 원본 행을 보존합니다.
 * UI에서 사용자가 직접 "첫 행을 헤더로 사용할지" 결정합니다.
 */
export interface ParsedSheet {
  /** 파일에서 읽은 모든 행 (헤더 포함 가능, 문자열 2D 배열) */
  rawRows: string[][];
  /** 감지된 열 수 (가장 긴 행 기준) */
  columnCount: number;
}

/**
 * 열 매핑 설정.
 * 사용자가 어떤 열이 MPN이고 어떤 열이 수량인지 지정합니다.
 */
export interface ColumnMapping {
  /** MPN 열 인덱스 (0-based) */
  mpnColumnIndex: number;
  /** 수량 열 인덱스 (0-based, 선택사항) */
  quantityColumnIndex: number | null;
}

/**
 * 파일 파싱 포트 (인터페이스).
 * Infrastructure 레이어에서 구체적인 구현체를 제공합니다.
 */
export interface IFileParser {
  parse(file: File): Promise<ParsedSheet>;
}
