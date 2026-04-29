/**
 * 엑셀에서 파싱된 부품 정보를 나타내는 도메인 엔티티.
 * 외부 프레임워크 의존성 없이 순수한 비즈니스 규칙만 포함합니다.
 */
export interface ExcelPart {
  /** 원본 엑셀 행 번호 (0-based) */
  readonly rowIndex: number;
  /** 제조사 부품 번호 (MPN) */
  readonly mpn: string;
  /** 수량 (없으면 null) */
  readonly quantity: number | null;
}

interface CreateExcelPartInput {
  rowIndex: number;
  mpn: string;
  quantity: number | null;
}

/**
 * ExcelPart를 생성하는 팩토리 함수.
 * 도메인 규칙(비어있지 않은 MPN, 0 이상의 수량)을 검증합니다.
 */
export function createExcelPart(input: CreateExcelPartInput): ExcelPart {
  const trimmedMpn = input.mpn.trim();

  if (trimmedMpn === '') {
    throw new Error('MPN은 비어있을 수 없습니다.');
  }

  if (input.quantity !== null && input.quantity < 0) {
    throw new Error('수량은 0 이상이어야 합니다.');
  }

  return Object.freeze({
    rowIndex: input.rowIndex,
    mpn: trimmedMpn,
    quantity: input.quantity,
  });
}
