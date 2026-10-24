import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentSafe | ERC-4337 AI Agent Smart Wallet & Spending Guardrails',
  description: 'Owner-constrained ERC-4337 smart account giving AI agents restricted sub-keys enforced by on-chain policies.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-canvas text-neoBlack min-h-screen antialiased selection:bg-neoRed selection:text-white">
        {children}
      </body>
    </html>
  );
}
