import React, { useMemo } from 'react';
import type { ColumnMapping } from '../../application/excel-search/IFileParser';

interface Props {
  /** 모든 원본 행 */
  rawRows: string[][];
  /** 열 수 */
  columnCount: number;
  /** 첫 행을 헤더로 사용할지 여부 */
  useFirstRowAsHeader: boolean;
  onToggleHeader: (value: boolean) => void;
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
}

/** 열 이름 생성: A, B, C, ..., Z, AA, AB, ... */
function generateColumnLabel(index: number): string {
  let label = '';
  let i = index;
  do {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return label;
}

/** 헤더에 특정 키워드가 포함되어 있으면 해당 인덱스를 반환 */
function autoDetectColumn(headers: string[], keywords: string[]): number | null {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw));
    if (idx !== -1) return idx;
  }
  return null;
}

export function useAutoDetect(headers: string[]): ColumnMapping {
  return useMemo(() => {
    const mpn = autoDetectColumn(headers, ['mpn', 'part number', 'part no', 'p/n', '부품번호', '부품 번호', 'partnumber']);
    const qty = autoDetectColumn(headers, ['qty', 'quantity', '수량', 'amount']);
    return {
      mpnColumnIndex: mpn ?? 0,
      quantityColumnIndex: qty,
    };
  }, [headers]);
}

export default function ColumnSelector({
  rawRows,
  columnCount,
  useFirstRowAsHeader,
  onToggleHeader,
  mapping,
  onMappingChange,
}: Props) {
  // 헤더 이름 계산
  const columnHeaders = useMemo(() => {
    if (useFirstRowAsHeader && rawRows.length > 0) {
      return rawRows[0].map((val, idx) =>
        val.trim() !== '' ? val.trim() : `(${generateColumnLabel(idx)})`
      );
    }
    return Array.from({ length: columnCount }, (_, i) => `열 ${generateColumnLabel(i)}`);
  }, [rawRows, columnCount, useFirstRowAsHeader]);

  // 미리보기용 데이터 행 (상단 10행 + 하단 5행)
  const previewRows = useMemo(() => {
    const dataRows = useFirstRowAsHeader ? rawRows.slice(1) : rawRows;
    if (dataRows.length <= 15) {
      return dataRows;
    }
    // 중간 생략 마커를 위해 특수한 배열 하나를 삽입합니다.
    return [
      ...dataRows.slice(0, 10),
      ['...ELLIPSIS...'],
      ...dataRows.slice(dataRows.length - 5)
    ];
  }, [rawRows, useFirstRowAsHeader]);

  const handleMpnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onMappingChange({ ...mapping, mpnColumnIndex: Number(e.target.value) });
  };

  const handleQtyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onMappingChange({
      ...mapping,
      quantityColumnIndex: val === '' ? null : Number(val),
    });
  };

  return (
    <div className="column-selector">
      <h3 className="column-selector__title">📋 열(Column) 선택</h3>
      <p className="column-selector__desc">
        부품 번호(MPN)가 있는 열과 수량 열을 선택해주세요.
      </p>

      {/* 첫 행 헤더 토글 */}
      <div className="column-selector__toggle">
        <label className="toggle-label" htmlFor="header-toggle">
          <input
            id="header-toggle"
            type="checkbox"
            checked={useFirstRowAsHeader}
            onChange={(e) => onToggleHeader(e.target.checked)}
            className="toggle-checkbox"
          />
          <span className="toggle-switch" />
          <span className="toggle-text">첫 번째 행을 헤더로 사용</span>
        </label>
      </div>

      <div className="column-selector__controls">
        <div className="column-selector__field">
          <label htmlFor="mpn-column">부품 번호 열 (필수)</label>
          <select
            id="mpn-column"
            value={mapping.mpnColumnIndex}
            onChange={handleMpnChange}
            className="column-selector__select"
          >
            {columnHeaders.map((header, idx) => (
              <option key={idx} value={idx}>
                {header}
              </option>
            ))}
          </select>
        </div>

        <div className="column-selector__field">
          <label htmlFor="qty-column">수량 열 (선택)</label>
          <select
            id="qty-column"
            value={mapping.quantityColumnIndex ?? ''}
            onChange={handleQtyChange}
            className="column-selector__select"
          >
            <option value="">— 선택 안 함 —</option>
            {columnHeaders.map((header, idx) => (
              <option key={idx} value={idx}>
                {header}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 미리보기 테이블 */}
      <div className="column-selector__preview">
        <p className="column-selector__preview-title">
          미리보기 (상단 및 하단 데이터)
          <span className="column-selector__total"> · 전체 {useFirstRowAsHeader ? rawRows.length - 1 : rawRows.length}행</span>
        </p>
        <div className="table-scroll" style={{ maxHeight: '400px' }}>
          <table className="preview-table">
            <thead>
              <tr>
                {columnHeaders.map((h, idx) => (
                  <th
                    key={idx}
                    className={
                      idx === mapping.mpnColumnIndex
                        ? 'col-highlight col-highlight--mpn'
                        : idx === mapping.quantityColumnIndex
                          ? 'col-highlight col-highlight--qty'
                          : ''
                    }
                  >
                    {h}
                    {idx === mapping.mpnColumnIndex && <span className="col-tag">MPN</span>}
                    {idx === mapping.quantityColumnIndex && <span className="col-tag col-tag--qty">수량</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, ri) => {
                if (row.length === 1 && row[0] === '...ELLIPSIS...') {
                  return (
                    <tr key={`ellipsis-${ri}`} className="preview-table__ellipsis">
                      <td 
                        colSpan={columnCount} 
                        style={{ textAlign: 'center', color: '#64748b', background: 'rgba(15,23,42,0.3)', padding: '1rem', letterSpacing: '0.2em' }}
                      >
                        ... 중간 데이터 생략 ...
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={
                          ci === mapping.mpnColumnIndex
                            ? 'col-highlight col-highlight--mpn'
                            : ci === mapping.quantityColumnIndex
                              ? 'col-highlight col-highlight--qty'
                              : ''
                        }
                      >
                        {cell || <span className="cell-empty">—</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
