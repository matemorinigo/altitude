export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          code: string
          created_at: string
          currency: string
          id: string
          is_archived: boolean
          name: string
          sort_order: number
          type: string
          user_id: string
        }
        Insert: {
          balance?: number
          code: string
          created_at?: string
          currency?: string
          id?: string
          is_archived?: boolean
          name: string
          sort_order?: number
          type: string
          user_id: string
        }
        Update: {
          balance?: number
          code?: string
          created_at?: string
          currency?: string
          id?: string
          is_archived?: boolean
          name?: string
          sort_order?: number
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_cards: {
        Row: {
          close_day: number
          code: string
          created_at: string
          currency: string
          current_debt: number
          due_day: number
          id: string
          is_archived: boolean
          last_closed_at: string | null
          name: string
          sort_order: number
          statement_debt: number
          user_id: string
        }
        Insert: {
          close_day: number
          code: string
          created_at?: string
          currency?: string
          current_debt?: number
          due_day: number
          id?: string
          is_archived?: boolean
          last_closed_at?: string | null
          name: string
          sort_order?: number
          statement_debt?: number
          user_id: string
        }
        Update: {
          close_day?: number
          code?: string
          created_at?: string
          currency?: string
          current_debt?: number
          due_day?: number
          id?: string
          is_archived?: boolean
          last_closed_at?: string | null
          name?: string
          sort_order?: number
          statement_debt?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          base_currency: string
          created_at: string
          display_name: string | null
          id: string
          payday_day_of_month: number | null
          payday_expected_amount: number | null
          payday_kind: string
          payday_nth_business_day: number | null
        }
        Insert: {
          base_currency?: string
          created_at?: string
          display_name?: string | null
          id: string
          payday_day_of_month?: number | null
          payday_expected_amount?: number | null
          payday_kind?: string
          payday_nth_business_day?: number | null
        }
        Update: {
          base_currency?: string
          created_at?: string
          display_name?: string | null
          id?: string
          payday_day_of_month?: number | null
          payday_expected_amount?: number | null
          payday_kind?: string
          payday_nth_business_day?: number | null
        }
        Relationships: []
      }
      recurring_templates: {
        Row: {
          account_id: string | null
          amount: number | null
          category: string
          created_at: string
          credit_card_id: string | null
          day_of_month: number | null
          description: string | null
          id: string
          is_active: boolean
          is_payday: boolean
          kind: string
          last_generated_for: string | null
          name: string
          nth_business_day: number | null
          prompt_for_amount: boolean
          schedule_kind: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          category?: string
          created_at?: string
          credit_card_id?: string | null
          day_of_month?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_payday?: boolean
          kind: string
          last_generated_for?: string | null
          name: string
          nth_business_day?: number | null
          prompt_for_amount?: boolean
          schedule_kind: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          category?: string
          created_at?: string
          credit_card_id?: string | null
          day_of_month?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_payday?: boolean
          kind?: string
          last_generated_for?: string | null
          name?: string
          nth_business_day?: number | null
          prompt_for_amount?: boolean
          schedule_kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_templates_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_events: {
        Row: {
          confirmed_transaction_id: string | null
          created_at: string
          due_date: string
          id: string
          status: string
          template_id: string
          user_id: string
        }
        Insert: {
          confirmed_transaction_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          status?: string
          template_id: string
          user_id: string
        }
        Update: {
          confirmed_transaction_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          status?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sched_confirmed_tx"
            columns: ["confirmed_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "recurring_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tickers: {
        Row: {
          asset_class: string | null
          avg_cost: number | null
          created_at: string
          id: string
          instrument_kind: string
          is_archived: boolean
          last_price: number | null
          last_price_at: string | null
          last_price_currency: string | null
          notes: string | null
          quantity: number
          sort_order: number
          symbol: string
          user_id: string
        }
        Insert: {
          asset_class?: string | null
          avg_cost?: number | null
          created_at?: string
          id?: string
          instrument_kind: string
          is_archived?: boolean
          last_price?: number | null
          last_price_at?: string | null
          last_price_currency?: string | null
          notes?: string | null
          quantity: number
          sort_order?: number
          symbol: string
          user_id: string
        }
        Update: {
          asset_class?: string | null
          avg_cost?: number | null
          created_at?: string
          id?: string
          instrument_kind?: string
          is_archived?: boolean
          last_price?: number | null
          last_price_at?: string | null
          last_price_currency?: string | null
          notes?: string | null
          quantity?: number
          sort_order?: number
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category: string
          created_at: string
          credit_card_id: string | null
          currency: string
          description: string | null
          id: string
          kind: string
          occurred_at: string
          recurring_template_id: string | null
          scheduled_event_id: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category: string
          created_at?: string
          credit_card_id?: string | null
          currency?: string
          description?: string | null
          id?: string
          kind: string
          occurred_at?: string
          recurring_template_id?: string | null
          scheduled_event_id?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string
          created_at?: string
          credit_card_id?: string | null
          currency?: string
          description?: string | null
          id?: string
          kind?: string
          occurred_at?: string
          recurring_template_id?: string | null
          scheduled_event_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_template_id_fkey"
            columns: ["recurring_template_id"]
            isOneToOne: false
            referencedRelation: "recurring_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_scheduled_event_id_fkey"
            columns: ["scheduled_event_id"]
            isOneToOne: false
            referencedRelation: "scheduled_events"
            referencedColumns: ["id"]
          },
        ]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const


// -- App domain types --

export type AccountType          = 'BANK' | 'WALLET'
export type TransactionKind      = 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'CARD_PAYMENT'
export type PaydayKind           = 'NTH_BUSINESS_DAY' | 'DAY_OF_MONTH'
export type ScheduleKind         = 'DAY_OF_MONTH' | 'NTH_BUSINESS_DAY'
export type ScheduledEventStatus = 'PENDING' | 'CONFIRMED' | 'SKIPPED'

export interface Profile {
  id: string
  display_name: string | null
  base_currency: string
  payday_kind: PaydayKind
  payday_nth_business_day: number | null
  payday_day_of_month: number | null
  payday_expected_amount: number | null
  created_at: string
}

export interface RecurringTemplate {
  id: string
  user_id: string
  kind: 'EXPENSE' | 'INCOME'
  name: string
  amount: number | null
  prompt_for_amount: boolean
  account_id: string | null
  credit_card_id: string | null
  category: string
  description: string | null
  schedule_kind: ScheduleKind
  day_of_month: number | null
  nth_business_day: number | null
  is_active: boolean
  is_payday: boolean
  last_generated_for: string | null
  created_at: string
}

export interface ScheduledEvent {
  id: string
  user_id: string
  template_id: string
  due_date: string
  status: ScheduledEventStatus
  confirmed_transaction_id: string | null
  created_at: string
  recurring_templates?: RecurringTemplate
}

export interface Account {
  id: string
  user_id: string
  code: string
  name: string
  type: AccountType
  currency: string
  balance: number
  sort_order: number
  is_archived: boolean
  created_at: string
}

export interface CreditCard {
  id: string
  user_id: string
  code: string
  name: string
  close_day: number
  due_day: number
  currency: string
  current_debt: number
  statement_debt: number
  last_closed_at: string | null
  sort_order: number
  is_archived: boolean
  created_at: string
}

export type InstrumentKind = 'CEDEAR' | 'STOCK_AR' | 'BOND_AR' | 'NOTE_AR' | 'CORP_AR' | 'STOCK_USA' | 'ADR_USA'

export interface Ticker {
  id: string
  user_id: string
  symbol: string
  quantity: number
  avg_cost: number | null
  asset_class: string | null
  instrument_kind: InstrumentKind
  last_price: number | null
  last_price_currency: string | null
  last_price_at: string | null
  notes: string | null
  sort_order: number
  is_archived: boolean
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string | null
  credit_card_id: string | null
  kind: TransactionKind
  amount: number
  currency: string
  category: string
  description: string | null
  occurred_at: string
  recurring_template_id: string | null
  scheduled_event_id: string | null
  created_at: string
}
