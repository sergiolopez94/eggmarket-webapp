'use client'

import { Sidebar } from '@/components/dashboard/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Simplified layout for internal app - no auth required for now
  // TODO: Add proper authentication later when needed

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {/* Header for internal app */}
          <div className="border-b border-border bg-card">
            <div className="container mx-auto px-6 py-3 flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Egg Market Internal Dashboard
              </div>
              <div className="text-sm text-muted-foreground">
                Development Mode
              </div>
            </div>
          </div>
          <div className="container mx-auto px-6 py-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}