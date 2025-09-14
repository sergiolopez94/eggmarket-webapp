'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Route,
  Settings,
  LogOut,
  Truck
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Carters', href: '/dashboard/carters', icon: Truck },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText },
  { name: 'Orders', href: '/dashboard/orders', icon: Package },
  { name: 'Routes', href: '/dashboard/routes', icon: Route },
]

const adminNavigation = [
  { name: 'User Management', href: '/dashboard/admin/users', icon: Users },
  { name: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  // For internal app - assuming admin permissions for now
  const canManageUsers = true

  return (
    <div className="flex h-screen w-64 flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
        <h1 className="text-xl font-bold text-primary">Egg Market</h1>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              Admin User
            </p>
            <div className="flex items-center space-x-2">
              <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                getRoleColor('admin')
              )}>
                admin
              </span>
              <span className="text-xs text-muted-foreground">
                Internal App
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                )}
              />
              {item.name}
            </Link>
          )
        })}

        {/* Admin Section */}
        {canManageUsers && (
          <>
            <div className="pt-4">
              <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Administration
              </h3>
            </div>
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                    )}
                  />
                  {item.name}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* System Info */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          Egg Market Internal Dashboard
        </div>
      </div>
    </div>
  )
}

function getRoleColor(role: string): string {
  const roleColors = {
    admin: "bg-blue-800 text-white",
    manager: "bg-blue-500 text-white",
    salesperson: "bg-blue-400 text-white",
    viewer: "bg-neutral-500 text-white"
  }
  return roleColors[role as keyof typeof roleColors] || roleColors.viewer
}