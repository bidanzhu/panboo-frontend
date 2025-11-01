import { formatUnits, parseUnits } from 'ethers';

/**
 * Safely convert a value to BigInt
 * @param value - The value to convert
 * @param decimals - Number of decimals (default: 18)
 * @returns BigInt representation
 */
export function toBN(value: string | number | bigint, decimals: number = 18): bigint {
  if (typeof value === 'bigint') {
    return value;
  }

  try {
    if (typeof value === 'number') {
      value = value.toString();
    }
    return parseUnits(value, decimals);
  } catch (error) {
    console.error('toBN conversion error:', error);
    return 0n;
  }
}

/**
 * Safely format units for display
 * @param value - The value to format (in wei/smallest unit)
 * @param decimals - Number of decimals (default: 18)
 * @param maxDecimals - Maximum decimal places to display (default: 6)
 * @returns Formatted string
 */
export function formatUnitsSafe(
  value: bigint | string | number,
  decimals: number = 18,
  maxDecimals: number = 6
): string {
  try {
    const formatted = formatUnits(value, decimals);
    const num = parseFloat(formatted);

    if (num === 0) return '0';

    // For very small numbers, use scientific notation
    if (num < 0.000001 && num > 0) {
      return num.toExponential(2);
    }

    // Round to maxDecimals
    const rounded = num.toFixed(maxDecimals);
    // Remove trailing zeros
    return parseFloat(rounded).toString();
  } catch (error) {
    console.error('formatUnitsSafe error:', error);
    return '0';
  }
}

/**
 * Safely parse user input to wei/smallest unit
 * @param value - User input string
 * @param decimals - Number of decimals (default: 18)
 * @returns BigInt representation or 0n on error
 */
export function parseUnitsSafe(value: string, decimals: number = 18): bigint {
  try {
    if (!value || value.trim() === '') {
      return 0n;
    }

    // Remove any non-numeric characters except decimal point
    const cleaned = value.replace(/[^\d.]/g, '');

    // Handle empty or invalid input
    if (!cleaned || cleaned === '.') {
      return 0n;
    }

    return parseUnits(cleaned, decimals);
  } catch (error) {
    console.error('parseUnitsSafe error:', error);
    return 0n;
  }
}

/**
 * Compare two BigInt values
 */
export function bnCompare(a: bigint, b: bigint): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Get minimum of two BigInt values
 */
export function bnMin(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

/**
 * Get maximum of two BigInt values
 */
export function bnMax(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

/**
 * Calculate percentage (returns in same units as input)
 * @param value - The value to calculate percentage of
 * @param percentage - Percentage (0-100)
 * @returns BigInt result
 */
export function bnPercentage(value: bigint, percentage: number): bigint {
  return (value * BigInt(Math.floor(percentage * 100))) / 10000n;
}

/**
 * Safe division with rounding
 * @param numerator - Numerator
 * @param denominator - Denominator
 * @param decimals - Number of decimals for precision
 * @returns BigInt result
 */
export function bnDivide(numerator: bigint, denominator: bigint, decimals: number = 18): bigint {
  if (denominator === 0n) return 0n;
  return (numerator * (10n ** BigInt(decimals))) / denominator;
}

/**
 * Check if a value is zero or near zero
 */
export function isZero(value: bigint): boolean {
  return value === 0n;
}

/**
 * Check if a value is positive
 */
export function isPositive(value: bigint): boolean {
  return value > 0n;
}
