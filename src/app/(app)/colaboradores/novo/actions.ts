'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

interface ColaboradorInput {
  perfil: string
  nome: string
  contato: string
  turno: string
  setor: string
  folga1: string
  folga2: string
  email: string
  senha: string
  isAdm: boolean
}

export async function criarColaborador(input: ColaboradorInput) {
  // Verifica se quem chama é um gestor autenticado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autorizado' }

  const { data: gestor } = await supabase
    .from('colaboradores')
    .select('perfil')
    .eq('user_id', user.id)
    .single()

  if (!gestor || gestor.perfil !== 'gestor') {
    return { error: 'Sem permissão' }
  }

  const admin = createAdminClient()

  // Insere colaborador usando service role (bypass RLS)
  const { data: colabData, error: insertError } = await admin
    .from('colaboradores')
    .insert({
      nome: input.nome,
      email: input.email,
      contato: input.contato,
      turno: input.turno,
      setor: input.setor,
      perfil: input.perfil,
      folga1_inicial: input.isAdm ? null : input.folga1,
      folga2_inicial: input.isAdm ? null : input.folga2,
      ativo: true,
      data_admissao: format(new Date(), 'yyyy-MM-dd'),
    })
    .select()
    .single()

  if (insertError) return { error: insertError.message }

  // Cria conta de acesso no Auth
  const { error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.senha,
    email_confirm: true,
    user_metadata: { colaborador_id: colabData.id },
  })

  if (authError && !authError.message.includes('already been registered')) {
    console.warn('Auth warning:', authError.message)
  }

  return { success: true, id: colabData.id }
}
