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
      avisos: {
        Row: {
          ativo: boolean
          condominio_id: string
          created_at: string
          created_by: string | null
          data: string
          descricao: string
          fixado: boolean
          id: string
          prioridade: Database["public"]["Enums"]["prioridade_aviso"]
          tipo: Database["public"]["Enums"]["tipo_aviso"]
          titulo: string | null
          unidade_id: string | null
        }
        Insert: {
          ativo?: boolean
          condominio_id: string
          created_at?: string
          created_by?: string | null
          data: string
          descricao: string
          fixado?: boolean
          id?: string
          prioridade?: Database["public"]["Enums"]["prioridade_aviso"]
          tipo?: Database["public"]["Enums"]["tipo_aviso"]
          titulo?: string | null
          unidade_id?: string | null
        }
        Update: {
          ativo?: boolean
          condominio_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string
          fixado?: boolean
          id?: string
          prioridade?: Database["public"]["Enums"]["prioridade_aviso"]
          tipo?: Database["public"]["Enums"]["tipo_aviso"]
          titulo?: string | null
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avisos_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      blocos: {
        Row: {
          condominio_id: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocos_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados_tecnicos: {
        Row: {
          categoria: string
          condominio_id: string
          created_at: string
          created_by: string | null
          data_abertura: string
          data_conclusao: string | null
          descricao: string
          id: string
          responsavel: string | null
          status: Database["public"]["Enums"]["status_chamado"]
          tipo: Database["public"]["Enums"]["tipo_chamado"]
          updated_at: string
        }
        Insert: {
          categoria: string
          condominio_id: string
          created_at?: string
          created_by?: string | null
          data_abertura?: string
          data_conclusao?: string | null
          descricao: string
          id?: string
          responsavel?: string | null
          status?: Database["public"]["Enums"]["status_chamado"]
          tipo: Database["public"]["Enums"]["tipo_chamado"]
          updated_at?: string
        }
        Update: {
          categoria?: string
          condominio_id?: string
          created_at?: string
          created_by?: string | null
          data_abertura?: string
          data_conclusao?: string | null
          descricao?: string
          id?: string
          responsavel?: string | null
          status?: Database["public"]["Enums"]["status_chamado"]
          tipo?: Database["public"]["Enums"]["tipo_chamado"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_tecnicos_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      condominios: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          conselheiros: Json | null
          created_at: string
          estado: string | null
          id: string
          limpeza_nome: string | null
          limpeza_telefone: string | null
          logradouro: string | null
          nome: string
          numero: string | null
          sindico_nome: string | null
          sindico_telefone: string | null
          subsindico_nome: string | null
          subsindico_telefone: string | null
          updated_at: string
          zelador_nome: string | null
          zelador_telefone: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          conselheiros?: Json | null
          created_at?: string
          estado?: string | null
          id?: string
          limpeza_nome?: string | null
          limpeza_telefone?: string | null
          logradouro?: string | null
          nome: string
          numero?: string | null
          sindico_nome?: string | null
          sindico_telefone?: string | null
          subsindico_nome?: string | null
          subsindico_telefone?: string | null
          updated_at?: string
          zelador_nome?: string | null
          zelador_telefone?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          conselheiros?: Json | null
          created_at?: string
          estado?: string | null
          id?: string
          limpeza_nome?: string | null
          limpeza_telefone?: string | null
          logradouro?: string | null
          nome?: string
          numero?: string | null
          sindico_nome?: string | null
          sindico_telefone?: string | null
          subsindico_nome?: string | null
          subsindico_telefone?: string | null
          updated_at?: string
          zelador_nome?: string | null
          zelador_telefone?: string | null
        }
        Relationships: []
      }
      eventos: {
        Row: {
          condominio_id: string
          created_at: string
          created_by: string | null
          data: string
          descricao: string
          id: string
          unidade_id: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          created_by?: string | null
          data: string
          descricao: string
          id?: string
          unidade_id: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string
          id?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          contato_nome: string | null
          created_at: string
          id: string
          nome: string
          numero_cadastro: string | null
          numero_cliente: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          contato_nome?: string | null
          created_at?: string
          id?: string
          nome: string
          numero_cadastro?: string | null
          numero_cliente?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          contato_nome?: string | null
          created_at?: string
          id?: string
          nome?: string
          numero_cadastro?: string | null
          numero_cliente?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      moradores: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          nome: string
          pavimento: string | null
          telefone: string | null
          unidade_id: string
          updated_at: string
          vaga: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          pavimento?: string | null
          telefone?: string | null
          unidade_id: string
          updated_at?: string
          vaga?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          pavimento?: string | null
          telefone?: string | null
          unidade_id?: string
          updated_at?: string
          vaga?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moradores_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      mudancas: {
        Row: {
          condominio_id: string
          created_at: string
          created_by: string | null
          data: string
          id: string
          tipo: Database["public"]["Enums"]["tipo_mudanca"]
          unidade_id: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          created_by?: string | null
          data: string
          id?: string
          tipo: Database["public"]["Enums"]["tipo_mudanca"]
          unidade_id: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_mudanca"]
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mudancas_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mudancas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias: {
        Row: {
          condominio_id: string
          created_at: string
          created_by: string | null
          data_hora: string
          descricao: string
          documento: string | null
          finalizada_em: string | null
          id: string
          imagem_url: string | null
          morador_id: string | null
          nome_pessoa: string | null
          status: Database["public"]["Enums"]["status_ocorrencia"]
          tipo: string
          unidade_id: string | null
        }
        Insert: {
          condominio_id: string
          created_at?: string
          created_by?: string | null
          data_hora?: string
          descricao: string
          documento?: string | null
          finalizada_em?: string | null
          id?: string
          imagem_url?: string | null
          morador_id?: string | null
          nome_pessoa?: string | null
          status?: Database["public"]["Enums"]["status_ocorrencia"]
          tipo: string
          unidade_id?: string | null
        }
        Update: {
          condominio_id?: string
          created_at?: string
          created_by?: string | null
          data_hora?: string
          descricao?: string
          documento?: string | null
          finalizada_em?: string | null
          id?: string
          imagem_url?: string | null
          morador_id?: string | null
          nome_pessoa?: string | null
          status?: Database["public"]["Enums"]["status_ocorrencia"]
          tipo?: string
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_morador_id_fkey"
            columns: ["morador_id"]
            isOneToOne: false
            referencedRelation: "moradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome_completo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome_completo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome_completo?: string
          updated_at?: string
        }
        Relationships: []
      }
      unidades: {
        Row: {
          bloco_id: string
          created_at: string
          id: string
          numero: string
        }
        Insert: {
          bloco_id: string
          created_at?: string
          id?: string
          numero: string
        }
        Update: {
          bloco_id?: string
          created_at?: string
          id?: string
          numero?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_bloco_id_fkey"
            columns: ["bloco_id"]
            isOneToOne: false
            referencedRelation: "blocos"
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
          role: Database["public"]["Enums"]["app_role"]
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
      veiculos: {
        Row: {
          cor: string | null
          created_at: string
          id: string
          modelo: string | null
          morador_id: string
          placa: string
          subsolo: string | null
          vaga: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string
          id?: string
          modelo?: string | null
          morador_id: string
          placa: string
          subsolo?: string | null
          vaga?: string | null
        }
        Update: {
          cor?: string | null
          created_at?: string
          id?: string
          modelo?: string | null
          morador_id?: string
          placa?: string
          subsolo?: string | null
          vaga?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_morador_id_fkey"
            columns: ["morador_id"]
            isOneToOne: false
            referencedRelation: "moradores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operador" | "sindico"
      prioridade_aviso: "normal" | "urgente"
      status_chamado: "pendente" | "em_andamento" | "concluido"
      status_ocorrencia: "em_andamento" | "finalizada"
      tipo_aviso: "informativo" | "urgente" | "manutencao"
      tipo_chamado: "manutencao" | "ti"
      tipo_mudanca: "entrada" | "saida"
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
      app_role: ["admin", "operador", "sindico"],
      prioridade_aviso: ["normal", "urgente"],
      status_chamado: ["pendente", "em_andamento", "concluido"],
      status_ocorrencia: ["em_andamento", "finalizada"],
      tipo_aviso: ["informativo", "urgente", "manutencao"],
      tipo_chamado: ["manutencao", "ti"],
      tipo_mudanca: ["entrada", "saida"],
    },
  },
} as const
