'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GenericInput } from '@/components/ui/generic-input'
import { useLogin } from '@/hooks/use-auth'
import { useAuthStore } from '@/store/auth-store'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

// use react hook form

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const login = useLogin()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Validate inputs
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      await login.mutateAsync({
        email,
        password,
      })
      
      toast.success('Login successful!')
      router.push('/')
    } catch (error: any) {
      // Handle error - show user-friendly message
      const errorMessage = 
        error?.response?.data?.message || 
        error?.message || 
        'Login failed. Please check your credentials.'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <GenericInput
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={login.isPending}
            />
            <GenericInput
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={login.isPending}
            />
            {login.isError && (
              <div className="text-sm text-destructive">
                {login.error?.message || 'An error occurred'}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full"
              disabled={login.isPending}
            >
              {login.isPending ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

