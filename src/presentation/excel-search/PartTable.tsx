import { useState, useMemo, useCallback } from 'react';
import type { ExcelPart } from '../../domain/excel-search/ExcelPart';

interface Props {
  parts: ExcelPart[];
  onPartClick: (mpn: string) => void;
}

export default function PartTable({ parts, onPartClick }: Props) {
  const [filter, setFilter] = useState('');
  const [clickedMpn, setClickedMpn] = useState<string | null>(null);

  const filteredParts = useMemo(() => {
    if (filter.trim() === '') return parts;
    const lower = filter.toLowerCase();
    return parts.filter((p) => p.mpn.toLowerCase().includes(lower));
  }, [parts, filter]);

  const handleRowClick = useCallback(
    (mpn: string) => {
      setClickedMpn(mpn);
      onPartClick(mpn);
      setTimeout(() => setClickedMpn(null), 2000);
    },
    [onPartClick]
  );

  return (
    <div className="part-table-container">
      <div className="part-table-header">
        <h3 className="part-table__title">
          📦 부품 목록 <span className="part-table__count">{filteredParts.length}건</span>
        </h3>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="부품 번호 검색..."
          className="part-table__filter"
          id="part-filter-input"
        />
      </div>

      {filteredParts.length === 0 ? (
        <div className="part-table__empty">
          {filter ? '검색 결과가 없습니다.' : '파싱된 부품이 없습니다.'}
        </div>
      ) : (
        <div className="table-scroll">
          <table className="part-table">
            <thead>
              <tr>
                <th className="part-table__th part-table__th--num">#</th>
                <th className="part-table__th">부품 번호 (MPN)</th>
                <th className="part-table__th part-table__th--qty">수량</th>
                <th className="part-table__th part-table__th--action">검색</th>
              </tr>
            </thead>
            <tbody>
              {filteredParts.map((part, idx) => (
                <tr
                  key={`${part.rowIndex}-${part.mpn}`}
                  className={`part-table__row ${clickedMpn === part.mpn ? 'part-table__row--clicked' : ''}`}
                  onClick={() => handleRowClick(part.mpn)}
                  role="button"
                  tabIndex={0}
                  title={`클릭하여 "${part.mpn}" 검색`}
                >
                  <td className="part-table__td part-table__td--num">{idx + 1}</td>
                  <td className="part-table__td part-table__td--mpn">{part.mpn}</td>
                  <td className="part-table__td part-table__td--qty">
                    {part.quantity !== null ? part.quantity.toLocaleString() : '—'}
                  </td>
                  <td className="part-table__td part-table__td--action">
                    <span className="search-icon">🔍</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {clickedMpn && (
        <div className="part-table__toast" role="alert">
          ✅ <strong>{clickedMpn}</strong> — 3개 사이트 탭이 열렸습니다!
        </div>
      )}
    </div>
  );
}
