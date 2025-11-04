import { http, createConfig } from 'wagmi';
import { bsc, bscTestnet } from './chains';
import { walletConnect, injected } from 'wagmi/connectors';
import { ENV } from '@/contracts/addresses';

// Create wagmi config
export const config = createConfig({
  chains: [bsc, bscTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    walletConnect({
      projectId: ENV.WALLETCONNECT_ID || 'demo-project-id',
      metadata: {
        name: 'Panboo',
        description: 'Transparent DeFi for Charity',
        url: 'https://panboo.xzy',
        icons: ['https://panboo.xzy/logo.png'],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [bsc.id]: http('https://bsc-dataseed.binance.org'),
    [bscTestnet.id]: http('https://data-seed-prebsc-1-s1.binance.org:8545'),
  },
  ssr: false,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
