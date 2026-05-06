
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PriceSearchUI from './PriceSearchUI';

describe('PriceSearchUI', () => {
  it('renders input, search button, and site badges', () => {
    const mockOnSearch = vi.fn();
    render(<PriceSearchUI onSearch={mockOnSearch} />);

    expect(screen.getByPlaceholderText(/부품 번호/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /검색/i })).toBeInTheDocument();

    // 4개의 사이트 배지가 표시되어야 함
    expect(screen.getByText(/DigiKey/)).toBeInTheDocument();
    expect(screen.getByText(/Mouser/)).toBeInTheDocument();
    expect(screen.getByText(/Element14/)).toBeInTheDocument();
    expect(screen.getByText(/Arrow/)).toBeInTheDocument();
  });

  it('all badges are active by default', () => {
    const mockOnSearch = vi.fn();
    render(<PriceSearchUI onSearch={mockOnSearch} />);

    const badges = screen.getAllByRole('button', { pressed: true });
    // 4개 사이트 배지 + 검색 버튼이 아닌 것만
    const activeBadges = badges.filter((b) => b.classList.contains('site-badge--active'));
    expect(activeBadges).toHaveLength(4);
  });

  it('toggles badge off and on when clicked', () => {
    const mockOnSearch = vi.fn();
    render(<PriceSearchUI onSearch={mockOnSearch} />);

    const digikeyBadge = screen.getByText(/DigiKey/);
    expect(digikeyBadge).toHaveClass('site-badge--active');

    fireEvent.click(digikeyBadge);
    expect(digikeyBadge).toHaveClass('site-badge--inactive');

    fireEvent.click(digikeyBadge);
    expect(digikeyBadge).toHaveClass('site-badge--active');
  });

  it('disables the search button when input is empty', () => {
    const mockOnSearch = vi.fn();
    render(<PriceSearchUI onSearch={mockOnSearch} />);

    const button = screen.getByRole('button', { name: /검색/i });
    expect(button).toBeDisabled();
  });

  it('disables the search button when no sites are selected', () => {
    const mockOnSearch = vi.fn();
    render(<PriceSearchUI onSearch={mockOnSearch} />);

    // 모든 배지 끄기
    const badges = screen.getAllByRole('button').filter((b) => b.classList.contains('site-badge'));
    badges.forEach((badge) => fireEvent.click(badge));

    const input = screen.getByPlaceholderText(/부품 번호/i);
    fireEvent.change(input, { target: { value: 'STM32' } });

    const button = screen.getByRole('button', { name: /검색/i });
    expect(button).toBeDisabled();
  });

  it('calls onSearch with the input value and enabled sites when the form is submitted', () => {
    const mockOnSearch = vi.fn();
    render(<PriceSearchUI onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText(/부품 번호/i);
    const button = screen.getByRole('button', { name: /검색/i });

    fireEvent.change(input, { target: { value: 'STM32' } });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    expect(mockOnSearch).toHaveBeenCalledWith(
      'STM32',
      expect.arrayContaining(['DigiKey', 'Mouser', 'Element14', 'Arrow'])
    );
  });

  it('calls onSearch with only enabled sites after toggling some off', () => {
    const mockOnSearch = vi.fn();
    render(<PriceSearchUI onSearch={mockOnSearch} />);

    // Mouser와 Arrow를 끄기
    fireEvent.click(screen.getByText(/Mouser/));
    fireEvent.click(screen.getByText(/Arrow/));

    const input = screen.getByPlaceholderText(/부품 번호/i);
    fireEvent.change(input, { target: { value: 'LM358' } });
    fireEvent.click(screen.getByRole('button', { name: /검색/i }));

    const calledSites = mockOnSearch.mock.calls[0][1] as string[];
    expect(calledSites).toContain('DigiKey');
    expect(calledSites).toContain('Element14');
    expect(calledSites).not.toContain('Mouser');
    expect(calledSites).not.toContain('Arrow');
  });

  it('does not call onSearch when input is whitespace only', () => {
    const mockOnSearch = vi.fn();
    render(<PriceSearchUI onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText(/부품 번호/i);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form')!);

    expect(mockOnSearch).not.toHaveBeenCalled();
  });
});
