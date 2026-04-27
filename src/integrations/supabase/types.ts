export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_number: string
          account_size: number
          account_type: string
          balance: number
          created_at: string
          equity: number
          id: string
          leverage: string | null
          phase: string | null
          program_type: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          account_size?: number
          account_type?: string
          balance?: number
          created_at?: string
          equity?: number
          id?: string
          leverage?: string | null
          phase?: string | null
          program_type?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          account_size?: number
          account_type?: string
          balance?: number
          created_at?: string
          equity?: number
          id?: string
          leverage?: string | null
          phase?: string | null
          program_type?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      admin_page_permissions: {
        Row: {
          created_at: string
          id: string
          page_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_key?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_applications: {
        Row: {
          address: string
          admin_notes: string | null
          city: string
          company: string | null
          country: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          promotion_plan: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state_region: string | null
          status: string
          telephone: string
          updated_at: string
          user_id: string | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address: string
          admin_notes?: string | null
          city: string
          company?: string | null
          country: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          promotion_plan?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state_region?: string | null
          status?: string
          telephone: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          admin_notes?: string | null
          city?: string
          company?: string | null
          country?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          promotion_plan?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state_region?: string | null
          status?: string
          telephone?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      challenge_progression: {
        Row: {
          account_size: number
          condor_group_mapping: string | null
          created_at: string
          id: string
          is_active: boolean
          next_account_size: number | null
          next_phase: string | null
          phase: string
          profit_target_percent: number | null
          program_type: string
          updated_at: string
        }
        Insert: {
          account_size: number
          condor_group_mapping?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          next_account_size?: number | null
          next_phase?: string | null
          phase: string
          profit_target_percent?: number | null
          program_type: string
          updated_at?: string
        }
        Update: {
          account_size?: number
          condor_group_mapping?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          next_account_size?: number | null
          next_phase?: string | null
          phase?: string
          profit_target_percent?: number | null
          program_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          account_id: string
          account_size: number
          challenge_number: string
          created_at: string
          current_balance: number
          current_drawdown_percent: number
          current_profit_amount: number
          current_profit_percent: number
          daily_drawdown_percent: number
          days_traded: number
          end_date: string | null
          external_account_id: string | null
          id: string
          max_drawdown_amount: number
          max_drawdown_percent: number
          min_trading_days: number
          personal_account_id: string | null
          phase: string
          profit_target_amount: number
          profit_target_percent: number
          program_type: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          account_size: number
          challenge_number: string
          created_at?: string
          current_balance: number
          current_drawdown_percent?: number
          current_profit_amount?: number
          current_profit_percent?: number
          daily_drawdown_percent?: number
          days_traded?: number
          end_date?: string | null
          external_account_id?: string | null
          id?: string
          max_drawdown_amount: number
          max_drawdown_percent?: number
          min_trading_days?: number
          personal_account_id?: string | null
          phase?: string
          profit_target_amount: number
          profit_target_percent?: number
          program_type?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          account_size?: number
          challenge_number?: string
          created_at?: string
          current_balance?: number
          current_drawdown_percent?: number
          current_profit_amount?: number
          current_profit_percent?: number
          daily_drawdown_percent?: number
          days_traded?: number
          end_date?: string | null
          external_account_id?: string | null
          id?: string
          max_drawdown_amount?: number
          max_drawdown_percent?: number
          min_trading_days?: number
          personal_account_id?: string | null
          phase?: string
          profit_target_amount?: number
          profit_target_percent?: number
          program_type?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_bans: {
        Row: {
          ban_reason: string | null
          banned_at: string
          banned_by: string | null
          created_at: string
          expires_at: string
          id: string
          user_email: string
        }
        Insert: {
          ban_reason?: string | null
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          expires_at: string
          id?: string
          user_email: string
        }
        Update: {
          ban_reason?: string | null
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          user_email?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          admin_reply: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          message: string
          replied_at: string | null
          replied_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_reply?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          message: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_reply?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          message?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          assigned_admin_id: string | null
          created_at: string
          escalated_at: string | null
          id: string
          is_anonymous: boolean | null
          resolved_at: string | null
          status: string
          updated_at: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          assigned_admin_id?: string | null
          created_at?: string
          escalated_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          assigned_admin_id?: string | null
          created_at?: string
          escalated_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      coupon_codes: {
        Row: {
          applicable_account_sizes: number[] | null
          code: string
          created_at: string
          created_by: string | null
          current_uses: number | null
          discount_percent: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_account_sizes?: number[] | null
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          discount_percent: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_account_sizes?: number[] | null
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          discount_percent?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          account_id: string | null
          coupon_id: string
          discount_amount: number | null
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          coupon_id: string
          discount_amount?: number | null
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          coupon_id?: string
          discount_amount?: number | null
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupon_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_accounts: {
        Row: {
          account_size: number
          api_response: Json | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          account_size: number
          api_response?: Json | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          account_size?: number
          api_response?: Json | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          sort_order: number
          sub_category: string | null
          updated_at: string
        }
        Insert: {
          answer: string
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number
          sub_category?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number
          sub_category?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          address_proof_url: string | null
          created_at: string
          document_back_url: string | null
          document_front_url: string | null
          document_type: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          address_proof_url?: string | null
          created_at?: string
          document_back_url?: string | null
          document_front_url?: string | null
          document_type: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          address_proof_url?: string | null
          created_at?: string
          document_back_url?: string | null
          document_front_url?: string | null
          document_type?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      login_history: {
        Row: {
          browser: string | null
          created_at: string
          device_type: string | null
          id: string
          ip_address: string | null
          os: string | null
          status: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          status?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          account_size: number
          admin_notes: string | null
          amount: number
          bank_account_used: string | null
          coupon_code: string | null
          created_at: string
          discount_percent: number | null
          email: string | null
          full_name: string | null
          id: string
          order_reference: string
          original_amount: number | null
          payment_method: string
          program_type: string
          proof_of_payment_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          wct_payment_id: string | null
          wct_payment_url: string | null
        }
        Insert: {
          account_size: number
          admin_notes?: string | null
          amount: number
          bank_account_used?: string | null
          coupon_code?: string | null
          created_at?: string
          discount_percent?: number | null
          email?: string | null
          full_name?: string | null
          id?: string
          order_reference?: string
          original_amount?: number | null
          payment_method: string
          program_type: string
          proof_of_payment_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          wct_payment_id?: string | null
          wct_payment_url?: string | null
        }
        Update: {
          account_size?: number
          admin_notes?: string | null
          amount?: number
          bank_account_used?: string | null
          coupon_code?: string | null
          created_at?: string
          discount_percent?: number | null
          email?: string | null
          full_name?: string | null
          id?: string
          order_reference?: string
          original_amount?: number | null
          payment_method?: string
          program_type?: string
          proof_of_payment_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          wct_payment_id?: string | null
          wct_payment_url?: string | null
        }
        Relationships: []
      }
      payouts: {
        Row: {
          account_id: string
          admin_notes: string | null
          amount: number
          created_at: string
          full_amount: number | null
          id: string
          payment_details: Json | null
          payment_method: string | null
          processed_at: string | null
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          admin_notes?: string | null
          amount: number
          created_at?: string
          full_amount?: number | null
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          admin_notes?: string | null
          amount?: number
          created_at?: string
          full_amount?: number | null
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string | null
          address: string | null
          affiliate_code: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          plain_p: string | null
          referred_by: string | null
          state: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          account_type?: string | null
          address?: string | null
          affiliate_code?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          plain_p?: string | null
          referred_by?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          account_type?: string | null
          address?: string | null
          affiliate_code?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          plain_p?: string | null
          referred_by?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      rules: {
        Row: {
          account_size: number
          created_at: string
          daily_drawdown: number
          id: string
          leverage: string | null
          max_drawdown: number
          min_trading_days: number
          profit_split: number | null
          profit_target_phase1: number
          profit_target_phase2: number | null
          program_type: string
          time_limit_days: number | null
          updated_at: string
        }
        Insert: {
          account_size: number
          created_at?: string
          daily_drawdown?: number
          id?: string
          leverage?: string | null
          max_drawdown?: number
          min_trading_days?: number
          profit_split?: number | null
          profit_target_phase1?: number
          profit_target_phase2?: number | null
          program_type: string
          time_limit_days?: number | null
          updated_at?: string
        }
        Update: {
          account_size?: number
          created_at?: string
          daily_drawdown?: number
          id?: string
          leverage?: string | null
          max_drawdown?: number
          min_trading_days?: number
          profit_split?: number | null
          profit_target_phase1?: number
          profit_target_phase2?: number | null
          program_type?: string
          time_limit_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          message: string
          priority: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trader_strategies: {
        Row: {
          account_id: string
          admin_notes: string | null
          created_at: string
          file_name: string
          file_url: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          admin_notes?: string | null
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          admin_notes?: string | null
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trader_strategies_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          account_id: string
          challenge_id: string | null
          closed_at: string | null
          created_at: string
          direction: string
          entry_price: number
          exit_price: number | null
          id: string
          lot_size: number
          opened_at: string
          pnl: number | null
          rule_violation: boolean | null
          status: string
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          user_id: string
          violation_type: string | null
        }
        Insert: {
          account_id: string
          challenge_id?: string | null
          closed_at?: string | null
          created_at?: string
          direction: string
          entry_price: number
          exit_price?: number | null
          id?: string
          lot_size: number
          opened_at?: string
          pnl?: number | null
          rule_violation?: boolean | null
          status?: string
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          user_id: string
          violation_type?: string | null
        }
        Update: {
          account_id?: string
          challenge_id?: string | null
          closed_at?: string | null
          created_at?: string
          direction?: string
          entry_price?: number
          exit_price?: number | null
          id?: string
          lot_size?: number
          opened_at?: string
          pnl?: number | null
          rule_violation?: boolean | null
          status?: string
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          user_id?: string
          violation_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_payouts_view: {
        Row: {
          account_id: string | null
          amount: number | null
          id: string | null
          payment_method: string | null
          processed_at: string | null
          requested_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_affiliate_code: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "root"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "root"],
    },
  },
} as const
