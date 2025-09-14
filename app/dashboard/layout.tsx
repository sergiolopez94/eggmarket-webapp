'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { LoginForm } from '@/components/auth/LoginForm'
import { Card, CardContent } from '@/components/ui/card'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-lg font-medium">Loading...</div>
            <div className="text-sm text-muted-foreground mt-2">
              Setting up your dashboard
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  // Show message if user has no company assignment
  if (!profile?.company_id && profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-lg font-medium">Account Pending</div>
            <div className="text-sm text-muted-foreground mt-2">
              Your account is being reviewed. An admin will assign you to a company and role shortly.
            </div>
            <div className="text-xs text-muted-foreground mt-4">
              Signed in as: {profile?.email}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="container mx-auto px-6 py-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}