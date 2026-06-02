import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: eu } = await supabase
    .from('colaboradores')
    .select('perfil, nome, turno')
    .eq('user_id', user.id)
    .single()

  const perfil = eu?.perfil
  const hoje = format(new Date(), 'yyyy-MM-dd')

  // Colaborador: redireciona para minha escala
  if (perfil === 'colaborador') redirect('/minha-escala')

  // Busca lançamentos de hoje
  let lancamentosQuery = supabase
    .from('lancamentos')
    .select('*, colaborador:colaboradores(nome, turno, setor)')
    .eq('data', hoje)

  if (perfil === 'lider') {
    lancamentosQuery = lancamentosQuery.eq('colaboradores.turno', eu?.turno)
  }

  const { data: lancamentos } = await lancamentosQuery

  const presentes = lancamentos?.filter(l => l.status === 'presente').length ?? 0
  const faltas = lancamentos?.filter(l => l.status === 'falta_injustificada').length ?? 0
  const atrasos = lancamentos?.filter(l => l.status === 'atraso').length ?? 0
  const pendentes = lancamentos?.filter(l => l.status === 'pendente').length ?? 0

  // Atestados pendentes
  const { data: atestados } = await supabase
    .from('atestados')
    .select('*, colaborador:colaboradores(nome, turno)')
    .eq('status', 'pendente')
    .order('created_at', { ascending: false })
    .limit(10)

  // Alertas de faltas
  const { data: alertas } = await supabase
    .from('lancamentos')
    .select('*, colaborador:colaboradores(nome, turno, setor)')
    .eq('data', hoje)
    .eq('status', 'falta_injustificada')
    .order('created_at', { ascending: false })

  const total = (lancamentos?.length ?? 0)
  const pct = total > 0 ? Math.round((presentes / total) * 100) : 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Painel do Dia</h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard icon={<CheckCircle className="text-green-500" size={22} />} label="Presentes" value={presentes} bg="bg-green-50" />
        <MetricCard icon={<AlertTriangle className="text-red-500" size={22} />} label="Faltas" value={faltas} bg="bg-red-50" />
        <MetricCard icon={<Clock className="text-yellow-500" size={22} />} label="Atrasos" value={atrasos} bg="bg-yellow-50" />
        <MetricCard icon={<FileText className="text-blue-500" size={22} />} label="Atestados Pendentes" value={pendentes + (atestados?.length ?? 0)} bg="bg-blue-50" />
      </div>

      {/* Barra de presença */}
      {total > 0 && (
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span>Taxa de Presença</span>
            <span className={pct >= 80 ? 'text-green-600' : 'text-red-600'}>{pct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{presentes} de {total} colaboradores presentes</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Alertas de faltas */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            Alertas de Hoje ({alertas?.length ?? 0})
          </h2>
          {alertas?.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhuma falta registrada hoje</p>
          ) : (
            <div className="space-y-2">
              {alertas?.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xs font-bold flex-shrink-0">
                    {a.colaborador?.nome?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.colaborador?.nome}</p>
                    <p className="text-xs text-gray-500">Turno {a.colaborador?.turno} · {a.colaborador?.setor}</p>
                  </div>
                  <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full whitespace-nowrap">Falta inj.</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Atestados pendentes */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText size={16} className="text-blue-500" />
            Atestados Aguardando Validação ({atestados?.length ?? 0})
          </h2>
          {atestados?.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhum atestado pendente</p>
          ) : (
            <div className="space-y-2">
              {atestados?.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">
                    {a.colaborador?.nome?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.colaborador?.nome}</p>
                    <p className="text-xs text-gray-500">Falta em {format(new Date(a.data_falta + 'T00:00:00'), 'dd/MM/yyyy')}</p>
                  </div>
                  <ValidarAtestadoBtn atestadoId={a.id} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-4 shadow-sm`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-gray-500">{label}</span></div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function ValidarAtestadoBtn({ atestadoId }: { atestadoId: string }) {
  return (
    <a href={`/atestados/${atestadoId}`} className="ml-auto text-xs bg-blue-500 text-white px-2 py-1 rounded-lg whitespace-nowrap hover:bg-blue-600">
      Validar
    </a>
  )
}
