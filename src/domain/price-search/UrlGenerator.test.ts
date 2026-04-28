import { describe, it, expect } from 'vitest';
import { generateSearchUrls } from './UrlGenerator';

describe('UrlGenerator', () => {
  it('should generate correct URLs for DigiKey, Mouser, and Element14', () => {
    const mpn = 'STM32F103C8T6';
    const urls = generateSearchUrls(mpn);

    expect(urls).toHaveLength(3);

    expect(urls[0].name).toBe('DigiKey');
    expect(urls[0].url).toBe('https://www.digikey.kr/ko/products/result?keywords=STM32F103C8T6');

    expect(urls[1].name).toBe('Mouser');
    expect(urls[1].url).toBe('https://www.mouser.kr/c/?q=STM32F103C8T6');

    expect(urls[2].name).toBe('Element14');
    expect(urls[2].url).toBe('https://kr.element14.com/search?st=STM32F103C8T6');
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
  });

  it('should throw an error for empty MPN', () => {
    expect(() => generateSearchUrls('')).toThrow('MPN은 비어있을 수 없습니다.');
  });

  it('should throw an error for whitespace-only MPN', () => {
    expect(() => generateSearchUrls('   ')).toThrow('MPN은 비어있을 수 없습니다.');
  });
});
