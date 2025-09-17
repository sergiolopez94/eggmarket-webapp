'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { FileUpload } from '@/components/ui/file-upload'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Save,
  Phone,
  Mail,
  User,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Shield,
  Truck
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getCarterById, updateCarter, type CarterWithStats } from '@/lib/supabase/carters'
import { getDocumentPublicUrl } from '@/lib/supabase/storage'

const carterSchema = z.object({
  name: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Please enter a valid email address'),
  licenseExpiry: z.string().min(1, 'License expiry date is required'),
  carterCertExpiry: z.string().min(1, 'Carter certificate expiry date is required'),
  insuranceExpiry: z.string().min(1, 'Insurance expiry date is required'),
  truckMake: z.string().optional(),
  truckModel: z.string().optional(),
  truckCapacity: z.string().optional(),
})

type CarterFormData = z.infer<typeof carterSchema>

function isExpiringSoon(date: string) {
  const expiry = new Date(date)
  const today = new Date()
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  return expiry <= thirtyDaysFromNow
}

function isExpired(date: string) {
  const expiry = new Date(date)
  const today = new Date()
  return expiry < today
}

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

export default function CarterProfilePage() {
  const params = useParams()
  const router = useRouter()
  const carterId = params.id as string

  const [carter, setCarter] = useState<CarterWithStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [licenseFiles, setLicenseFiles] = useState<File[]>([])
  const [certFiles, setCertFiles] = useState<File[]>([])
  const [insuranceFiles, setInsuranceFiles] = useState<File[]>([])

  const [licenseImageUrl, setLicenseImageUrl] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<CarterFormData>({
    resolver: zodResolver(carterSchema)
  })

  useEffect(() => {
    const loadCarter = async () => {
      try {
        setLoading(true)
        const carterData = await getCarterById(carterId)

        if (carterData) {
          setCarter(carterData)
          setValue('name', carterData.name)
          setValue('lastName', carterData.last_name)
          setValue('phone', carterData.phone)
          setValue('email', carterData.email)
          setValue('licenseExpiry', carterData.license_expiry)
          setValue('carterCertExpiry', carterData.carter_cert_expiry)
          setValue('insuranceExpiry', carterData.insurance_expiry)
          setValue('truckMake', carterData.truck_make || '')
          setValue('truckModel', carterData.truck_model || '')
          setValue('truckCapacity', carterData.truck_capacity || '')

          // Load license image URL if license file exists
          if (carterData.license_file_path) {
            try {
              const imageUrl = await getDocumentPublicUrl(carterData.license_file_path, 'license')
              setLicenseImageUrl(imageUrl)
            } catch (error) {
              console.error('Failed to load license image:', error)
            }
          }
        }
      } catch (error) {
        console.error('Error loading carter:', error)
        toast.error('Failed to load carter data')
      } finally {
        setLoading(false)
      }
    }

    loadCarter()
  }, [carterId, setValue])

  const onSubmit = async (data: CarterFormData) => {
    setSaving(true)
    try {
      const updateData = {
        name: data.name,
        last_name: data.lastName,
        phone: data.phone,
        email: data.email,
        license_expiry: data.licenseExpiry,
        carter_cert_expiry: data.carterCertExpiry,
        insurance_expiry: data.insuranceExpiry,
        truck_make: data.truckMake || null,
        truck_model: data.truckModel || null,
        truck_capacity: data.truckCapacity || null,
      }

      const updatedCarter = await updateCarter(carterId, updateData)

      toast.success('Carter profile updated successfully!')

      // Reload the carter data to get computed fields
      const refreshedData = await getCarterById(carterId)
      if (refreshedData) {
        setCarter(refreshedData)
      }
    } catch (error) {
      console.error('Error updating carter:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update carter profile. Please try again.'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading carter profile...</p>
        </div>
      </div>
    )
  }

  if (!carter) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Carter not found</h2>
          <p className="text-sm text-muted-foreground">The carter you're looking for doesn't exist.</p>
          <Button className="mt-4" onClick={() => router.push('/dashboard/carters')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Carters
          </Button>
        </div>
      </div>
    )
  }

  const watchedData = watch()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/carters')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Carters
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {carter.name} {carter.last_name}
            </h1>
            <p className="text-muted-foreground">Carter Profile</p>
          </div>
          <Badge className={getStatusColor(carter.status)}>
            {carter.status}
          </Badge>
        </div>
        <Button onClick={handleSubmit(onSubmit)} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Basic Information</span>
            </CardTitle>
            <CardDescription>
              Basic contact details and personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">First Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Enter first name"
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    className="pl-10"
                    {...register('phone')}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-10"
                    {...register('email')}
                    placeholder="email@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* License Documentation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>License Documentation</span>
            </CardTitle>
            <CardDescription>
              Upload and manage driving license information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseExpiry">License Expiry Date *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="licenseExpiry"
                      type="date"
                      className="pl-10"
                      {...register('licenseExpiry')}
                    />
                  </div>
                  {errors.licenseExpiry && (
                    <p className="text-sm text-red-600">{errors.licenseExpiry.message}</p>
                  )}

                  {watchedData.licenseExpiry && (
                    <div className="flex items-center space-x-2">
                      {isExpired(watchedData.licenseExpiry) ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-600">License expired</span>
                        </>
                      ) : isExpiringSoon(watchedData.licenseExpiry) ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-orange-600">License expiring soon</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">License valid</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <FileUpload
                  label="License File"
                  description="Upload PDF or image of driving license (max 5MB)"
                  onFilesChange={setLicenseFiles}
                  existingFile={carter.license_file_path}
                />
              </div>

              {/* License Image Display - spans across grid */}
              {licenseImageUrl && (
                <div className="space-y-2 md:col-span-2">
                  <Label>License Image</Label>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <img
                      src={licenseImageUrl}
                      alt="Driver License"
                      className="max-w-full h-auto max-h-96 mx-auto rounded border shadow-sm hover:shadow-md transition-shadow"
                      onClick={() => window.open(licenseImageUrl, '_blank')}
                      style={{ cursor: 'pointer' }}
                    />
                    <p className="text-sm text-gray-600 text-center mt-2">
                      Click to view full size
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Carter Certificate Documentation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Truck className="h-5 w-5" />
              <span>Carter Certificate</span>
            </CardTitle>
            <CardDescription>
              Upload and manage carter certificate information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="carterCertExpiry">Certificate Expiry Date *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="carterCertExpiry"
                      type="date"
                      className="pl-10"
                      {...register('carterCertExpiry')}
                    />
                  </div>
                  {errors.carterCertExpiry && (
                    <p className="text-sm text-red-600">{errors.carterCertExpiry.message}</p>
                  )}

                  {watchedData.carterCertExpiry && (
                    <div className="flex items-center space-x-2">
                      {isExpired(watchedData.carterCertExpiry) ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-600">Certificate expired</span>
                        </>
                      ) : isExpiringSoon(watchedData.carterCertExpiry) ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-orange-600">Certificate expiring soon</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">Certificate valid</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Unstract integration will be added later to automatically extract expiry dates from uploaded documents.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <FileUpload
                  label="Carter Certificate File"
                  description="Upload PDF or image of carter certificate (max 5MB)"
                  onFilesChange={setCertFiles}
                  existingFile={carter.carter_cert_file_path}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insurance Documentation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Insurance Documentation</span>
            </CardTitle>
            <CardDescription>
              Upload and manage insurance information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="insuranceExpiry">Insurance Expiry Date *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="insuranceExpiry"
                      type="date"
                      className="pl-10"
                      {...register('insuranceExpiry')}
                    />
                  </div>
                  {errors.insuranceExpiry && (
                    <p className="text-sm text-red-600">{errors.insuranceExpiry.message}</p>
                  )}

                  {watchedData.insuranceExpiry && (
                    <div className="flex items-center space-x-2">
                      {isExpired(watchedData.insuranceExpiry) ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-600">Insurance expired</span>
                        </>
                      ) : isExpiringSoon(watchedData.insuranceExpiry) ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-orange-600">Insurance expiring soon</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">Insurance valid</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <FileUpload
                  label="Insurance File"
                  description="Upload PDF or image of insurance document (max 5MB)"
                  onFilesChange={setInsuranceFiles}
                  existingFile={carter.insurance_file_path}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Truck Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Truck className="h-5 w-5" />
              <span>Truck Information</span>
            </CardTitle>
            <CardDescription>
              Vehicle details and specifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="truckMake">Truck Make</Label>
                <Input
                  id="truckMake"
                  {...register('truckMake')}
                  placeholder="e.g. Ford, Chevrolet, Isuzu"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="truckModel">Truck Model</Label>
                <Input
                  id="truckModel"
                  {...register('truckModel')}
                  placeholder="e.g. Transit, Express, NPR"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="truckCapacity">Capacity</Label>
                <Input
                  id="truckCapacity"
                  {...register('truckCapacity')}
                  placeholder="e.g. 1 ton, 2.5 tons, 5000 lbs"
                />
              </div>
            </div>

            {(watchedData.truckMake || watchedData.truckModel || watchedData.truckCapacity) && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Vehicle Summary:</strong>{' '}
                  {[watchedData.truckMake, watchedData.truckModel, watchedData.truckCapacity]
                    .filter(Boolean)
                    .join(' - ') || 'No vehicle information entered'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}