'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from './AuthProvider'

export function LoginForm() {
  const { signInWithGoogle, loading } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            Egg Market Solutions
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Loading...' : 'Continue with Google'}
          </Button>
          <p className="text-sm text-muted-foreground text-center mt-4">
            First time? You'll be assigned a viewer role. Contact your admin for elevated permissions.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}