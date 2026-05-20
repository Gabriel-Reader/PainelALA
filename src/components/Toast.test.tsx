import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastContainer, showToast } from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders toast when showToast is called', async () => {
    render(<ToastContainer />);
    
    act(() => {
      showToast('My test toast', 'success');
    });
    
    expect(screen.getByText('My test toast')).toBeDefined();
  });

  it('removes toast after duration', async () => {
    render(<ToastContainer duration={3000} />);
    
    act(() => {
      showToast('Disappearing toast', 'info');
    });
    
    expect(screen.getByText('Disappearing toast')).toBeDefined();
    
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    expect(screen.queryByText('Disappearing toast')).toBeNull();
  });
});
