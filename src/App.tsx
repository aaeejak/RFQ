import React, { useMemo, useCallback } from 'react';
import PriceSearchUI from './presentation/price-search/PriceSearchUI';
import { SearchUseCase } from './application/price-search/SearchUseCase';
import { BrowserWindowOpener } from './infrastructure/price-search/BrowserWindowOpener';
import './App.css';

function App() {
  // DI를 컴포넌트 내부 useMemo로 이동 — 모듈 스코프 사이드이펙트 제거
  const searchUseCase = useMemo(() => {
    const windowOpener = new BrowserWindowOpener();
    return new SearchUseCase(windowOpener);
  }, []);

  const handleSearch = useCallback(
    (mpn: string) => {
      searchUseCase.execute(mpn);
    },
    [searchUseCase]
  );

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Component Search</h1>
        <p className="header-desc">전자부품 통합 단가 조회</p>
      </header>
      <main className="app-main">
        <PriceSearchUI onSearch={handleSearch} />
      </main>
      <footer className="app-footer">
        <p>DigiKey · Mouser · Element14 검색 결과를 새 탭으로 열어줍니다.</p>
      </footer>
    </div>
  );
}

export default App;
