import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ToastProvider } from '@/components/ui/Toast'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CardCircle — Know who has the card you need',
  description:
    'A private directory of which cards your friends hold, so you can stop asking the group chat. CardCircle never stores card numbers or CVVs.',
  robots: {
    // Nothing here should ever be indexed: every page is behind a session
    // and describes real people's financial relationships.
    index: false,
    follow: false,
  },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
