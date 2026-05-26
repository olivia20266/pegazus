export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:               string
          first_name:       string
          last_name:        string
          phone:            string | null
          birth_date:       string | null
          nationality:      string | null
          country:          string | null
          learning_id:      string | null
          leverage:         string
          security_q:       string | null
          security_a:       string | null
          kyc_status:       'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
          kyc_verified_at:  string | null
          status:           'ACTIVE' | 'LOCKED' | 'SUSPENDED'
          role:             'USER' | 'ADMIN' | 'SUPERADMIN'
          login_attempts:   number
          last_login_at:    string | null
          created_at:       string
          updated_at:       string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      wallets: {
        Row: {
          id:               string
          user_id:          string
          balance:          number
          equity:           number
          margin:           number
          free_margin:      number
          floating_pl:      number
          learning_balance: number
          currency:         string
          mt5_login:        string
          mt5_server:       string
          created_at:       string
          updated_at:       string
        }
        Insert: Partial<Database['public']['Tables']['wallets']['Row']> & { user_id: string; mt5_login: string }
        Update: Partial<Database['public']['Tables']['wallets']['Row']>
      }
      transactions: {
        Row: {
          id:           string
          user_id:      string
          type:         'DEPOSIT' | 'WITHDRAWAL' | 'MANUAL_ADJUSTMENT' | 'FEE' | 'TRADE'
          adjust_type:  'CREDIT' | 'DEBIT' | null
          amount:       number
          currency:     string
          status:       'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
          source:       string | null
          destination:  string | null
          description:  string | null
          admin_note:   string | null
          admin_id:     string | null
          reference:    string | null
          reason:       string | null
          created_at:   string
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Row']>
      }
      kyc_documents: {
        Row: {
          id:               string
          user_id:          string
          document_type:    string
          document_number:  string | null
          front_file_url:   string | null
          address_file_url: string | null
          status:           'PENDING' | 'VERIFIED' | 'REJECTED'
          admin_note:       string | null
          rejection_reason: string | null
          submitted_at:     string
          reviewed_at:      string | null
        }
        Insert: Omit<Database['public']['Tables']['kyc_documents']['Row'], 'id' | 'submitted_at'>
        Update: Partial<Database['public']['Tables']['kyc_documents']['Row']>
      }
      otp_codes: {
        Row: {
          id:         string
          user_id:    string
          code:       string
          purpose:    string
          used:       boolean
          expires_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['otp_codes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['otp_codes']['Row']>
      }
      audit_logs: {
        Row: {
          id:         string
          admin_id:   string
          target_id:  string | null
          action:     string
          details:    Json | null
          ip:         string | null
          timestamp:  string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'timestamp'>
        Update: never
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

// Types raccourcis
export type Profile     = Database['public']['Tables']['profiles']['Row']
export type Wallet      = Database['public']['Tables']['wallets']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type KycDocument = Database['public']['Tables']['kyc_documents']['Row']
export type AuditLog    = Database['public']['Tables']['audit_logs']['Row']
