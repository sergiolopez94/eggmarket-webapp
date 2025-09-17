'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Truck,
  Settings,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createCarter } from '@/lib/supabase/carters'

const carterSchema = z.object({
  name: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Please enter a valid email address'),

  // Status (manual control)
  status: z.enum(['active', 'inactive']).default('inactive'),

  // License Information (extracted fields)
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().optional(),
  dateOfBirth: z.string().optional(),
  licenseState: z.string().optional(),
  licenseClass: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  eyeColor: z.string().optional(),
  sex: z.string().optional(),
  address: z.string().optional(),
  restrictions: z.string().optional(),
  endorsements: z.string().optional(),

  carterCertExpiry: z.string().optional(),
  insuranceExpiry: z.string().optional(),
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
    trigger,
    getValues,
    control
  } = useForm<CarterFormData>({
    resolver: zodResolver(carterSchema),
    defaultValues: {
      status: 'inactive'
    }
  })

  // Track extracted fields for summary notification
  const [extractedFieldsCount, setExtractedFieldsCount] = useState(0)
  const [extractionConfidence, setExtractionConfidence] = useState<number | null>(null)

  // Watch form values for status eligibility checking
  const formValues = watch()

  // Check if carter is eligible to be active
  const canBeActive = (() => {
    // Must have basic info
    if (!formValues.name?.trim() || !formValues.lastName?.trim() || !formValues.phone?.trim() || !formValues.email?.trim()) {
      return false
    }

    // Must have license file (check if license files exist)
    if (licenseFiles.length === 0) {
      return false
    }

    // Check if any certificates are expired
    const now = new Date()
    const checkDate = (dateStr: string) => {
      if (!dateStr) return true // Optional fields
      const date = new Date(dateStr)
      return date > now
    }

    // Check all expiry dates if they exist
    if (formValues.licenseExpiry && !checkDate(formValues.licenseExpiry)) return false
    if (formValues.carterCertExpiry && !checkDate(formValues.carterCertExpiry)) return false
    if (formValues.insuranceExpiry && !checkDate(formValues.insuranceExpiry)) return false

    return true
  })()

  // Protected fields that shouldn't be overwritten if already filled
  const protectedFields = ['name', 'lastName', 'phone', 'email']

  // Handler for automatic field population from extraction
  const handleFieldExtracted = (fieldName: string, value: string, confidence?: number) => {
    const currentValues = getValues()

    // Check if this is a protected field that already has a value
    if (protectedFields.includes(fieldName)) {
      const currentValue = currentValues[fieldName as keyof CarterFormData]
      if (currentValue && currentValue.trim() !== '') {
        console.log(`Skipping extraction for ${fieldName} - field already has value: ${currentValue}`)
        return
      }
    }

    console.log(`Auto-populating ${fieldName} with value: ${value} (confidence: ${confidence})`)
    setValue(fieldName as keyof CarterFormData, value)

    // Trigger validation for the updated field
    trigger(fieldName as keyof CarterFormData)

    // Track extracted fields for summary
    setExtractedFieldsCount(prev => prev + 1)
    if (confidence && !extractionConfidence) {
      setExtractionConfidence(confidence)
    }

    // No individual field toasts - just update silently
  }

  // Show summary notification when extraction completes
  const handleExtractionComplete = () => {
    if (extractedFieldsCount > 0) {
      const confidenceText = extractionConfidence ? ` with ${Math.round(extractionConfidence * 100)}% confidence` : ''
      toast.success(`Document processed! ${extractedFieldsCount} fields auto-filled${confidenceText}`)
      // Reset counters
      setExtractedFieldsCount(0)
      setExtractionConfidence(null)
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
        license_expiry: data.licenseExpiry || null,
        carter_cert_expiry: data.carterCertExpiry || null,
        insurance_expiry: data.insuranceExpiry || null,
        status: data.status,
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

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="status">Status</Label>
                <div className="space-y-3">
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <Settings className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inactive">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              <span>Inactive</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="active" disabled={!canBeActive}>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span>Active</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />

                  {/* Status eligibility indicators */}
                  <div className="space-y-2">
                    {canBeActive ? (
                      <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                        <CheckCircle className="h-4 w-4" />
                        <span>Carter is eligible to be set as active</span>
                      </div>
                    ) : (
                      <div className="flex items-start space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="font-medium">Carter cannot be activated yet. Missing:</p>
                          <ul className="list-disc list-inside space-y-0.5 text-xs">
                            {!formValues.name?.trim() && <li>First name</li>}
                            {!formValues.lastName?.trim() && <li>Last name</li>}
                            {!formValues.phone?.trim() && <li>Phone number</li>}
                            {!formValues.email?.trim() && <li>Email address</li>}
                            {licenseFiles.length === 0 && <li>License file upload</li>}
                            {formValues.licenseExpiry && new Date(formValues.licenseExpiry) <= new Date() && <li>Valid license (expired)</li>}
                            {formValues.carterCertExpiry && new Date(formValues.carterCertExpiry) <= new Date() && <li>Valid carter certificate (expired)</li>}
                            {formValues.insuranceExpiry && new Date(formValues.insuranceExpiry) <= new Date() && <li>Valid insurance (expired)</li>}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
              Upload driving license - all fields will be auto-detected and populated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* File Upload Section */}
              <div className="space-y-4">
                <SmartFileUpload
                  documentType="license"
                  label="License File"
                  description="Upload PDF or image of driving license (max 5MB) - all information will be auto-extracted"
                  onFilesChange={setLicenseFiles}
                  onFieldExtracted={handleFieldExtracted}
                  onExtractionComplete={handleExtractionComplete}
                  formFieldMapping={{
                    // Core fields
                    licenseNumber: 'licenseNumber',
                    expirationDate: 'licenseExpiry',
                    dateOfBirth: 'dateOfBirth',
                    state: 'licenseState',
                    licenseClass: 'licenseClass',

                    // Personal details
                    firstName: 'name',
                    lastName: 'lastName',
                    height: 'height',
                    weight: 'weight',
                    eyeColor: 'eyeColor',
                    sex: 'sex',
                    address: 'address',

                    // License specifics
                    restrictions: 'restrictions',
                    endorsements: 'endorsements'
                  }}
                  autoPopulate={true}
                />
              </div>

              {/* License Information Fields */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">License Information</h3>

                {/* Primary License Fields */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input
                      id="licenseNumber"
                      {...register('licenseNumber')}
                      placeholder="Auto-filled from upload"
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licenseExpiry">License Expiry Date</Label>
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

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...register('dateOfBirth')}
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licenseState">License State</Label>
                    <Input
                      id="licenseState"
                      {...register('licenseState')}
                      placeholder="Auto-filled from upload"
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licenseClass">License Class</Label>
                    <Input
                      id="licenseClass"
                      {...register('licenseClass')}
                      placeholder="A, B, C, CDL, etc."
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      {...register('address')}
                      placeholder="Auto-filled from upload"
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                {/* Physical Characteristics */}
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="height">Height</Label>
                    <Input
                      id="height"
                      {...register('height')}
                      placeholder="e.g., 6-02"
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight</Label>
                    <Input
                      id="weight"
                      {...register('weight')}
                      placeholder="lbs"
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eyeColor">Eye Color</Label>
                    <Input
                      id="eyeColor"
                      {...register('eyeColor')}
                      placeholder="BRN, BLU, etc."
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sex">Sex</Label>
                    <Input
                      id="sex"
                      {...register('sex')}
                      placeholder="M/F"
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                {/* License Specifics */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="restrictions">Restrictions</Label>
                    <Input
                      id="restrictions"
                      {...register('restrictions')}
                      placeholder="NONE or specific restrictions"
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endorsements">Endorsements</Label>
                    <Input
                      id="endorsements"
                      {...register('endorsements')}
                      placeholder="HAZMAT, Passenger, etc."
                      className="bg-gray-50"
                    />
                  </div>
                </div>
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
                  <Label htmlFor="carterCertExpiry">Certificate Expiry Date</Label>
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

                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800">
                    <strong>✨ Smart Extraction Active:</strong> Expiration dates will be automatically detected and populated from uploaded documents.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <SmartFileUpload
                  documentType="carter_cert"
                  label="Carter Certificate File"
                  description="Upload PDF or image of carter certificate (max 5MB) - expiry date will be auto-detected"
                  onFilesChange={setCertFiles}
                  onFieldExtracted={handleFieldExtracted}
                  formFieldMapping={{
                    expirationDate: 'carterCertExpiry',
                    carterCertExpiry: 'carterCertExpiry'
                  }}
                  autoPopulate={true}
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
                  <Label htmlFor="insuranceExpiry">Insurance Expiry Date</Label>
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
                <SmartFileUpload
                  documentType="insurance"
                  label="Insurance File"
                  description="Upload PDF or image of insurance document (max 5MB) - expiry date will be auto-detected"
                  onFilesChange={setInsuranceFiles}
                  onFieldExtracted={handleFieldExtracted}
                  formFieldMapping={{
                    expirationDate: 'insuranceExpiry',
                    insuranceExpiry: 'insuranceExpiry'
                  }}
                  autoPopulate={true}
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