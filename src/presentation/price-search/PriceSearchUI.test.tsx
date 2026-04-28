import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PriceSearchUI from './PriceSearchUI';

describe('PriceSearchUI', () => {
  it('renders input, search button, and site badges', () => {
    const mockOnSearch = vi.fn();
    render(<PriceSearchUI onSearch={mockOnSearch} />);

    expect(screen.getByPlaceholderText(/부품 번호/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /검색/i })).toBeInTheDocument();

    // 3개의 사이트 배지가 표시되어야 함
    expect(screen.getByText('DigiKey')).toBeInTheDocument();
    expect(screen.getByText('Mouser')).toBeInTheDocument();
    expect(screen.getByText('Element14')).toBeInTheDocument();
  });

  it('disables the search button when input is empty', () => {
    const mockOnSearch = vi.fn();
    render(<PriceSearchUI onSearch={mockOnSearch} />);

    const button = screen.getByRole('button', { name: /검색/i });
    expect(button).toBeDisabled();
  });

  it('calls onSearch with the input value when the form is submitted', () => {
    const mockOnSearch = vi.fn();
    render(<PriceSearchUI onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText(/부품 번호/i);
    const button = screen.getByRole('button', { name: /검색/i });

    fireEvent.change(input, { target: { value: 'STM32' } });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    expect(mockOnSearch).toHaveBeenCalledWith('STM32');
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
