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
    // STEP 1: Verifica sessao
    const supabase = await createClient()
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr) return { error: 'Erro sessao: ' + userErr.message }
    if (!user) return { error: 'Nao autorizado - sem usuario' }

    // STEP 2: Verifica gestor
    const { data: gestor, error: gestorErr } = await supabase
      .from('colaboradores')
      .select('perfil')
      .eq('user_id', user.id)
      .single()
    if (gestorErr) return { error: 'Erro gestor: ' + gestorErr.message }
    if (!gestor || gestor.perfil !== 'gestor') return { error: 'Sem permissao de gestor' }

    // STEP 3: Cria admin client
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    const svcKeyClean = svcKey.replace(/^﻿/, '').trim()
    console.log('[criarColaborador] svcKey length:', svcKey.length, 'firstChar:', svcKey.charCodeAt(0), 'cleanLength:', svcKeyClean.length)

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
      .select()
      .single()

    if (insertError) return { error: 'Erro insert: ' + insertError.message }

    // STEP 5: Cria conta Auth
    const { error: authError } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.senha,
      email_confirm: true,
      user_metadata: { colaborador_id: colabData.id },
    })

    if (authError && !authError.message.includes('already been registered')) {
      console.warn('[criarColaborador] Auth warning:', authError.message)
    }

    return { success: true, id: colabData.id }
  } catch (e: any) {
    console.error('[criarColaborador] CAUGHT:', e?.message, e?.stack?.substring(0, 300))
    return { error: e?.message ?? 'Erro desconhecido' }
  }
}
