import './globals.css'
import { Montserrat } from 'next/font/google'

const montserrat = Montserrat({ 
  subsets: ['latin'],
  weight: '300',
})

export const metadata = {
  title: 'Adam Bechtold',
  description: 'Learn about the man, the myth, the legend...',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={montserrat.className}>{children}</body>
    </html>
  )
}
