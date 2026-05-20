import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBanner } from './ErrorBanner';

describe('ErrorBanner', () => {
  it('renders the error message correctly', () => {
    const mockOnDismiss = vi.fn();
    render(<ErrorBanner message="Test error message" onDismiss={mockOnDismiss} />);
    
    expect(screen.getByText('Erro ao salvar')).toBeDefined();
    expect(screen.getByText('Test error message')).toBeDefined();
  });

  it('calls onDismiss when close button is clicked', () => {
    const mockOnDismiss = vi.fn();
    render(<ErrorBanner message="Test error message" onDismiss={mockOnDismiss} />);
    
    const closeButton = screen.getByRole('button', { name: /fechar/i });
    fireEvent.click(closeButton);
    
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });
});
