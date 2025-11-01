import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useChainReady } from '@/hooks';
import { formatAddress } from '@/utils';
import { Button } from './ui/Button';
import { Wallet, LogOut, AlertCircle } from 'lucide-react';

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { isWrongChain, switchToBSC, isSwitching } = useChainReady();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {isWrongChain && (
          <Button
            onClick={switchToBSC}
            variant="destructive"
            size="sm"
            disabled={isSwitching}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            {isSwitching ? 'Switching...' : 'Switch to BSC'}
          </Button>
        )}

        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary text-sm">
          <Wallet className="w-4 h-4" />
          {formatAddress(address)}
        </div>

        <Button onClick={() => disconnect()} variant="ghost" size="sm">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => {
        const connector = connectors[0];
        if (connector) {
          connect({ connector });
        }
      }}
    >
      <Wallet className="w-4 h-4 mr-2" />
      Connect Wallet
    </Button>
  );
}
