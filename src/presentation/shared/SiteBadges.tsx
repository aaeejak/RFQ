import { useCallback } from 'react';
import { getDistributorInfo } from '../../domain/price-search/UrlGenerator';

interface Props {
  enabledSites: Set<string>;
  onToggle: (name: string) => void;
}

const SITES = getDistributorInfo();

/**
 * 유통사 배지 토글 컴포넌트.
 * 클릭으로 각 사이트의 활성/비활성 상태를 전환합니다.
 */
export default function SiteBadges({ enabledSites, onToggle }: Props) {
  const handleClick = useCallback(
    (name: string) => () => onToggle(name),
    [onToggle]
  );

  return (
    <div className="site-badges">
      {SITES.map((site) => {
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
            onClick={handleClick(site.name)}
            aria-pressed={isEnabled}
            title={isEnabled ? `${site.name} 검색 끄기` : `${site.name} 검색 켜기`}
          >
            {isEnabled ? '✓ ' : ''}{site.name}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 유통사 토글 상태 관리를 위한 유틸리티.
 * 초기 상태: 모든 사이트 활성화.
 */
export function createInitialEnabledSites(): Set<string> {
  return new Set(SITES.map((s) => s.name));
}
