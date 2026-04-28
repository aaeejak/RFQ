import React, { useState, useMemo, useCallback } from 'react';
import { generateSearchUrls } from '../../domain/price-search/UrlGenerator';

interface Props {
  onSearch: (mpn: string) => void;
}

export default function PriceSearchUI({ onSearch }: Props) {
  const [mpn, setMpn] = useState('');
  const [searched, setSearched] = useState(false);

  const sites = useMemo(() => {
    try {
      return generateSearchUrls('PLACEHOLDER');
    } catch {
      return [];
    }
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (mpn.trim() !== '') {
        onSearch(mpn);
        setSearched(true);
        // 검색 후 입력창 초기화
        setMpn('');
        // 잠시 후 알림 숨기기
        setTimeout(() => setSearched(false), 3000);
      }
    },
    [mpn, onSearch]
  );

  return (
    <div className="search-container">
      <h2 className="title">⚡ 단가 일괄 조회</h2>
      <p className="subtitle">
        한 번의 검색으로 DigiKey, Mouser, Element14의 재고와 가격을 확인하세요.
      </p>

      {/* 지원 사이트 목록 */}
      <div className="site-badges">
        {sites.map((site) => (
          <span
            key={site.name}
            className="site-badge"
            style={{ borderColor: site.color, color: site.color }}
          >
            {site.name}
          </span>
        ))}
      </div>

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
          disabled={mpn.trim() === ''}
        >
          🔍 검색
        </button>
      </form>

      {/* 검색 완료 알림 */}
      {searched && (
        <div className="success-box" role="alert">
          ✅ 3개의 사이트가 새 탭으로 열렸습니다!
        </div>
      )}

      <div className="warning-box" role="note">
        <strong>⚠️ 팝업 차단 해제 안내</strong>
        <p>
          검색 시 3개의 새 탭이 동시에 열립니다. 브라우저의 팝업 차단을 허용해
          주세요.
        </p>
      </div>
    </div>
  );
}
