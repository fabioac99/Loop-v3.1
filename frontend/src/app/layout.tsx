import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LOOP',
  description: 'Modern inter-department communication and request management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><title>LOOP</title>
        <link rel="icon" href="favicon.ico" type="image/x-icon">
        </link>

      </head>

      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
