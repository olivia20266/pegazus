import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pegazus — Trading AI Platform',
  description: 'Pegazus — Plateforme de trading haute fréquence alimentée par l\'IA',
  icons: {
    icon:  '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title:       'Pegazus — Trading AI Platform',
    description: 'Plateforme de trading haute fréquence alimentée par l\'IA',
    images:      ['/logo.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0c0f1a',
              color:      '#edf0f7',
              border:     '1px solid rgba(255,255,255,0.07)',
            }
          }}
        />
      </body>
    </html>
  )
}
