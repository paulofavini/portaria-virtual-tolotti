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
      arquivo_logs: {
        Row: {
          acao: string
          arquivo_id: string
          data_hora: string
          id: string
          nome_usuario: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          arquivo_id: string
          data_hora?: string
          id?: string
          nome_usuario?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          arquivo_id?: string
          data_hora?: string
          id?: string
          nome_usuario?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      arquivos: {
        Row: {
          ativo: boolean
          condominio_id: string
          created_at: string
          criado_por: string | null
          criado_por_nome: string | null
          deletado_em: string | null
          deletado_por: string | null
          deletado_por_nome: string | null
          descricao: string
          id: string
          nome: string
          storage_path: string
          tamanho: number | null
          tipo: string | null
          updated_at: string
          url: string
        }
        Insert: {
          ativo?: boolean
          condominio_id: string
          created_at?: string
          criado_por?: string | null
          criado_por_nome?: string | null
          deletado_em?: string | null
          deletado_por?: string | null
          deletado_por_nome?: string | null
          descricao: string
          id?: string
          nome: string
          storage_path: string
          tamanho?: number | null
          tipo?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          ativo?: boolean
          condominio_id?: string
          created_at?: string
          criado_por?: string | null
          criado_por_nome?: string | null
          deletado_em?: string | null
          deletado_por?: string | null
          deletado_por_nome?: string | null
          descricao?: string
          id?: string
          nome?: string
          storage_path?: string
          tamanho?: number | null
          tipo?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          field: string | null
          id: string
          module: string
          new_value: string | null
          old_value: string | null
          record_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          field?: string | null
          id?: string
          module: string
          new_value?: string | null
          old_value?: string | null
          record_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          field?: string | null
          id?: string
          module?: string
          new_value?: string | null
          old_value?: string | null
          record_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      avisos: {
        Row: {
          ativo: boolean
          condominio_id: string
          created_at: string
          created_by: string | null
          data: string
          data_expiracao: string | null
          descricao: string | null
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
          data_expiracao?: string | null
          descricao?: string | null
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
          data_expiracao?: string | null
          descricao?: string | null
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
          bloco_id: string | null
          categoria: string
          condominio_id: string | null
          created_at: string
          created_by: string | null
          data_abertura: string
          data_conclusao: string | null
          descricao: string
          destino: Database["public"]["Enums"]["destino_chamado"] | null
          empresa_terceiro: string | null
          finalizado_em: string | null
          id: string
          numero_protocolo: string | null
          origem_solicitante:
            | Database["public"]["Enums"]["origem_chamado"]
            | null
          prazo: string | null
          responsavel: string | null
          status: Database["public"]["Enums"]["status_chamado"]
          tipo: Database["public"]["Enums"]["tipo_chamado"]
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          bloco_id?: string | null
          categoria: string
          condominio_id?: string | null
          created_at?: string
          created_by?: string | null
          data_abertura?: string
          data_conclusao?: string | null
          descricao: string
          destino?: Database["public"]["Enums"]["destino_chamado"] | null
          empresa_terceiro?: string | null
          finalizado_em?: string | null
          id?: string
          numero_protocolo?: string | null
          origem_solicitante?:
            | Database["public"]["Enums"]["origem_chamado"]
            | null
          prazo?: string | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["status_chamado"]
          tipo: Database["public"]["Enums"]["tipo_chamado"]
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          bloco_id?: string | null
          categoria?: string
          condominio_id?: string | null
          created_at?: string
          created_by?: string | null
          data_abertura?: string
          data_conclusao?: string | null
          descricao?: string
          destino?: Database["public"]["Enums"]["destino_chamado"] | null
          empresa_terceiro?: string | null
          finalizado_em?: string | null
          id?: string
          numero_protocolo?: string | null
          origem_solicitante?:
            | Database["public"]["Enums"]["origem_chamado"]
            | null
          prazo?: string | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["status_chamado"]
          tipo?: Database["public"]["Enums"]["tipo_chamado"]
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_tecnicos_bloco_id_fkey"
            columns: ["bloco_id"]
            isOneToOne: false
            referencedRelation: "blocos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_tecnicos_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_tecnicos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      condominio_contato_util: {
        Row: {
          condominio_id: string
          created_at: string
          created_by: string | null
          empresa: string | null
          id: string
          observacoes: string | null
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          created_by?: string | null
          empresa?: string | null
          id?: string
          observacoes?: string | null
          telefone?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          created_by?: string | null
          empresa?: string | null
          id?: string
          observacoes?: string | null
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      condominio_info_operacional: {
        Row: {
          condominio_id: string
          created_at: string
          ddns: string | null
          id: string
          ramal_principal: string | null
          senha_academia: string | null
          senha_bicicletario: string | null
          senha_clausura: string | null
          senha_guarita: string | null
          senha_portao_subsolo: string | null
          senha_portao_terreo: string | null
          updated_at: string
          updated_by: string | null
          wifi_rede: string | null
          wifi_senha: string | null
        }
        Insert: {
          condominio_id: string
          created_at?: string
          ddns?: string | null
          id?: string
          ramal_principal?: string | null
          senha_academia?: string | null
          senha_bicicletario?: string | null
          senha_clausura?: string | null
          senha_guarita?: string | null
          senha_portao_subsolo?: string | null
          senha_portao_terreo?: string | null
          updated_at?: string
          updated_by?: string | null
          wifi_rede?: string | null
          wifi_senha?: string | null
        }
        Update: {
          condominio_id?: string
          created_at?: string
          ddns?: string | null
          id?: string
          ramal_principal?: string | null
          senha_academia?: string | null
          senha_bicicletario?: string | null
          senha_clausura?: string | null
          senha_guarita?: string | null
          senha_portao_subsolo?: string | null
          senha_portao_terreo?: string | null
          updated_at?: string
          updated_by?: string | null
          wifi_rede?: string | null
          wifi_senha?: string | null
        }
        Relationships: []
      }
      condominio_ramal_interno: {
        Row: {
          condominio_id: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          numero: string
          updated_at: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          numero: string
          updated_at?: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          numero?: string
          updated_at?: string
        }
        Relationships: []
      }
      condominio_senha_historico: {
        Row: {
          alterado_em: string
          alterado_por: string | null
          campo: string
          condominio_id: string
          id: string
          valor_antigo: string | null
          valor_novo: string | null
        }
        Insert: {
          alterado_em?: string
          alterado_por?: string | null
          campo: string
          condominio_id: string
          id?: string
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Update: {
          alterado_em?: string
          alterado_por?: string | null
          campo?: string
          condominio_id?: string
          id?: string
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Relationships: []
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
      evento_convidados: {
        Row: {
          created_at: string
          created_by: string | null
          documento: string | null
          evento_id: string
          horario_checkin: string | null
          id: string
          nome: string
          presente: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          documento?: string | null
          evento_id: string
          horario_checkin?: string | null
          id?: string
          nome: string
          presente?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          documento?: string | null
          evento_id?: string
          horario_checkin?: string | null
          id?: string
          nome?: string
          presente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "evento_convidados_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          condominio_id: string
          created_at: string
          created_by: string | null
          data: string
          descricao: string | null
          horario: string | null
          id: string
          local: string | null
          morador_id: string | null
          observacoes: string | null
          titulo: string | null
          unidade_id: string | null
        }
        Insert: {
          condominio_id: string
          created_at?: string
          created_by?: string | null
          data: string
          descricao?: string | null
          horario?: string | null
          id?: string
          local?: string | null
          morador_id?: string | null
          observacoes?: string | null
          titulo?: string | null
          unidade_id?: string | null
        }
        Update: {
          condominio_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          horario?: string | null
          id?: string
          local?: string | null
          morador_id?: string | null
          observacoes?: string | null
          titulo?: string | null
          unidade_id?: string | null
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
            foreignKeyName: "eventos_morador_id_fkey"
            columns: ["morador_id"]
            isOneToOne: false
            referencedRelation: "moradores"
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
      liberacao_acessos: {
        Row: {
          id: string
          liberacao_id: string
          liberado_em: string
          liberado_por: string | null
          observacao: string | null
        }
        Insert: {
          id?: string
          liberacao_id: string
          liberado_em?: string
          liberado_por?: string | null
          observacao?: string | null
        }
        Update: {
          id?: string
          liberacao_id?: string
          liberado_em?: string
          liberado_por?: string | null
          observacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liberacao_acessos_liberacao_id_fkey"
            columns: ["liberacao_id"]
            isOneToOne: false
            referencedRelation: "liberacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      liberacoes: {
        Row: {
          autorizador_empresa_nome: string | null
          autorizador_morador_id: string | null
          autorizador_morador_nome: string | null
          autorizador_sindico_nome: string | null
          autorizador_unidade_id: string | null
          condominio_id: string
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          observacoes: string | null
          origem: Database["public"]["Enums"]["origem_liberacao"]
          palavra_chave: string | null
          revogada_em: string | null
          revogada_motivo: string | null
          revogada_por: string | null
          status: Database["public"]["Enums"]["status_liberacao"]
          tipo_validade: Database["public"]["Enums"]["tipo_validade_liberacao"]
          tipo_visita: string
          updated_at: string
          visitante_documento: string
          visitante_empresa: string | null
          visitante_nome: string
        }
        Insert: {
          autorizador_empresa_nome?: string | null
          autorizador_morador_id?: string | null
          autorizador_morador_nome?: string | null
          autorizador_sindico_nome?: string | null
          autorizador_unidade_id?: string | null
          condominio_id: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          observacoes?: string | null
          origem: Database["public"]["Enums"]["origem_liberacao"]
          palavra_chave?: string | null
          revogada_em?: string | null
          revogada_motivo?: string | null
          revogada_por?: string | null
          status?: Database["public"]["Enums"]["status_liberacao"]
          tipo_validade?: Database["public"]["Enums"]["tipo_validade_liberacao"]
          tipo_visita: string
          updated_at?: string
          visitante_documento: string
          visitante_empresa?: string | null
          visitante_nome: string
        }
        Update: {
          autorizador_empresa_nome?: string | null
          autorizador_morador_id?: string | null
          autorizador_morador_nome?: string | null
          autorizador_sindico_nome?: string | null
          autorizador_unidade_id?: string | null
          condominio_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_liberacao"]
          palavra_chave?: string | null
          revogada_em?: string | null
          revogada_motivo?: string | null
          revogada_por?: string | null
          status?: Database["public"]["Enums"]["status_liberacao"]
          tipo_validade?: Database["public"]["Enums"]["tipo_validade_liberacao"]
          tipo_visita?: string
          updated_at?: string
          visitante_documento?: string
          visitante_empresa?: string | null
          visitante_nome?: string
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
          morador_id: string | null
          tipo: Database["public"]["Enums"]["tipo_mudanca"]
          unidade_id: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          created_by?: string | null
          data: string
          id?: string
          morador_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_mudanca"]
          unidade_id: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          morador_id?: string | null
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
            foreignKeyName: "mudancas_morador_id_fkey"
            columns: ["morador_id"]
            isOneToOne: false
            referencedRelation: "moradores"
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
          bloco_id: string | null
          condominio_id: string
          created_at: string
          created_by: string | null
          data_hora: string
          descricao: string
          documento: string | null
          emerson_ciente: boolean
          finalizada_em: string | null
          id: string
          imagem_url: string | null
          morador_id: string | null
          nome_pessoa: string | null
          providencia: string | null
          reclamado_morador_id: string | null
          reclamado_nome: string | null
          reclamante_morador_id: string | null
          reclamante_nome: string | null
          sindico_ciente: boolean
          status: Database["public"]["Enums"]["status_ocorrencia"]
          tipo: string
          unidade_id: string | null
        }
        Insert: {
          bloco_id?: string | null
          condominio_id: string
          created_at?: string
          created_by?: string | null
          data_hora?: string
          descricao: string
          documento?: string | null
          emerson_ciente?: boolean
          finalizada_em?: string | null
          id?: string
          imagem_url?: string | null
          morador_id?: string | null
          nome_pessoa?: string | null
          providencia?: string | null
          reclamado_morador_id?: string | null
          reclamado_nome?: string | null
          reclamante_morador_id?: string | null
          reclamante_nome?: string | null
          sindico_ciente?: boolean
          status?: Database["public"]["Enums"]["status_ocorrencia"]
          tipo: string
          unidade_id?: string | null
        }
        Update: {
          bloco_id?: string | null
          condominio_id?: string
          created_at?: string
          created_by?: string | null
          data_hora?: string
          descricao?: string
          documento?: string | null
          emerson_ciente?: boolean
          finalizada_em?: string | null
          id?: string
          imagem_url?: string | null
          morador_id?: string | null
          nome_pessoa?: string | null
          providencia?: string | null
          reclamado_morador_id?: string | null
          reclamado_nome?: string | null
          reclamante_morador_id?: string | null
          reclamante_nome?: string | null
          sindico_ciente?: boolean
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
      orientacoes: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          fixado: boolean
          id: string
          mensagem: string
          origem: Database["public"]["Enums"]["origem_orientacao"] | null
          tipo: Database["public"]["Enums"]["tipo_orientacao"]
          titulo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          fixado?: boolean
          id?: string
          mensagem: string
          origem?: Database["public"]["Enums"]["origem_orientacao"] | null
          tipo?: Database["public"]["Enums"]["tipo_orientacao"]
          titulo: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          fixado?: boolean
          id?: string
          mensagem?: string
          origem?: Database["public"]["Enums"]["origem_orientacao"] | null
          tipo?: Database["public"]["Enums"]["tipo_orientacao"]
          titulo?: string
        }
        Relationships: []
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
      solicitacoes: {
        Row: {
          condominio_id: string
          created_at: string
          created_by: string | null
          data_conclusao: string | null
          data_solicitacao: string
          descricao: string
          id: string
          morador_id: string | null
          morador_nome: string | null
          pago: boolean
          status: Database["public"]["Enums"]["status_solicitacao"]
          tipo: Database["public"]["Enums"]["tipo_solicitacao"]
          unidade_id: string | null
          valor: number | null
        }
        Insert: {
          condominio_id: string
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_solicitacao?: string
          descricao: string
          id?: string
          morador_id?: string | null
          morador_nome?: string | null
          pago?: boolean
          status?: Database["public"]["Enums"]["status_solicitacao"]
          tipo: Database["public"]["Enums"]["tipo_solicitacao"]
          unidade_id?: string | null
          valor?: number | null
        }
        Update: {
          condominio_id?: string
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_solicitacao?: string
          descricao?: string
          id?: string
          morador_id?: string | null
          morador_nome?: string | null
          pago?: boolean
          status?: Database["public"]["Enums"]["status_solicitacao"]
          tipo?: Database["public"]["Enums"]["tipo_solicitacao"]
          unidade_id?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
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
      usuarios_condominios: {
        Row: {
          condominio_id: string
          created_at: string
          id: string
          usuario_id: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          id?: string
          usuario_id: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          id?: string
          usuario_id?: string
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
      user_has_condominio: {
        Args: { _condominio_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operador" | "sindico"
      destino_chamado: "manutencao" | "ti" | "terceiros"
      origem_chamado: "sindico" | "morador" | "operador" | "manutencao"
      origem_liberacao: "morador" | "sindico" | "empresa"
      origem_orientacao: "interna" | "sindico" | "morador"
      prioridade_aviso: "normal" | "urgente"
      status_chamado:
        | "pendente"
        | "em_andamento"
        | "concluido"
        | "aberto"
        | "aguardando_terceiro"
        | "resolvido"
        | "cancelado"
      status_liberacao: "ativa" | "expirada" | "revogada"
      status_ocorrencia: "em_andamento" | "finalizada"
      status_solicitacao:
        | "pendente"
        | "em_andamento"
        | "concluido"
        | "cancelado"
      tipo_aviso: "informativo" | "urgente" | "manutencao"
      tipo_chamado: "manutencao" | "ti"
      tipo_mudanca: "entrada" | "saida"
      tipo_orientacao: "informativo" | "alerta" | "urgente"
      tipo_solicitacao: "tag" | "controle" | "imagens" | "acesso" | "outros"
      tipo_validade_liberacao: "unica" | "periodo" | "permanente"
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
      destino_chamado: ["manutencao", "ti", "terceiros"],
      origem_chamado: ["sindico", "morador", "operador", "manutencao"],
      origem_liberacao: ["morador", "sindico", "empresa"],
      origem_orientacao: ["interna", "sindico", "morador"],
      prioridade_aviso: ["normal", "urgente"],
      status_chamado: [
        "pendente",
        "em_andamento",
        "concluido",
        "aberto",
        "aguardando_terceiro",
        "resolvido",
        "cancelado",
      ],
      status_liberacao: ["ativa", "expirada", "revogada"],
      status_ocorrencia: ["em_andamento", "finalizada"],
      status_solicitacao: [
        "pendente",
        "em_andamento",
        "concluido",
        "cancelado",
      ],
      tipo_aviso: ["informativo", "urgente", "manutencao"],
      tipo_chamado: ["manutencao", "ti"],
      tipo_mudanca: ["entrada", "saida"],
      tipo_orientacao: ["informativo", "alerta", "urgente"],
      tipo_solicitacao: ["tag", "controle", "imagens", "acesso", "outros"],
      tipo_validade_liberacao: ["unica", "periodo", "permanente"],
    },
  },
} as const
