'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GenericInput } from '@/components/ui/generic-input'
import { Separator } from '@/components/ui/separator'
import { useGoogleLogin, useLogin } from '@/hooks/use-auth'
import { useAuthStore } from '@/store/auth-store'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

export function LoginClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const router = useRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const login = useLogin()
  const googleLogin = useGoogleLogin()

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  const searchParams = useSearchParams()
  const redirect = useMemo(() => searchParams.get('redirect'), [searchParams])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

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
      router.push(redirect || '/')
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Login failed. Please check your credentials.'
      toast.error(errorMessage)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error('Google login failed: No credential received')
      return
    }

    try {
      await googleLogin.mutateAsync({
        token: credentialResponse.credential,
      })

      toast.success('Login successful!')
      router.push(redirect || '/')
    } catch (error: any) {
      if (error.userNotFound) {
        toast.error('Account not found. Please sign up first.')
        return
      }

      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Google login failed.'
      toast.error(errorMessage)
    }
  }

  const handleGoogleError = () => {
    toast.error('Google login failed. Please try again.')
  }

  const isLoading = login.isPending || googleLogin.isPending
  const hasGoogleClientId = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  return (
    <div className="min-h-full flex items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Massic</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasGoogleClientId && (
            <>
              <div className="flex justify-center">
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
              </div>

              <div className="flex items-center gap-4">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground uppercase">or</span>
                <Separator className="flex-1" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <GenericInput
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
            <GenericInput
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            {(login.isError || googleLogin.isError) && (
              <div className="text-sm text-destructive">
                {login.error?.message || googleLogin.error?.message || 'An error occurred'}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {login.isPending ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline hover:text-foreground">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
