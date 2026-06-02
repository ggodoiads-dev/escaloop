import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { calcularFolgas } from '@/lib/escala'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, Calendar, AlertTriangle } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  presente: 'Presente', falta_injustificada: 'Falta Injustificada',
  falta_atestado: 'Falta c/ Atestado', folga: 'Folga', atraso: 'Atraso',
  troca_turno: 'Troca de Turno', pendente: 'Pendente (atestado)',
}

const STATUS_COR: Record<string, string> = {
  presente: 'bg-green-100 text-green-700', falta_injustificada: 'bg-red-100 text-red-700',
  falta_atestado: 'bg-yellow-100 text-yellow-700', folga: 'bg-gray-100 text-gray-600',
  atraso: 'bg-orange-100 text-orange-700', troca_turno: 'bg-purple-100 text-purple-700',
  pendente: 'bg-orange-100 text-orange-700',
}

export default async function PerfilColaboradorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: eu } = await supabase
    .from('colaboradores').select('perfil').eq('user_id', user.id).single()

  const { data: colab } = await supabase
    .from('colaboradores').select('*').eq('id', id).single()

  if (!colab) redirect('/colaboradores')

  const hoje = new Date()
  const inicioMes = format(hoje, 'yyyy-MM-01')
  const inicioAno = format(hoje, 'yyyy-01-01')

  const { data: lancamentos } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('colaborador_id', id)
    .order('data', { ascending: false })
    .limit(30)

  const { data: ocorrencias } = await supabase
    .from('ocorrencias')
    .select('*')
    .eq('colaborador_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const faltasMes = lancamentos?.filter(l => l.data >= inicioMes && l.status === 'falta_injustificada').length ?? 0
  const faltasAno = lancamentos?.filter(l => l.data >= inicioAno && l.status === 'falta_injustificada').length ?? 0
  const atrasosMes = lancamentos?.filter(l => l.data >= inicioMes && l.status === 'atraso').length ?? 0

  const folgas = calcularFolgas(colab.folga1_inicial, colab.folga2_inicial)
  const proximaFolga = folgas.find(f => f >= format(hoje, 'yyyy-MM-dd'))

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/colaboradores" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition">
        <ArrowLeft size={16} /> Voltar para colaboradores
      </Link>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Card principal */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold text-2xl mx-auto mb-3">
                {colab.nome[0]}
              </div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight">{colab.nome}</h1>
              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full capitalize
                ${colab.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {colab.ativo ? colab.perfil : 'Inativo'}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail size={14} className="flex-shrink-0" />
                <span className="truncate">{colab.email}</span>
              </div>
              {colab.contato && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={14} className="flex-shrink-0" />
                  <span>{colab.contato}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={14} className="flex-shrink-0" />
                <span>Turno {colab.turno} · {colab.setor}</span>
              </div>
            </div>

            {proximaFolga && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
                <p className="text-gray-500">Próxima folga</p>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {format(new Date(proximaFolga + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            )}

            {eu?.perfil === 'gestor' && (
              <div className="mt-4 space-y-2">
                <Link href={`/colaboradores/${id}/editar`}
                  className="block w-full text-center text-sm bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg transition">
                  Editar dados
                </Link>
                <form action={`/api/colaboradores/${id}/status`} method="POST">
                  <button type="submit" name="action" value={colab.ativo ? 'inativar' : 'ativar'}
                    className="w-full text-sm border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium py-2 rounded-lg transition">
                    {colab.ativo ? 'Inativar' : 'Reativar'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Estatísticas */}
          <div className="bg-white rounded-xl shadow-sm p-5 mt-4">
            <h2 className="font-semibold text-gray-900 mb-3">Estatísticas</h2>
            <div className="space-y-2">
              {[
                { label: 'Faltas no mês', value: faltasMes, cor: faltasMes > 0 ? 'text-red-600' : 'text-gray-900' },
                { label: 'Faltas no ano', value: faltasAno, cor: faltasAno > 2 ? 'text-red-600' : 'text-gray-900' },
                { label: 'Atrasos no mês', value: atrasosMes, cor: atrasosMes > 0 ? 'text-orange-600' : 'text-gray-900' },
                { label: 'Ocorrências', value: ocorrencias?.length ?? 0, cor: 'text-gray-900' },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center py-1.5 border-b border-gray-50 text-sm">
                  <span className="text-gray-500">{s.label}</span>
                  <span className={`font-bold ${s.cor}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Histórico */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Histórico de Lançamentos</h2>
            {lancamentos?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Nenhum lançamento registrado</p>
            ) : (
              <div className="space-y-2">
                {lancamentos?.map(l => (
                  <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="text-sm">
                      <span className="text-gray-500">{format(new Date(l.data + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                      {l.horario_atraso && <span className="text-gray-400 ml-2 text-xs">às {l.horario_atraso}</span>}
                      {l.justificativa && <p className="text-xs text-gray-400 mt-0.5">{l.justificativa}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[l.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[l.status] ?? l.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(ocorrencias?.length ?? 0) > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-500" /> Ocorrências e Medidas Disciplinares
              </h2>
              <div className="space-y-3">
                {ocorrencias?.map(o => (
                  <div key={o.id} className="p-3 bg-orange-50 rounded-lg text-sm">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-orange-800">{o.tipo}</span>
                      <span className="text-xs text-gray-400">{format(new Date(o.created_at), 'dd/MM/yyyy')}</span>
                    </div>
                    {o.descricao && <p className="text-xs text-gray-600 mt-1">{o.descricao}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
