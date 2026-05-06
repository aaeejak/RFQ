import React, { useState, useCallback } from 'react';
import SiteBadges, { createInitialEnabledSites } from '../shared/SiteBadges';

interface Props {
  onSearch: (mpn: string, enabledSites?: string[]) => void;
}

export default function PriceSearchUI({ onSearch }: Props) {
  const [mpn, setMpn] = useState('');
  const [searched, setSearched] = useState(false);
  const [lastOpenedCount, setLastOpenedCount] = useState(0);

  const [enabledSites, setEnabledSites] = useState<Set<string>>(
    createInitialEnabledSites
  );

  const toggleSite = useCallback((name: string) => {
    setEnabledSites((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const enabledCount = enabledSites.size;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (mpn.trim() !== '' && enabledCount > 0) {
        const enabled = Array.from(enabledSites);
        onSearch(mpn, enabled);
        setLastOpenedCount(enabledCount);
        setSearched(true);
        setMpn('');
        setTimeout(() => setSearched(false), 3000);
      }
    },
    [mpn, onSearch, enabledSites, enabledCount]
  );

  return (
    <div className="search-container">
      <h2 className="title">⚡ 단가 일괄 조회</h2>
      <p className="subtitle">
        검색할 사이트를 선택하고, 부품 번호를 입력하세요.
      </p>

      <SiteBadges enabledSites={enabledSites} onToggle={toggleSite} />

      {enabledCount === 0 && (
        <div className="warning-box warning-box--inline" role="note">
          ⚠️ 최소 1개 이상의 사이트를 선택해 주세요.
        </div>
      )}

      <form onSubmit={handleSubmit} className="search-form">
        <input
          id="mpn-input"
          type="text"
          value={mpn}
          onChange={(e) => setMpn(e.target.value)}
          placeholder="부품 번호 (MPN) 입력..."
          className="search-input"
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        <button
          id="search-button"
          type="submit"
          className="search-button"
          disabled={mpn.trim() === '' || enabledCount === 0}
        >
          🔍 검색
        </button>
      </form>

      {/* 검색 완료 알림 */}
      {searched && (
        <div className="success-box" role="alert">
          ✅ {lastOpenedCount}개의 사이트가 새 탭으로 열렸습니다!
        </div>
      )}

      <div className="warning-box" role="note">
        <strong>⚠️ 팝업 차단 해제 안내</strong>
        <p>
          검색 시 선택된 사이트가 새 탭으로 동시에 열립니다. 브라우저의 팝업 차단을
          허용해 주세요.
        </p>
      </div>
    </div>
  );
}
