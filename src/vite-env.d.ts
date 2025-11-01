/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAIN_ID: string;
  readonly VITE_TOKEN_ADDRESS: string;
  readonly VITE_MASTERCHEF_ADDRESS: string;
  readonly VITE_CHARITY_WALLET: string;
  readonly VITE_PANBOO_BNB_PAIR: string;
  readonly VITE_API_URL: string;
  readonly VITE_RPC_URL: string;
  readonly VITE_WALLETCONNECT_ID: string;
  readonly VITE_ENABLE_LIVE_FEED: string;
  readonly VITE_ENABLE_FAKE_DATA: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
