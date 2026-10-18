import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MiniMakerDAO | Collateralized Stablecoin Vaults',
  description: 'Deposit ETH/WETH collateral, mint dEngine tokens, and manage CDP health factor in a high-contrast dark dashboard.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#09090b] text-zinc-100 antialiased min-h-screen selection:bg-zinc-700 selection:text-white`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}