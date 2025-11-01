import { useQuery } from '@tanstack/react-query';

/**
 * Get BNB/USD price from a public API
 * Gracefully degrades if the API is unavailable
 */
export function useBnbUsd() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bnbPrice'],
    queryFn: async () => {
      try {
        // Try CoinGecko first
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd'
        );

        if (!response.ok) {
          throw new Error('CoinGecko API failed');
        }

        const data = await response.json();
        return data.binancecoin.usd as number;
      } catch (error) {
        console.warn('CoinGecko failed, trying fallback...');

        // Fallback to Binance API
        try {
          const response = await fetch(
            'https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT'
          );

          if (!response.ok) {
            throw new Error('Binance API failed');
          }

          const data = await response.json();
          return parseFloat(data.price);
        } catch (fallbackError) {
          console.error('All BNB price APIs failed:', fallbackError);
          // Return a reasonable fallback value
          return 320; // Approximate BNB price
        }
      }
    },
    staleTime: 30000, // 30 seconds
    gcTime: 120000, // 2 minutes
    retry: 2,
    retryDelay: 1000,
  });

  return {
    data: data || 320, // Fallback to $320 if all fails
    isLoading,
    error,
    isFallback: error !== null, // Indicate if we're using fallback
  };
}

/**
 * Hook to check if we should show BNB-only values (when USD price unavailable)
 */
export function useShouldShowBnbOnly() {
  const { isFallback, error } = useBnbUsd();

  return {
    shouldShowBnbOnly: Boolean(error && isFallback),
  };
}
