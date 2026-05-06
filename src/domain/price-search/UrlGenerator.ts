export interface SearchUrl {
  name: string;
  url: string;
  /** 각 사이트를 시각적으로 구분하기 위한 브랜드 컬러 */
  color: string;
}

/**
 * 유통사별 검색 URL 템플릿 설정.
 * 새로운 유통사를 추가할 때는 이 배열에만 항목을 추가하면 됩니다 (OCP 준수).
 */
const DISTRIBUTORS: ReadonlyArray<{
  name: string;
  color: string;
  buildUrl: (encoded: string) => string;
}> = [
  {
    name: 'DigiKey',
    color: '#cc0000',
    buildUrl: (q) => `https://www.digikey.kr/ko/products/result?keywords=${q}`,
  },
  {
    name: 'Mouser',
    color: '#004a93',
    buildUrl: (q) => `https://www.mouser.kr/c/?q=${q}`,
  },
  {
    name: 'Element14',
    color: '#ff6600',
    buildUrl: (q) => `https://kr.element14.com/search?st=${q}`,
  },
  {
    name: 'Arrow',
    color: '#f57e20',
    buildUrl: (q) => `https://www.arrow.com/en/search?q=${q}`,
  },
];

/**
 * 등록된 모든 유통사의 이름 목록을 반환합니다.
 */
export function getDistributorNames(): string[] {
  return DISTRIBUTORS.map((d) => d.name);
}

/**
 * 등록된 모든 유통사의 기본 정보(이름, 색상)를 반환합니다.
 */
export function getDistributorInfo(): Array<{ name: string; color: string }> {
  return DISTRIBUTORS.map((d) => ({ name: d.name, color: d.color }));
}

/**
 * MPN(제조사 부품 번호)을 받아 각 유통사별 검색 URL 목록을 반환합니다.
 * @param mpn 부품 번호
 * @param enabledSites 검색할 유통사 이름 목록. 생략하면 모든 유통사를 검색합니다.
 * @throws {Error} MPN이 빈 문자열인 경우
 */
export function generateSearchUrls(mpn: string, enabledSites?: string[]): SearchUrl[] {
  const cleanMpn = mpn.trim();
  if (cleanMpn === '') {
    throw new Error('MPN은 비어있을 수 없습니다.');
  }
  const encodedMpn = encodeURIComponent(cleanMpn);

  const targets = enabledSites
    ? DISTRIBUTORS.filter((d) => enabledSites.includes(d.name))
    : DISTRIBUTORS;

  return targets.map((d) => ({
    name: d.name,
    color: d.color,
    url: d.buildUrl(encodedMpn),
  }));
}
