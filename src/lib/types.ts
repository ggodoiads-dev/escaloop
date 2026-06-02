export type Perfil = 'gestor' | 'lider' | 'colaborador' | 'rh'
export type Turno = 'A' | 'B' | 'C'
export type StatusLancamento = 'presente' | 'falta_injustificada' | 'falta_atestado' | 'folga' | 'atraso' | 'troca_turno' | 'pendente'
export type StatusAtestado = 'pendente' | 'validado' | 'recusado'

export interface Colaborador {
  id: string
  nome: string
  email: string
  contato: string
  turno: Turno
  setor: string
  perfil: Perfil
  ativo: boolean
  data_admissao: string
  data_desligamento?: string
  folga1_inicial: string
  folga2_inicial: string
  user_id?: string
}

export interface Lancamento {
  id: string
  colaborador_id: string
  data: string
  status: StatusLancamento
  horario_atraso?: string
  justificativa?: string
  lider_id: string
  created_at: string
  colaborador?: Colaborador
}

export interface Ocorrencia {
  id: string
  colaborador_id: string
  tipo: string
  descricao: string
  data: string
  responsavel_id: string
  created_at: string
  colaborador?: Colaborador
}

export interface MedidaDisciplinar {
  id: string
  colaborador_id: string
  tipo: string
  descricao: string
  data: string
  gestor_id: string
  created_at: string
}

export interface Atestado {
  id: string
  colaborador_id: string
  lancamento_id: string
  data_falta: string
  arquivo_url?: string
  token: string
  status: StatusAtestado
  validado_por?: string
  created_at: string
  colaborador?: Colaborador
}

export interface DiaEscala {
  data: string
  status: StatusLancamento | 'trabalho' | 'folga_programada'
  eh_folga: boolean
  lancamento?: Lancamento
}
