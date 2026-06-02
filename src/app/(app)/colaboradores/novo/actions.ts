'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
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
  try {
    const supabase = await createClient()
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr) return { error: 'Erro de sessão: ' + userErr.message }
    if (!user) return { error: 'Não autorizado' }

    const admin = createAdminClient()

    // Verifica se é gestor
    const { data: gestor } = await admin
      .from('colaboradores').select('perfil').eq('user_id', user.id).single()
    if (!gestor || gestor.perfil !== 'gestor') return { error: 'Sem permissão de gestor' }

    // Insere colaborador (user_id ainda NULL — será preenchido abaixo)
    const { data: colabData, error: insertError } = await admin
      .from('colaboradores')
      .insert({
        nome: input.nome,
        email: input.email,
        contato: input.contato,
        turno: input.turno,
        setor: input.setor,
        perfil: input.perfil,
        folga1_inicial: input.isAdm ? null : input.folga1 || null,
        folga2_inicial: input.isAdm ? null : input.folga2 || null,
        ativo: true,
        data_admissao: format(new Date(), 'yyyy-MM-dd'),
      })
      .select()
      .single()

    if (insertError) return { error: 'Erro ao salvar: ' + insertError.message }

    // Cria conta de acesso no Auth
    let authUserId: string | null = null
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.senha,
      email_confirm: true,
      user_metadata: { colaborador_id: colabData.id },
    })

    if (authError) {
      if (authError.message.toLowerCase().includes('already') || authError.message.toLowerCase().includes('registered')) {
        // Usuário já existe no Auth — busca o ID existente
        const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
        const existing = users.find(u => u.email?.toLowerCase() === input.email.toLowerCase())
        if (existing) authUserId = existing.id
      } else {
        console.warn('Auth warning:', authError.message)
      }
    } else if (authData?.user) {
      authUserId = authData.user.id
    }

    // Linka user_id explicitamente (não depende só do trigger)
    if (authUserId) {
      await admin
        .from('colaboradores')
        .update({ user_id: authUserId })
        .eq('id', colabData.id)
    }

    revalidatePath('/colaboradores')
    return { success: true, id: colabData.id, perfil: colabData.perfil }
  } catch (e: any) {
    return { error: 'Erro inesperado: ' + (e?.message ?? 'desconhecido') }
  }
}
