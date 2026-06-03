import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/lancamentos?inicio=2026-06-01&fim=2026-06-30&colaborador_ids=id1,id2
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const inicio = searchParams.get('inicio')
  const fim = searchParams.get('fim')
  const ids = searchParams.get('colaborador_ids')?.split(',').filter(Boolean)
  const data_param = searchParams.get('data')

  const admin = createAdminClient()
  let query = admin.from('lancamentos').select('*')

  if (inicio && fim) {
    query = query.gte('data', inicio).lte('data', fim)
  }
  if (data_param) {
    query = query.eq('data', data_param)
  }
  if (ids && ids.length > 0) {
    query = query.in('colaborador_id', ids)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

// POST /api/lancamentos — upsert
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Verifica se é gestor ou lider (via admin client, sem RLS)
  const admin = createAdminClient()
  const { data: eu } = await admin
    .from('colaboradores')
    .select('id, perfil')
    .eq('user_id', user.id)
    .single()

  if (!eu || !['gestor', 'lider'].includes(eu.perfil)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const payload = await request.json()

  const { data, error } = await admin
    .from('lancamentos')
    .upsert({ ...payload, lider_id: eu.id }, { onConflict: 'colaborador_id,data' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
