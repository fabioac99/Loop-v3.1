import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LOOP - Inter-department Platform',
  description: 'Modern inter-department communication and request management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
