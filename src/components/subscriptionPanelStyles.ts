import type { CSSProperties } from 'react';

/**
 * Inline styles for SubscriptionManagementPanel
 * Separated to keep component file under 500 lines
 */
export const subscriptionPanelStyles: Record<string, CSSProperties> = {
  container: {
    padding: '24px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    color: '#dc2626',
    marginBottom: '16px',
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280',
  },
  details: {
    marginBottom: '24px',
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  label: {
    color: '#6b7280',
    fontSize: '14px',
  },
  value: {
    color: '#111827',
    fontSize: '14px',
    fontWeight: 500,
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  cancelNotice: {
    marginTop: '12px',
    padding: '8px 12px',
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '6px',
    color: '#92400e',
    fontSize: '13px',
  },
  prorationPreview: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  previewTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  previewDetails: {
    marginBottom: '16px',
  },
  previewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '14px',
    color: '#4b5563',
  },
  previewTotal: {
    borderTop: '1px solid #e5e7eb',
    marginTop: '8px',
    paddingTop: '12px',
    fontWeight: 600,
    color: '#111827',
  },
  previewActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    color: '#374151',
    cursor: 'pointer',
    fontSize: '14px',
  },
  confirmButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  plansSection: {
    marginBottom: '24px',
  },
  plansTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  plansList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  planCard: {
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    textAlign: 'center',
  },
  currentPlan: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  planName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '4px',
  },
  planPrice: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  planDescription: {
    fontSize: '12px',
    color: '#9ca3af',
    marginBottom: '12px',
  },
  currentBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  changePlanButton: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    color: '#374151',
    cursor: 'pointer',
    fontSize: '14px',
    width: '100%',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  portalButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  cancelSubscriptionButton: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    border: '1px solid #ef4444',
    borderRadius: '6px',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

/** Format currency amount */
export function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/** Format date */
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Get status badge color */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return '#22c55e';
    case 'trialing':
      return '#3b82f6';
    case 'past_due':
      return '#f59e0b';
    case 'canceled':
    case 'expired':
      return '#ef4444';
    default:
      return '#6b7280';
  }
}
