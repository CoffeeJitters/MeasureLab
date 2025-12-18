import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MeasureLab - Measurement Tool',
  description: 'Professional measurement and takeoff tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

