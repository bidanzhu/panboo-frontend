import { Link, useLocation } from 'react-router-dom';
import { WalletConnectButton } from './WalletConnectButton';
import { cn } from '@/lib/utils';
import { useAccount, useReadContract } from 'wagmi';
import { ADDRESSES } from '@/contracts/addresses';
import { PANBOO_TOKEN_ABI } from '@/contracts/abis';
import { Shield } from 'lucide-react';

export function Header() {
  const location = useLocation();
  const { address, isConnected } = useAccount();

  // Read contract owner
  const { data: contractOwner } = useReadContract({
    address: ADDRESSES.PANBOO_TOKEN,
    abi: PANBOO_TOKEN_ABI,
    functionName: 'owner',
  });

  // Check if user is owner
  const isOwner = isConnected && address && contractOwner &&
    address.toLowerCase() === (contractOwner as string).toLowerCase();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/swap', label: 'Swap' },
    { path: '/farms', label: 'Farms' },
    { path: '/charity', label: 'Charity' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/panboo.png" alt="Panboo" className="w-10 h-10" />
            <span className="font-bold text-xl">Panboo</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-[#00C48C] relative pb-1',
                    isActive
                      ? 'text-[#00C48C]'
                      : 'text-foreground/60'
                  )}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00C48C]" />
                  )}
                </Link>
              );
            })}

            {/* Admin link (owner only) */}
            {isOwner ? (
              <Link
                to="/admin"
                className={cn(
                  'text-sm font-medium transition-colors hover:text-[#00C48C] relative pb-1 flex items-center gap-1',
                  location.pathname === '/admin'
                    ? 'text-[#00C48C]'
                    : 'text-foreground/60'
                )}
              >
                <Shield className="w-4 h-4" />
                Admin
                {location.pathname === '/admin' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00C48C]" />
                )}
              </Link>
            ) : null}
          </nav>
        </div>

        <WalletConnectButton />
      </div>
    </header>
  );
}
