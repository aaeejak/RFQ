import { generateSearchUrls } from '../../domain/price-search/UrlGenerator';
import type { IWindowOpener } from './IWindowOpener';

export interface SearchResult {
  /** 검색에 사용된 MPN */
  mpn: string;
  /** 열린 사이트 수 */
  openedCount: number;
}

export class SearchUseCase {
  constructor(private readonly windowOpener: IWindowOpener) {}

  /**
   * MPN을 받아 각 유통사의 검색 결과 페이지를 새 탭으로 엽니다.
   * @returns 검색 결과 요약. 빈 MPN이면 null을 반환합니다.
   */
  execute(mpn: string): SearchResult | null {
    if (!mpn || mpn.trim() === '') {
      return null;
    }
    const urls = generateSearchUrls(mpn);
    urls.forEach((site) => {
      this.windowOpener.open(site.url);
    });
    return {
      mpn: mpn.trim(),
      openedCount: urls.length,
    };
  }
}
