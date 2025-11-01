import { formatUnitsSafe } from './bn';

/**
 * Format a wallet address for display
 * @param address - The full address
 * @param startChars - Number of characters to show at start (default: 6)
 * @param endChars - Number of characters to show at end (default: 4)
 * @returns Formatted address like "0x1234...5678"
 */
export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address) return '';
  if (address.length < startChars + endChars) return address;

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format a USD value
 * @param value - The value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string like "$1,234.56"
 */
export function formatUSD(value: number | string, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format a BNB value
 * @param value - The value in BNB (bigint or string in wei)
 * @param maxDecimals - Maximum decimal places (default: 4)
 * @returns Formatted string like "1.2345 BNB"
 */
export function formatBNB(value: bigint | string | number, maxDecimals: number = 4): string {
  if (typeof value === 'number') {
    return `${value.toFixed(maxDecimals)} BNB`;
  }

  const formatted = formatUnitsSafe(value, 18, maxDecimals);
  return `${formatted} BNB`;
}

/**
 * Format a token amount
 * @param value - The value in wei/smallest unit
 * @param decimals - Token decimals
 * @param symbol - Token symbol (optional)
 * @param maxDecimals - Maximum decimal places to show
 * @returns Formatted string
 */
export function formatToken(
  value: bigint | string | number,
  decimals: number,
  symbol?: string,
  maxDecimals: number = 4
): string {
  const formatted = formatUnitsSafe(value, decimals, maxDecimals);
  return symbol ? `${formatted} ${symbol}` : formatted;
}

/**
 * Format a large number with K, M, B suffixes
 * @param value - The value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string like "1.2M"
 */
export function formatCompact(value: number | string, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '0';

  const absNum = Math.abs(num);

  if (absNum >= 1e9) {
    return `${(num / 1e9).toFixed(decimals)}B`;
  } else if (absNum >= 1e6) {
    return `${(num / 1e6).toFixed(decimals)}M`;
  } else if (absNum >= 1e3) {
    return `${(num / 1e3).toFixed(decimals)}K`;
  }

  return num.toFixed(decimals);
}

/**
 * Format a percentage
 * @param value - The percentage value (0-100)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string like "12.34%"
 */
export function formatPercent(value: number | string, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '0%';

  return `${num.toFixed(decimals)}%`;
}

/**
 * Format a timestamp as relative time
 * @param timestamp - Unix timestamp in seconds or milliseconds
 * @returns Relative time string like "2 hours ago"
 */
export function formatRelativeTime(timestamp: number): string {
  // Convert to milliseconds if needed
  const ts = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const now = Date.now();
  const diffMs = now - ts;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return `${diffSec}s ago`;
  } else if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins}m ago`;
  } else if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffSec / 86400);
    return `${days}d ago`;
  }
}

/**
 * Format a date as MM/DD/YYYY
 * @param timestamp - Unix timestamp in seconds or milliseconds
 * @returns Formatted date string
 */
export function formatDate(timestamp: number): string {
  const ts = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const date = new Date(ts);

  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format a date as "HH:mm:ss"
 * @param timestamp - Unix timestamp in seconds or milliseconds
 * @returns Formatted time string
 */
export function formatTime(timestamp: number): string {
  const ts = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const date = new Date(ts);

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Format a number with commas
 * @param value - The number to format
 * @param decimals - Number of decimal places
 * @returns Formatted string like "1,234.56"
 */
export function formatNumber(value: number | string, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '0';

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format a transaction hash for display
 * @param txHash - The transaction hash
 * @returns Formatted hash like "0x1234...5678"
 */
export function formatTxHash(txHash: string): string {
  return formatAddress(txHash, 8, 6);
}
