'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Truck,
  FileText,
  Loader2
} from 'lucide-react'
import { getAllCarters, getCarterStats, type CarterWithStats } from '@/lib/supabase/carters'
import { toast } from 'react-hot-toast'

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-500 text-white'
    case 'inactive':
      return 'bg-gray-500 text-white'
    default:
      return 'bg-neutral-500 text-white'
  }
}

function isExpiringSoon(date: string) {
  const expiry = new Date(date)
  const today = new Date()
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  return expiry <= thirtyDaysFromNow && expiry >= today
}

function isExpired(date: string) {
  const expiry = new Date(date)
  const today = new Date()
  return expiry < today
}

export default function CartersPage() {
  const [carters, setCarters] = useState<CarterWithStats[]>([])
  const [stats, setStats] = useState({
    totalCarters: 0,
    activeCarters: 0,
    completeProfiles: 0,
    expiringDocuments: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCarters()
  }, [])

  const loadCarters = async () => {
    try {
      setLoading(true)
      setError(null)

      const [cartersData, statsData] = await Promise.all([
        getAllCarters(),
        getCarterStats()
      ])

      setCarters(cartersData)
      setStats(statsData)
    } catch (err) {
      console.error('Error loading carters:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load carters'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading carters...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
          <h3 className="mt-2 text-lg font-semibold">Error Loading Carters</h3>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={loadCarters}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Carters Management</h1>
          <p className="text-muted-foreground">
            Manage your delivery drivers and their documentation
          </p>
        </div>
        <Link href="/dashboard/carters/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Carter
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Carters</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCarters}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeCarters} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Carters</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCarters}</div>
            <p className="text-xs text-muted-foreground">
              Ready for assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Documents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Within 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complete Profiles</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completeProfiles}</div>
            <p className="text-xs text-muted-foreground">
              All documents uploaded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Carters List */}
      <Card>
        <CardHeader>
          <CardTitle>All Carters</CardTitle>
          <CardDescription>
            Click on a carter to view and edit their profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {carters.map((carter) => (
              <Link
                key={carter.id}
                href={`/dashboard/carters/${carter.id}`}
                className="block"
              >
                <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-foreground">
                          {carter.name.charAt(0)}{carter.last_name.charAt(0)}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-foreground">
                          {carter.name} {carter.last_name}
                        </h3>
                        <Badge className={getStatusColor(carter.status)}>
                          {carter.status}
                        </Badge>
                        {!carter.documentsComplete && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            Incomplete Documents
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{carter.phone}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{carter.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Document status indicators */}
                    <div className="flex space-x-1">
                      {/* License */}
                      <div className="flex items-center space-x-1">
                        {isExpired(carter.license_expiry) ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" title="License expired" />
                        ) : isExpiringSoon(carter.license_expiry) ? (
                          <AlertTriangle className="h-4 w-4 text-orange-500" title="License expiring soon" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" title="License valid" />
                        )}
                      </div>

                      {/* Carter Certificate */}
                      <div className="flex items-center space-x-1">
                        {isExpired(carter.carter_cert_expiry) ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" title="Certificate expired" />
                        ) : isExpiringSoon(carter.carter_cert_expiry) ? (
                          <AlertTriangle className="h-4 w-4 text-orange-500" title="Certificate expiring soon" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" title="Certificate valid" />
                        )}
                      </div>

                      {/* Insurance */}
                      <div className="flex items-center space-x-1">
                        {isExpired(carter.insurance_expiry) ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" title="Insurance expired" />
                        ) : isExpiringSoon(carter.insurance_expiry) ? (
                          <AlertTriangle className="h-4 w-4 text-orange-500" title="Insurance expiring soon" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" title="Insurance valid" />
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>License: {new Date(carter.license_expiry).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {carters.length === 0 && (
              <div className="text-center py-12">
                <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-foreground">No carters</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Get started by adding your first carter.
                </p>
                <div className="mt-6">
                  <Link href="/dashboard/carters/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Carter
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}