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
        url: 'https://panboo.org',
        icons: ['https://panboo.org/logo.png'],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [bsc.id]: http(ENV.RPC_URL),
    [bscTestnet.id]: http(),
  },
  ssr: false,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
