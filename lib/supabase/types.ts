export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          inflow_api_key: string | null
          inflow_api_url: string | null
          settings: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          inflow_api_key?: string | null
          inflow_api_url?: string | null
          settings?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          inflow_api_key?: string | null
          inflow_api_url?: string | null
          settings?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          name: string | null
          role: 'admin' | 'manager' | 'salesperson' | 'viewer'
          company_id: string | null
          inflow_teammember_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          role?: 'admin' | 'manager' | 'salesperson' | 'viewer'
          company_id?: string | null
          inflow_teammember_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          role?: 'admin' | 'manager' | 'salesperson' | 'viewer'
          company_id?: string | null
          inflow_teammember_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          company_id: string
          name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          category: string | null
          expiration_date: string | null
          uploaded_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          category?: string | null
          expiration_date?: string | null
          uploaded_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          category?: string | null
          expiration_date?: string | null
          uploaded_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      carters: {
        Row: {
          id: string
          name: string
          last_name: string
          phone: string
          email: string
          status: 'active' | 'inactive'
          license_expiry: string | null
          carter_cert_expiry: string | null
          insurance_expiry: string | null
          license_file_path: string | null
          carter_cert_file_path: string | null
          insurance_file_path: string | null
          truck_make: string | null
          truck_model: string | null
          truck_capacity: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          last_name: string
          phone: string
          email: string
          status?: 'active' | 'inactive'
          license_expiry?: string | null
          carter_cert_expiry?: string | null
          insurance_expiry?: string | null
          license_file_path?: string | null
          carter_cert_file_path?: string | null
          insurance_file_path?: string | null
          truck_make?: string | null
          truck_model?: string | null
          truck_capacity?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          last_name?: string
          phone?: string
          email?: string
          status?: 'active' | 'inactive'
          license_expiry?: string | null
          carter_cert_expiry?: string | null
          insurance_expiry?: string | null
          license_file_path?: string | null
          carter_cert_file_path?: string | null
          insurance_file_path?: string | null
          truck_make?: string | null
          truck_model?: string | null
          truck_capacity?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}