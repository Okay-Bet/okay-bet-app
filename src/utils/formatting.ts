/**
 * Shared formatting utilities for dates, addresses, and time display
 */

/**
 * Format a date for display
 * @param date - Date object to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Format an Ethereum address to short form
 * @param address - Full Ethereum address
 * @returns Shortened address (0x1234...5678)
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format timestamp for chart display based on time range
 * @param timestamp - Unix timestamp in seconds
 * @param timeRange - Time range context ('1d', '1w', 'max')
 * @returns Formatted time string
 */
export function formatTime(timestamp: number, timeRange: '1d' | '1w' | 'max'): string {
  const date = new Date(timestamp * 1000);
  if (timeRange === '1d') {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (timeRange === '1w') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * Format a resolution/expiration date in relative or absolute terms
 * @param dateStr - ISO date string or undefined
 * @returns Formatted date string or relative time (e.g., "3 days", "Tomorrow")
 */
export function formatResolutionDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'N/A';

  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Closed';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `${diffDays} days`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks`;

  // Format as MMM DD
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
