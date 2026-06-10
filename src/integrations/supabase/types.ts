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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ads: {
        Row: {
          brief_description: string | null
          cost_price: number | null
          created_at: string
          fake_discount: number | null
          fake_price: number | null
          final_price: number | null
          full_description_template: string | null
          id: string
          is_active: boolean
          keywords: string[] | null
          marketplace: string
          marketplace_fee: number | null
          packaging_cost: number | null
          product_id: string
          profit_margin: number | null
          shipping_cost: number | null
          tax: number | null
          titles: string[] | null
          transport_cost: number | null
          video_name: string | null
          video_script: string | null
          video_youtube_url: string | null
        }
        Insert: {
          brief_description?: string | null
          cost_price?: number | null
          created_at?: string
          fake_discount?: number | null
          fake_price?: number | null
          final_price?: number | null
          full_description_template?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          marketplace?: string
          marketplace_fee?: number | null
          packaging_cost?: number | null
          product_id: string
          profit_margin?: number | null
          shipping_cost?: number | null
          tax?: number | null
          titles?: string[] | null
          transport_cost?: number | null
          video_name?: string | null
          video_script?: string | null
          video_youtube_url?: string | null
        }
        Update: {
          brief_description?: string | null
          cost_price?: number | null
          created_at?: string
          fake_discount?: number | null
          fake_price?: number | null
          final_price?: number | null
          full_description_template?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          marketplace?: string
          marketplace_fee?: number | null
          packaging_cost?: number | null
          product_id?: string
          profit_margin?: number | null
          shipping_cost?: number | null
          tax?: number | null
          titles?: string[] | null
          transport_cost?: number | null
          video_name?: string | null
          video_script?: string | null
          video_youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_products: {
        Row: {
          id: string
          kit_id: string
          product_id: string
          quantity: number
        }
        Insert: {
          id?: string
          kit_id: string
          product_id: string
          quantity?: number
        }
        Update: {
          id?: string
          kit_id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "kit_products_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          brief_description: string | null
          created_at: string
          fake_discount: number | null
          fake_price: number | null
          final_price: number | null
          id: string
          is_active: boolean
          keywords: string[] | null
          marketplace_fee: number | null
          name: string
          packaging_cost: number | null
          profit_margin: number | null
          shipping_cost: number | null
          sku: string | null
          tax: number | null
          titles: string[] | null
          transport_cost: number | null
          video_name: string | null
          video_script: string | null
          video_youtube_url: string | null
        }
        Insert: {
          brief_description?: string | null
          created_at?: string
          fake_discount?: number | null
          fake_price?: number | null
          final_price?: number | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          marketplace_fee?: number | null
          name: string
          packaging_cost?: number | null
          profit_margin?: number | null
          shipping_cost?: number | null
          sku?: string | null
          tax?: number | null
          titles?: string[] | null
          transport_cost?: number | null
          video_name?: string | null
          video_script?: string | null
          video_youtube_url?: string | null
        }
        Update: {
          brief_description?: string | null
          created_at?: string
          fake_discount?: number | null
          fake_price?: number | null
          final_price?: number | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          marketplace_fee?: number | null
          name?: string
          packaging_cost?: number | null
          profit_margin?: number | null
          shipping_cost?: number | null
          sku?: string | null
          tax?: number | null
          titles?: string[] | null
          transport_cost?: number | null
          video_name?: string | null
          video_script?: string | null
          video_youtube_url?: string | null
        }
        Relationships: []
      }
      product_competitors: {
        Row: {
          created_at: string
          description: string | null
          highlights: Json
          id: string
          keywords_found: string[] | null
          price: number | null
          product_id: string
          title: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          highlights?: Json
          id?: string
          keywords_found?: string[] | null
          price?: number | null
          product_id: string
          title?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          highlights?: Json
          id?: string
          keywords_found?: string[] | null
          price?: number | null
          product_id?: string
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_competitors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          common_questions: string | null
          condition: string | null
          cost_price: number | null
          created_at: string
          depth: number | null
          description: string | null
          dimensions: string | null
          expiration_date: string | null
          format: string | null
          free_shipping: boolean
          gross_weight_g: number | null
          gtin: string | null
          gtin_tax: string | null
          height: number | null
          id: string
          is_active: boolean
          items_per_box: number | null
          keywords: string[] | null
          measurement_unit: string | null
          name: string
          net_weight_g: number | null
          notes: string | null
          price_lists: Json | null
          production_type: string | null
          sale_price: number | null
          sku: string | null
          status: string | null
          supplier_id: string | null
          type: string | null
          unit: string | null
          volumes: number | null
          weight_g: number | null
          width: number | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          common_questions?: string | null
          condition?: string | null
          cost_price?: number | null
          created_at?: string
          depth?: number | null
          description?: string | null
          dimensions?: string | null
          expiration_date?: string | null
          format?: string | null
          free_shipping?: boolean
          gross_weight_g?: number | null
          gtin?: string | null
          gtin_tax?: string | null
          height?: number | null
          id?: string
          is_active?: boolean
          items_per_box?: number | null
          keywords?: string[] | null
          measurement_unit?: string | null
          name: string
          net_weight_g?: number | null
          notes?: string | null
          price_lists?: Json | null
          production_type?: string | null
          sale_price?: number | null
          sku?: string | null
          status?: string | null
          supplier_id?: string | null
          type?: string | null
          unit?: string | null
          volumes?: number | null
          weight_g?: number | null
          width?: number | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          common_questions?: string | null
          condition?: string | null
          cost_price?: number | null
          created_at?: string
          depth?: number | null
          description?: string | null
          dimensions?: string | null
          expiration_date?: string | null
          format?: string | null
          free_shipping?: boolean
          gross_weight_g?: number | null
          gtin?: string | null
          gtin_tax?: string | null
          height?: number | null
          id?: string
          is_active?: boolean
          items_per_box?: number | null
          keywords?: string[] | null
          measurement_unit?: string | null
          name?: string
          net_weight_g?: number | null
          notes?: string | null
          price_lists?: Json | null
          production_type?: string | null
          sale_price?: number | null
          sku?: string | null
          status?: string | null
          supplier_id?: string | null
          type?: string | null
          unit?: string | null
          volumes?: number | null
          weight_g?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          city: string | null
          contact_name: string | null
          created_at: string
          delivery_days: number | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          state: string | null
          warranty_days: number | null
          whatsapp: string | null
        }
        Insert: {
          city?: string | null
          contact_name?: string | null
          created_at?: string
          delivery_days?: number | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          state?: string | null
          warranty_days?: number | null
          whatsapp?: string | null
        }
        Update: {
          city?: string | null
          contact_name?: string | null
          created_at?: string
          delivery_days?: number | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          state?: string | null
          warranty_days?: number | null
          whatsapp?: string | null
        }
        Relationships: []
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
  public: {
    Enums: {},
  },
} as const
