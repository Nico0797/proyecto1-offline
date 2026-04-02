import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Sales } from './Sales';
import { useAuthStore } from '../store/authStore';
import { useBusinessStore } from '../store/businessStore';
import { useSaleStore } from '../store/saleStore';
import { vi, describe, it, expect } from 'vitest';
import React from 'react';

// Mock stores
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../store/businessStore', () => ({
  useBusinessStore: vi.fn(),
}));

vi.mock('../store/saleStore', () => ({
  useSaleStore: vi.fn(),
}));

// Mock components to simplify rendering
vi.mock('../components/Sales/CreateSaleModal', () => ({
  CreateSaleModal: ({ isOpen }: any) => isOpen ? <div data-testid="create-sale-modal">Modal Open</div> : null,
}));

vi.mock('../components/ui/UpgradeModal', () => ({
  UpgradeModal: ({ isOpen }: any) => isOpen ? <div data-testid="upgrade-modal">Upgrade Required</div> : null,
}));

describe('Sales Page - Access Control for Team Members', () => {
  const mockFetchSales = vi.fn();
  const mockSales = Array(25).fill({ id: 1, total: 100, sale_date: '2023-01-01' }); // More than limit

  beforeEach(() => {
    vi.clearAllMocks();
    (useSaleStore as any).mockReturnValue({
      sales: mockSales,
      loading: false,
      fetchSales: mockFetchSales,
    });
  });

  it('ALLOWS creating sale for Team Member with FREE personal plan but PRO business plan', () => {
    // Setup: Team Member (free) in PRO Business
    (useAuthStore as any).mockReturnValue({
      user: { id: 2, plan: 'free', account_type: 'team_member' },
    });
    (useBusinessStore as any).mockReturnValue({
      activeBusiness: { id: 1, plan: 'pro', user_id: 1 }, 
    });

    render(<Sales />);

    // Action: Click New Sale
    const newSaleBtn = screen.getByTestId('sales.primaryAction.desktop') || screen.getAllByText(/Nueva Venta/i)[0];
    fireEvent.click(newSaleBtn);

    // Assert: Modal should open, Upgrade should NOT show
    expect(screen.getByTestId('create-sale-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('upgrade-modal')).not.toBeInTheDocument();
  });

  it('BLOCKS creating sale for Owner with FREE plan when limit reached', () => {
    // Setup: Owner (free) in FREE Business
    (useAuthStore as any).mockReturnValue({
      user: { id: 1, plan: 'free', account_type: 'personal' },
    });
    (useBusinessStore as any).mockReturnValue({
      activeBusiness: { id: 1, plan: 'free', user_id: 1 }, 
    });

    render(<Sales />);

    // Action
    const newSaleBtn = screen.getByTestId('sales.primaryAction.desktop') || screen.getAllByText(/Nueva Venta/i)[0];
    fireEvent.click(newSaleBtn);

    // Assert: Upgrade should show
    expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('create-sale-modal')).not.toBeInTheDocument();
  });
  
  it('ALLOWS creating sale for Owner with FREE plan when limit NOT reached', () => {
     // Setup: Limit not reached
     (useSaleStore as any).mockReturnValue({
        sales: Array(5).fill({ id: 1 }), // Only 5 sales
        loading: false,
        fetchSales: mockFetchSales,
      });
      
    (useAuthStore as any).mockReturnValue({
      user: { id: 1, plan: 'free', account_type: 'personal' },
    });
    (useBusinessStore as any).mockReturnValue({
      activeBusiness: { id: 1, plan: 'free', user_id: 1 }, 
    });

    render(<Sales />);

    const newSaleBtn = screen.getByTestId('sales.primaryAction.desktop') || screen.getAllByText(/Nueva Venta/i)[0];
    fireEvent.click(newSaleBtn);

    expect(screen.getByTestId('create-sale-modal')).toBeInTheDocument();
  });
});
