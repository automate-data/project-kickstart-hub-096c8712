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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      boletos: {
        Row: {
          cliente_id: string | null
          criado_em: string
          data_vencimento: string | null
          id: string
          nome_arquivo: string
          tamanho_arquivo: number | null
          tipo_arquivo: string | null
          url_arquivo: string
          user_id: string
          valor: number | null
        }
        Insert: {
          cliente_id?: string | null
          criado_em?: string
          data_vencimento?: string | null
          id?: string
          nome_arquivo: string
          tamanho_arquivo?: number | null
          tipo_arquivo?: string | null
          url_arquivo: string
          user_id: string
          valor?: number | null
        }
        Update: {
          cliente_id?: string | null
          criado_em?: string
          data_vencimento?: string | null
          id?: string
          nome_arquivo?: string
          tamanho_arquivo?: number | null
          tipo_arquivo?: string | null
          url_arquivo?: string
          user_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "boletos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          atualizado_em: string
          cep: string | null
          cidade: string | null
          criado_em: string
          email: string
          empresa: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          cep?: string | null
          cidade?: string | null
          criado_em?: string
          email: string
          empresa?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          user_id: string
        }
        Update: {
          atualizado_em?: string
          cep?: string | null
          cidade?: string | null
          criado_em?: string
          email?: string
          empresa?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cobranca_servicos: {
        Row: {
          cobranca_id: string
          criado_em: string
          id: string
          quantidade: number
          servico_id: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          cobranca_id: string
          criado_em?: string
          id?: string
          quantidade?: number
          servico_id: string
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          cobranca_id?: string
          criado_em?: string
          id?: string
          quantidade?: number
          servico_id?: string
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "cobranca_servicos_cobranca_id_fkey"
            columns: ["cobranca_id"]
            isOneToOne: false
            referencedRelation: "cobrancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobranca_servicos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      cobrancas: {
        Row: {
          atualizado_em: string
          cliente_id: string | null
          cobranca_principal_id: string | null
          criado_em: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string | null
          excluido: boolean
          excluido_em: string | null
          id: string
          metodo_pagamento: string | null
          numero_parcelas: number
          observacoes: string | null
          parcela_atual: number | null
          servico_id: string | null
          status: string
          titulo: string
          user_id: string
          valor: number
          valor_parcela: number | null
        }
        Insert: {
          atualizado_em?: string
          cliente_id?: string | null
          cobranca_principal_id?: string | null
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao?: string | null
          excluido?: boolean
          excluido_em?: string | null
          id?: string
          metodo_pagamento?: string | null
          numero_parcelas?: number
          observacoes?: string | null
          parcela_atual?: number | null
          servico_id?: string | null
          status?: string
          titulo: string
          user_id: string
          valor?: number
          valor_parcela?: number | null
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string | null
          cobranca_principal_id?: string | null
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string | null
          excluido?: boolean
          excluido_em?: string | null
          id?: string
          metodo_pagamento?: string | null
          numero_parcelas?: number
          observacoes?: string | null
          parcela_atual?: number | null
          servico_id?: string | null
          status?: string
          titulo?: string
          user_id?: string
          valor?: number
          valor_parcela?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_cobranca_principal_id_fkey"
            columns: ["cobranca_principal_id"]
            isOneToOne: false
            referencedRelation: "cobrancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      condominiums: {
        Row: {
          address: string | null
          admin_user_id: string
          city: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          group_label: string
          groups: Json
          id: string
          name: string
          phone: string | null
          setup_completed: boolean
          state: string | null
          unit_label: string
          unit_type: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          admin_user_id: string
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          group_label?: string
          groups?: Json
          id?: string
          name: string
          phone?: string | null
          setup_completed?: boolean
          state?: string | null
          unit_label?: string
          unit_type?: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          admin_user_id?: string
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          group_label?: string
          groups?: Json
          id?: string
          name?: string
          phone?: string | null
          setup_completed?: boolean
          state?: string | null
          unit_label?: string
          unit_type?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      configuracoes_empresa: {
        Row: {
          atualizado_em: string
          criado_em: string
          dias_lembrete: number | null
          email: string | null
          id: string
          lembretes_automaticos: boolean | null
          nome_empresa: string | null
          notificacoes: boolean | null
          telefone: string | null
          user_id: string
          whatsapp_token: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          dias_lembrete?: number | null
          email?: string | null
          id?: string
          lembretes_automaticos?: boolean | null
          nome_empresa?: string | null
          notificacoes?: boolean | null
          telefone?: string | null
          user_id: string
          whatsapp_token?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          dias_lembrete?: number | null
          email?: string | null
          id?: string
          lembretes_automaticos?: boolean | null
          nome_empresa?: string | null
          notificacoes?: boolean | null
          telefone?: string | null
          user_id?: string
          whatsapp_token?: string | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          ai_suggestion: Json | null
          carrier: string | null
          created_at: string
          id: string
          notes: string | null
          ocr_raw_text: string | null
          photo_url: string
          picked_up_at: string | null
          picked_up_by: string | null
          pickup_confirmation_sent: boolean | null
          received_at: string
          received_by: string | null
          resident_id: string | null
          signature_data: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_suggestion?: Json | null
          carrier?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          ocr_raw_text?: string | null
          photo_url: string
          picked_up_at?: string | null
          picked_up_by?: string | null
          pickup_confirmation_sent?: boolean | null
          received_at?: string
          received_by?: string | null
          resident_id?: string | null
          signature_data?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_suggestion?: Json | null
          carrier?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          ocr_raw_text?: string | null
          photo_url?: string
          picked_up_at?: string | null
          picked_up_by?: string | null
          pickup_confirmation_sent?: boolean | null
          received_at?: string
          received_by?: string | null
          resident_id?: string | null
          signature_data?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          atualizado_em: string
          avatar_url: string | null
          criado_em: string
          email: string
          empresa: string | null
          id: string
          nome: string | null
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string
          avatar_url?: string | null
          criado_em?: string
          email: string
          empresa?: string | null
          id: string
          nome?: string | null
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string
          avatar_url?: string | null
          criado_em?: string
          email?: string
          empresa?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      residents: {
        Row: {
          apartment: string
          block: string
          condominium_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string
          updated_at: string
        }
        Insert: {
          apartment: string
          block: string
          condominium_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          phone: string
          updated_at?: string
        }
        Update: {
          apartment?: string
          block?: string
          condominium_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "residents_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          categoria: string | null
          criado_em: string
          descricao: string | null
          id: string
          nome: string
          user_id: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
          user_id: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_cobranca_user_id: { Args: { cobranca_uuid: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "doorman"
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
      app_role: ["admin", "doorman"],
    },
  },
} as const
