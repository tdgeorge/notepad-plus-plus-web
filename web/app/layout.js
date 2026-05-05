import './globals.css'

export const metadata = {
  title: 'Notepad++ Web',
  description: 'Notepad++ recreated as a JavaScript web application',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
