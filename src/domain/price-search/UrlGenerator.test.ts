import { describe, it, expect } from 'vitest';
import { generateSearchUrls, getDistributorNames, getDistributorInfo } from './UrlGenerator';

describe('UrlGenerator', () => {
  it('should generate correct URLs for DigiKey, Mouser, Element14, and Arrow', () => {
    const mpn = 'STM32F103C8T6';
    const urls = generateSearchUrls(mpn);

    expect(urls).toHaveLength(4);

    expect(urls[0].name).toBe('DigiKey');
    expect(urls[0].url).toBe('https://www.digikey.kr/ko/products/result?keywords=STM32F103C8T6');

    expect(urls[1].name).toBe('Mouser');
    expect(urls[1].url).toBe('https://www.mouser.kr/c/?q=STM32F103C8T6');

    expect(urls[2].name).toBe('Element14');
    expect(urls[2].url).toBe('https://kr.element14.com/search?st=STM32F103C8T6');

    expect(urls[3].name).toBe('Arrow');
    expect(urls[3].url).toBe('https://www.arrow.com/en/search-result.html?keyword=STM32F103C8T6');
  });

  it('should include brand color for each distributor', () => {
    const urls = generateSearchUrls('LM358');
    urls.forEach((site) => {
      expect(site.color).toBeDefined();
      expect(site.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('should trim and encode MPN with spaces', () => {
    const mpn = ' STM 32 F ';
    const urls = generateSearchUrls(mpn);

    // trim 후 "STM 32 F" → encode → "STM%2032%20F"
    expect(urls[0].url).toContain('STM%2032%20F');
    expect(urls[1].url).toContain('STM%2032%20F');
    expect(urls[2].url).toContain('STM%2032%20F');
    expect(urls[3].url).toContain('STM%2032%20F');
  });

  it('should throw an error for empty MPN', () => {
    expect(() => generateSearchUrls('')).toThrow('MPN은 비어있을 수 없습니다.');
  });

  it('should throw an error for whitespace-only MPN', () => {
    expect(() => generateSearchUrls('   ')).toThrow('MPN은 비어있을 수 없습니다.');
  });

  // === enabledSites 필터 테스트 ===

  it('should filter by enabledSites when provided', () => {
    const urls = generateSearchUrls('LM358', ['DigiKey', 'Arrow']);
    expect(urls).toHaveLength(2);
    expect(urls[0].name).toBe('DigiKey');
    expect(urls[1].name).toBe('Arrow');
  });

  it('should return all sites when enabledSites is undefined', () => {
    const urls = generateSearchUrls('LM358');
    expect(urls).toHaveLength(4);
  });

  it('should return empty array when enabledSites is empty', () => {
    const urls = generateSearchUrls('LM358', []);
    expect(urls).toHaveLength(0);
  });

  // === getDistributorNames / getDistributorInfo 테스트 ===

  it('getDistributorNames should return all distributor names', () => {
    const names = getDistributorNames();
    expect(names).toEqual(['DigiKey', 'Mouser', 'Element14', 'Arrow']);
  });

  it('getDistributorInfo should return name and color for each distributor', () => {
    const info = getDistributorInfo();
    expect(info).toHaveLength(4);
    info.forEach((d) => {
      expect(d.name).toBeDefined();
      expect(d.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});
