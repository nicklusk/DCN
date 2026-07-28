import NotificationListener from '@/components/NotificationListener'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NotificationListener />
        {children}
      </body>
    </html>
  )
}