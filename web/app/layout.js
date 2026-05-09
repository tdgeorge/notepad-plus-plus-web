import './globals.css'

export const metadata = {
  title: 'glitch.txt',
  description: 'glitch.txt - a web-based text editor inspired by Notepad++',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
