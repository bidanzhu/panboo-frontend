import { ExternalLink } from 'lucide-react';

export function Footer() {
  const links = [
    { label: 'BscScan', url: 'https://bscscan.com' },
    { label: 'GitHub', url: 'https://github.com' },
    { label: 'Telegram', url: 'https://t.me' },
    { label: 'Twitter', url: 'https://twitter.com' },
    { label: 'Docs', url: '#' },
  ];

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 Panboo - Transparent DeFi for Charity
          </p>

          <div className="flex items-center gap-6">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                {link.label}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
