import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from './ConfirmModal';

vi.mock('../LanguageContext', () => ({
  useLang: () => ({ t: { confirm: 'Confirmar', cancel: 'Cancelar' } })
}));

describe('ConfirmModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ConfirmModal isOpen={false} message="Test" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and message when isOpen is true', () => {
    render(
      <ConfirmModal isOpen={true} title="My Title" message="Are you sure?" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText('My Title')).toBeDefined();
    expect(screen.getByText('Are you sure?')).toBeDefined();
  });

  it('calls onConfirm and onCancel when confirm button is clicked', () => {
    const mockOnConfirm = vi.fn();
    const mockOnCancel = vi.fn();
    render(
      <ConfirmModal isOpen={true} message="Test" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
    );
    fireEvent.click(screen.getByText('Confirmar'));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
