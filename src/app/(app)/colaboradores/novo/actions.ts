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
    // Verifica sessao do gestor
    const supabase = await createClient()
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr) return { error: 'Erro de sessão: ' + userErr.message }
    if (!user) return { error: 'Não autorizado' }

    const { data: gestor, error: gestorErr } = await supabase
      .from('colaboradores').select('perfil').eq('user_id', user.id).single()
    if (gestorErr) return { error: 'Erro ao verificar gestor: ' + gestorErr.message }
    if (!gestor || gestor.perfil !== 'gestor') return { error: 'Sem permissão de gestor' }

    // Admin client (service role — bypass RLS)
    const admin = createAdminClient()

    // Insere colaborador
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
    const { error: authError } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.senha,
      email_confirm: true,
      user_metadata: { colaborador_id: colabData.id },
    })
    if (authError && !authError.message.includes('already been registered')) {
      console.warn('Auth warning:', authError.message)
    }

    // Invalida o cache da pagina de colaboradores para mostrar dados frescos
    revalidatePath('/colaboradores')

    return { success: true, id: colabData.id, perfil: colabData.perfil }
  } catch (e: any) {
    return { error: 'Erro inesperado: ' + (e?.message ?? 'desconhecido') }
  }
}
