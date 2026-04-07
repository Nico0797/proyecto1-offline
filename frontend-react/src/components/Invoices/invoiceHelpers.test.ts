import { describe, expect, it } from 'vitest';
import {
  getInvoiceCollectionLabel,
  getInvoiceCollectionTone,
  getInvoiceEditability,
  getInvoicePaymentState,
} from './invoiceHelpers';

describe('invoiceHelpers business guards', () => {
  it('locks editing when an invoice has recorded payments', () => {
    const result = getInvoiceEditability({
      status: 'partial',
      status_base: 'sent',
      amount_paid: 25000,
    });

    expect(result.canEdit).toBe(false);
    expect(result.reason).toMatch(/pagos registrados/i);
  });

  it('blocks payment capture while the invoice is still a draft', () => {
    const result = getInvoicePaymentState({
      status: 'draft',
      status_base: 'draft',
      outstanding_balance: 100000,
    });

    expect(result.canRecordPayment).toBe(false);
    expect(result.reason).toMatch(/enviada/i);
  });

  it('allows payment capture for sent invoices with balance due', () => {
    const result = getInvoicePaymentState({
      status: 'sent',
      status_base: 'sent',
      outstanding_balance: 100000,
    });

    expect(result.canRecordPayment).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('describes overdue invoices for collections views', () => {
    expect(
      getInvoiceCollectionLabel({
        status: 'overdue',
        balance_due: 120000,
        days_overdue: 6,
        days_until_due: -6,
      })
    ).toMatch(/6 dia\(s\)/i);
  });

  it('uses an overdue tone for collectible overdue invoices', () => {
    const tone = getInvoiceCollectionTone({
      status: 'overdue',
      balance_due: 120000,
      days_overdue: 6,
    });

    expect(tone.badgeClassName).toMatch(/rose/i);
    expect(tone.textClassName).toMatch(/rose/i);
  });
});
