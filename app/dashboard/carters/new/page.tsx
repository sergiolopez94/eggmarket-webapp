'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileUpload } from '@/components/ui/file-upload'
import { SmartFileUpload } from '@/components/ui/smart-file-upload'
import {
  ArrowLeft,
  Save,
  Phone,
  Mail,
  User,
  FileText,
  Calendar,
  Shield,
  Truck
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createCarter } from '@/lib/supabase/carters'

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

export default function NewCarterPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [licenseFiles, setLicenseFiles] = useState<File[]>([])
  const [certFiles, setCertFiles] = useState<File[]>([])
  const [insuranceFiles, setInsuranceFiles] = useState<File[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger
  } = useForm<CarterFormData>({
    resolver: zodResolver(carterSchema)
  })

  // Handler for automatic field population from extraction
  const handleFieldExtracted = (fieldName: string, value: string, confidence?: number) => {
    console.log(`Auto-populating ${fieldName} with value: ${value} (confidence: ${confidence})`)
    setValue(fieldName as keyof CarterFormData, value)

    // Trigger validation for the updated field
    trigger(fieldName as keyof CarterFormData)

    // Show user feedback about auto-population
    if (fieldName === 'licenseExpiry') {
      const confidenceText = confidence ? ` (${Math.round(confidence * 100)}% confidence)` : ''
      toast.success(`License expiry date auto-filled: ${value}${confidenceText}`)
    }
  }

  const onSubmit = async (data: CarterFormData) => {
    setSaving(true)
    try {
      // Create carter in database
      const carterData = {
        name: data.name,
        last_name: data.lastName,
        phone: data.phone,
        email: data.email,
        license_expiry: data.licenseExpiry,
        carter_cert_expiry: data.carterCertExpiry,
        insurance_expiry: data.insuranceExpiry,
        status: 'active' as const,
        // File paths will be handled by file upload later
        license_file_path: null,
        carter_cert_file_path: null,
        insurance_file_path: null,
        // Truck information
        truck_make: data.truckMake || null,
        truck_model: data.truckModel || null,
        truck_capacity: data.truckCapacity || null
      }

      await createCarter(carterData)

      toast.success('Carter created successfully!')

      // Redirect to carters list
      router.push('/dashboard/carters')
    } catch (error) {
      console.error('Error creating carter:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create carter. Please try again.'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

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
            <h1 className="text-3xl font-bold tracking-tight">Add New Carter</h1>
            <p className="text-muted-foreground">Create a new carter profile with all required documentation</p>
          </div>
        </div>
        <Button onClick={handleSubmit(onSubmit)} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Creating...' : 'Create Carter'}
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
              Enter basic contact details and personal information
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
              Upload driving license and set expiry date
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
                </div>
              </div>

              <div className="space-y-2">
                <SmartFileUpload
                  documentType="license"
                  label="License File *"
                  description="Upload PDF or image of driving license (max 5MB) - expiry date will be auto-detected"
                  onFilesChange={setLicenseFiles}
                  onFieldExtracted={handleFieldExtracted}
                  formFieldMapping={{
                    expirationDate: 'licenseExpiry',
                    licenseExpiry: 'licenseExpiry'
                  }}
                  autoPopulate={true}
                />
              </div>
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
              Upload carter certificate and set expiry date
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
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Automatic extraction is available for licenses above. Carter certificate extraction will be added in the next phase.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <FileUpload
                  label="Carter Certificate File *"
                  description="Upload PDF or image of carter certificate (max 5MB)"
                  onFilesChange={setCertFiles}
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
              Upload insurance document and set expiry date
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
                </div>
              </div>

              <div className="space-y-2">
                <FileUpload
                  label="Insurance File *"
                  description="Upload PDF or image of insurance document (max 5MB)"
                  onFilesChange={setInsuranceFiles}
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
              Vehicle details and specifications (optional)
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
          </CardContent>
        </Card>

        {/* Create Button */}
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/carters')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Creating...' : 'Create Carter'}
          </Button>
        </div>
      </form>
    </div>
  )
}