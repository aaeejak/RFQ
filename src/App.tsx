import { useState, useMemo, useCallback } from 'react';
import PriceSearchUI from './presentation/price-search/PriceSearchUI';
import ExcelSearchPage from './presentation/excel-search/ExcelSearchPage';
import { SearchUseCase } from './application/price-search/SearchUseCase';
import { BrowserWindowOpener } from './infrastructure/price-search/BrowserWindowOpener';
import './App.css';

type Tab = 'manual' | 'excel';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('manual');

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

      {/* 탭 네비게이션 */}
      <nav className="tab-nav">
        <button
          className={`tab-nav__btn ${activeTab === 'manual' ? 'tab-nav__btn--active' : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          ⌨️ 수동 검색
        </button>
        <button
          className={`tab-nav__btn ${activeTab === 'excel' ? 'tab-nav__btn--active' : ''}`}
          onClick={() => setActiveTab('excel')}
        >
          📊 엑셀 업로드
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'manual' && <PriceSearchUI onSearch={handleSearch} />}
        {activeTab === 'excel' && <ExcelSearchPage onSearch={handleSearch} />}
      </main>

      <footer className="app-footer">
        <p>DigiKey · Mouser · Element14 검색 결과를 새 탭으로 열어줍니다.</p>
      </footer>
    </div>
  );
}

export default App;
