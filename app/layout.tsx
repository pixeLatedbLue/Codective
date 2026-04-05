import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CodeLens — Code Quality Analyzer',
  description: 'Analyze code quality, bug risk, and complexity metrics for 15+ languages',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}