import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Verifica se o chamador é um gestor autenticado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: gestor } = await supabase
    .from('colaboradores')
    .select('perfil')
    .eq('user_id', user.id)
    .single()

  if (!gestor || gestor.perfil !== 'gestor') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { colaborador, password } = await request.json()

  const admin = createAdminClient()

  // 1. Insere colaborador usando service role (bypass RLS)
  const { data: colabData, error: insertError } = await admin
    .from('colaboradores')
    .insert(colaborador)
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  // 2. Cria conta de acesso no Auth (não afeta sessão do gestor)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: colaborador.email,
    password,
    email_confirm: true,
    user_metadata: { colaborador_id: colabData.id },
  })

  if (authError && !authError.message.includes('already been registered')) {
    // Não é erro crítico — colaborador foi criado, só o login ficou pendente
    console.warn('Auth warning:', authError.message)
  }

  return NextResponse.json({ id: colabData.id })
}
