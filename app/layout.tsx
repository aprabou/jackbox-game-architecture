import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'VersusAI',
  description: 'Rap Battle Between AI Models! Created with v0',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/versusai.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/versusai.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/versusai.png',
        type: 'image/png+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'VersusAI',
    description: 'Rap Battle Between AI Models! Created with v0',
    images: [
      {
        url: '/thumbnail.png',
        width: 1200,
        height: 630,
        alt: 'VersusAI - AI Rap Battle',
      }
    ], type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VersusAI',
    description: 'Rap Battle Between AI Models! Created with v0',
    images: ['/thumbnail.png'],
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
