import React, { useState, useMemo, useCallback } from 'react';
import { getDistributorInfo } from '../../domain/price-search/UrlGenerator';

interface Props {
  onSearch: (mpn: string, enabledSites?: string[]) => void;
}

export default function PriceSearchUI({ onSearch }: Props) {
  const [mpn, setMpn] = useState('');
  const [searched, setSearched] = useState(false);
  const [lastOpenedCount, setLastOpenedCount] = useState(0);

  const sites = useMemo(() => getDistributorInfo(), []);

  // 모든 사이트가 기본적으로 활성화
  const [enabledSites, setEnabledSites] = useState<Set<string>>(
    () => new Set(sites.map((s) => s.name))
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

      {/* 토글 가능한 사이트 배지 */}
      <div className="site-badges">
        {sites.map((site) => {
          const isEnabled = enabledSites.has(site.name);
          return (
            <button
              key={site.name}
              type="button"
              className={`site-badge ${isEnabled ? 'site-badge--active' : 'site-badge--inactive'}`}
              style={
                isEnabled
                  ? { borderColor: site.color, color: site.color }
                  : undefined
              }
              onClick={() => toggleSite(site.name)}
              aria-pressed={isEnabled}
              title={isEnabled ? `${site.name} 검색 끄기` : `${site.name} 검색 켜기`}
            >
              {isEnabled ? '✓ ' : ''}{site.name}
            </button>
          );
        })}
      </div>

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
