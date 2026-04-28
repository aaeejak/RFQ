import { describe, it, expect, vi } from 'vitest';
import { SearchUseCase } from './SearchUseCase';
import { IWindowOpener } from './IWindowOpener';
import { generateSearchUrls } from '../../domain/price-search/UrlGenerator';

function createMockOpener(): IWindowOpener & { open: ReturnType<typeof vi.fn> } {
  return { open: vi.fn() };
}

describe('SearchUseCase', () => {
  it('should call windowOpener.open for each generated URL', () => {
    const mockOpener = createMockOpener();
    const useCase = new SearchUseCase(mockOpener);
    const mpn = 'STM32';

    const result = useCase.execute(mpn);

    const expectedUrls = generateSearchUrls(mpn);
    expect(mockOpener.open).toHaveBeenCalledTimes(expectedUrls.length);
    expectedUrls.forEach((site, index) => {
      expect(mockOpener.open).toHaveBeenNthCalledWith(index + 1, site.url);
    });

    expect(result).toEqual({
      mpn: 'STM32',
      openedCount: 3,
    });
  });

  it('should return null and not open any tab for empty MPN', () => {
    const mockOpener = createMockOpener();
    const useCase = new SearchUseCase(mockOpener);

    expect(useCase.execute('')).toBeNull();
    expect(useCase.execute('   ')).toBeNull();
    expect(mockOpener.open).not.toHaveBeenCalled();
  });

  it('should return null for undefined-like falsy input', () => {
    const mockOpener = createMockOpener();
    const useCase = new SearchUseCase(mockOpener);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(useCase.execute(undefined as any)).toBeNull();
    expect(mockOpener.open).not.toHaveBeenCalled();
  });
});
