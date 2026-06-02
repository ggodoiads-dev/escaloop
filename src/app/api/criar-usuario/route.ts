import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: colab } = await supabase
    .from('colaboradores')
    .select('perfil')
    .eq('user_id', user.id)
    .single()

  if (!colab || colab.perfil !== 'gestor') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { email, password, colaborador_id } = await request.json()

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { colaborador_id },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ user_id: data.user.id })
}
