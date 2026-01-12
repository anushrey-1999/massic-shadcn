import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen ">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className='flex items-center gap-3'>
            
        <h1 className="text-6xl font-bold ">404</h1>
        <p className="text-xl ">Page not found</p>
        </div>
        <Link href="/">
          <Button variant="link" size="lg">
           Back to Home
          </Button>
        </Link>
      </div>
    </div>
  )
}