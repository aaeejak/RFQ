import type { IWindowOpener } from '../../application/price-search/IWindowOpener';

export class BrowserWindowOpener implements IWindowOpener {
  open(url: string): void {
    // 브라우저 팝업 차단에 유의 (동시에 여러 탭을 열 때)
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
