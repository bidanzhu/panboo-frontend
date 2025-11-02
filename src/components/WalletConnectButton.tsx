import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useChainReady } from '@/hooks';
import { formatAddress } from '@/utils';
import { Button } from './ui/Button';
import { Wallet, LogOut, AlertCircle, X } from 'lucide-react';

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { isWrongChain, switchToBSC, isSwitching } = useChainReady();
  const [showModal, setShowModal] = useState(false);

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
    <>
      <Button onClick={() => setShowModal(true)}>
        <Wallet className="w-4 h-4 mr-2" />
        Connect Wallet
      </Button>

      {/* Wallet Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal */}
          <div className="relative z-10 bg-card border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Connect Wallet</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-secondary rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Wallet Options */}
            <div className="space-y-3">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => {
                    connect({ connector });
                    setShowModal(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#00C48C]/10 flex items-center justify-center group-hover:bg-[#00C48C]/20 transition-colors">
                    <Wallet className="w-5 h-5 text-[#00C48C]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{connector.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {connector.name === 'Injected' && 'Browser Extension (MetaMask, TrustWallet, etc.)'}
                      {connector.name === 'WalletConnect' && 'Scan with mobile wallet app'}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer Note */}
            <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
              <p className="text-xs text-blue-300">
                <strong className="text-blue-400">💡 Tip:</strong> If you see TrustWallet instead of MetaMask,
                disable TrustWallet extension in your browser settings and refresh.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
