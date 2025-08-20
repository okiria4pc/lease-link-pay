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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      expenses: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          expense_date: string
          id: string
          property_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          property_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          created_at: string | null
          description: string
          id: string
          status: string | null
          tenant_id: string | null
          unit_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          status?: string | null
          tenant_id?: string | null
          unit_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          status?: string | null
          tenant_id?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          method: string
          payment_date: string
          status: string | null
          tenancy_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          method: string
          payment_date?: string
          status?: string | null
          tenancy_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          method?: string
          payment_date?: string
          status?: string | null
          tenancy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          landlord_id: string | null
          name: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          landlord_id?: string | null
          name: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          landlord_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancies: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          rent_amount: number
          start_date: string
          status: string | null
          tenant_id: string | null
          unit_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          rent_amount: number
          start_date: string
          status?: string | null
          tenant_id?: string | null
          unit_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          rent_amount?: number
          start_date?: string
          status?: string | null
          tenant_id?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenancies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          bathrooms: number | null
          bedrooms: number | null
          created_at: string | null
          id: string
          property_id: string | null
          rent_amount: number
          status: string | null
          unit_number: string
        }
        Insert: {
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          id?: string
          property_id?: string | null
          rent_amount: number
          status?: string | null
          unit_number: string
        }
        Update: {
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          id?: string
          property_id?: string | null
          rent_amount?: number
          status?: string | null
          unit_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      USERS: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          role?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_complete_schema: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      user_role: "tenant" | "landlord" | "admin"
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
      user_role: ["tenant", "landlord", "admin"],
    },
  },
} as const
