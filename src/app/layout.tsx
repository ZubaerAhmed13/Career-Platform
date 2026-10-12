import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { brand } from '@/lib/config';
export const metadata:Metadata={title:{default:brand.name,template:'%s | '+brand.name},description:brand.tagline};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body><ThemeProvider attribute="class" defaultTheme="system" enableSystem>{children}</ThemeProvider></body></html>}
