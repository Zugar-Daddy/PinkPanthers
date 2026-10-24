import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SafeAgent Treasury',
  description: 'Local demo of an agent wallet and policy controls; no blockchain transactions are submitted.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#faf9f6] text-stone-900 min-h-screen antialiased selection:bg-[#123b32] selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

