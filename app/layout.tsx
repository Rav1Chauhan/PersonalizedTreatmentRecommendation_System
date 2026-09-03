import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/auth-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Treatment Recommendation System',
  description: 'Educational clinical decision-support system using multi-LLM analysis and patient history',
  openGraph: {
    title: 'Treatment Recommendation System',
    description: 'Educational clinical decision-support system using multi-LLM analysis and patient history',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
