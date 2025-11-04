import { Link, useLocation } from 'react-router-dom';
import { WalletConnectButton } from './WalletConnectButton';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from './ThemeProvider';
import { cn } from '@/lib/utils';
import { useAccount, useReadContract } from 'wagmi';
import { ADDRESSES } from '@/contracts/addresses';
import { PANBOO_TOKEN_ABI } from '@/contracts/abis';
import { Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const location = useLocation();
  const { address, isConnected } = useAccount();
  const { theme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Read contract owner
  const { data: contractOwner } = useReadContract({
    address: ADDRESSES.PANBOO_TOKEN,
    abi: PANBOO_TOKEN_ABI,
    functionName: 'owner',
  });

  // Check if user is owner (or development mode)
  const isDevelopmentMode = ADDRESSES.PANBOO_TOKEN === '0x0000000000000000000000000000000000000000';
  const isOwner = isConnected && address && (
    (contractOwner && address.toLowerCase() === (contractOwner as string).toLowerCase()) ||
    isDevelopmentMode
  );

  // Logo based on theme
  const logo = theme === 'dark' ? '/156x40_light.svg' : '/156x40.svg';

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/swap', label: 'Swap' },
    { path: '/farms', label: 'Farms' },
    { path: '/charity', label: 'Charity' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/leaderboard', label: 'Leaderboard' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Panboo" className="h-8" />
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

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <WalletConnectButton />

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-accent rounded-md"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container mx-auto px-4 py-4 flex flex-col space-y-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'text-base font-medium transition-colors hover:text-[#00C48C] py-2',
                    isActive ? 'text-[#00C48C]' : 'text-foreground/60'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Admin link (owner only) */}
            {isOwner && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'text-base font-medium transition-colors hover:text-[#00C48C] py-2 flex items-center gap-2',
                  location.pathname === '/admin' ? 'text-[#00C48C]' : 'text-foreground/60'
                )}
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
