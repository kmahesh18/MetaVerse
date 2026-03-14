import type { Metadata } from 'next';
import { Silkscreen, Space_Grotesk } from 'next/font/google';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import './globals.css';

const displayFont = Silkscreen({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '700'],
});

const bodyFont = Space_Grotesk({
  variable: '--font-body',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Metaverse — Virtual Workspace',
  description: '2D virtual workspace platform with real-time collaboration',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${displayFont.variable} ${bodyFont.variable} bg-background text-foreground antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
