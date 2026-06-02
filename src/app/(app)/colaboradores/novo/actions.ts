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
  try {
    // Debug: inspeciona os env vars no servidor
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const debug = {
      svcKeyLen: svcKey.length,
      svcFirstCode: svcKey.charCodeAt(0),
      svcFirst4: svcKey.substring(0, 4),
      urlLen: url.length,
      urlFirstCode: url.charCodeAt(0),
    }

    // Se a chave estiver vazia ou com BOM, retorna erro detalhado
    if (!svcKey || svcKey.length < 100) {
      return { error: 'SERVICE_ROLE_KEY invalida: ' + JSON.stringify(debug) }
    }
    if (svcKey.charCodeAt(0) === 0xFEFF) {
      return { error: 'SERVICE_ROLE_KEY tem BOM: len=' + svcKey.length + ' firstCode=' + svcKey.charCodeAt(0) }
    }

    // STEP 1: Verifica sessao
    const supabase = await createClient()
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr) return { error: 'Erro sessao: ' + userErr.message }
    if (!user) return { error: 'Nao autorizado' }

    // STEP 2: Verifica gestor
    const { data: gestor, error: gestorErr } = await supabase
      .from('colaboradores').select('perfil').eq('user_id', user.id).single()
    if (gestorErr) return { error: 'Erro gestor: ' + gestorErr.message }
    if (!gestor || gestor.perfil !== 'gestor') return { error: 'Sem permissao de gestor' }

    // STEP 3: Admin client com chave limpa
    const admin = createAdminClient()

    // STEP 4: Insere colaborador
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
      .select().single()

    if (insertError) return { error: 'Erro insert: ' + insertError.message }

    // STEP 5: Cria conta Auth
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
  } catch (e: any) {
    return { error: 'CATCH: ' + (e?.message ?? 'desconhecido') }
  }
}
