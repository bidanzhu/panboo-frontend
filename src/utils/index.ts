// Export all utilities
export * from './bn';
export * from './formatters';
export * from './calculations';

// Utility helper functions
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getBscScanUrl(txHash: string, type: 'tx' | 'address' | 'token' = 'tx'): string {
  const baseUrl = 'https://bscscan.com';

  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${txHash}`;
    case 'address':
      return `${baseUrl}/address/${txHash}`;
    case 'token':
      return `${baseUrl}/token/${txHash}`;
    default:
      return baseUrl;
  }
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function isSameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
