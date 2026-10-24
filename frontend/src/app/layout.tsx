import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SafeAgent Treasury | Autonomous AI Smart Account & Policy Engine',
  description: 'Owner-constrained ERC-4337 smart account giving AI agents restricted sub-keys enforced by on-chain policies.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#FAF8F5] text-stone-900 min-h-screen antialiased selection:bg-stone-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}

