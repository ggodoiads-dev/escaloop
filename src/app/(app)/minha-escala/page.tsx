import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getDiasDoMes, calcularFolgas } from '@/lib/escala'

const STATUS_INFO: Record<string, { label: string; bg: string; text: string }> = {
  presente:            { label: 'Presente', bg: 'bg-green-100', text: 'text-green-700' },
  falta_injustificada: { label: 'Falta', bg: 'bg-red-100', text: 'text-red-600' },
  falta_atestado:      { label: 'Falta/Atestado', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  pendente:            { label: 'Pendente', bg: 'bg-orange-100', text: 'text-orange-600' },
  atraso:              { label: 'Atraso', bg: 'bg-orange-50', text: 'text-orange-500' },
  troca_turno:         { label: 'Troca', bg: 'bg-purple-100', text: 'text-purple-600' },
  folga_programada:    { label: 'Folga', bg: 'bg-gray-100', text: 'text-gray-600' },
  trabalho:            { label: 'Trabalho', bg: 'bg-blue-50', text: 'text-blue-600' },
}

export default async function MinhaEscalaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: eu } = await supabase
    .from('colaboradores')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!eu) redirect('/login')

  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mesNum = hoje.getMonth() + 1
  const dias = getDiasDoMes(ano, mesNum)
  const hojeStr = format(hoje, 'yyyy-MM-dd')

  const { data: lancamentos } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('colaborador_id', eu.id)
    .gte('data', `${ano}-${String(mesNum).padStart(2, '0')}-01`)
    .lte('data', `${ano}-${String(mesNum).padStart(2, '0')}-31`)

  const mapa = new Map(lancamentos?.map(l => [l.data, l]) ?? [])
  const folgas = calcularFolgas(eu.folga1_inicial, eu.folga2_inicial)

  function getInfo(dia: string) {
    const lanc = mapa.get(dia)
    if (lanc) return { ...(STATUS_INFO[lanc.status] ?? STATUS_INFO.trabalho), lancamento: lanc }
    if (folgas.includes(dia)) return { ...STATUS_INFO.folga_programada, lancamento: null }
    if (dia > hojeStr) return { label: '', bg: '', text: '', lancamento: null }
    return { ...STATUS_INFO.trabalho, lancamento: null }
  }

  const faltasMes = lancamentos?.filter(l => l.status === 'falta_injustificada').length ?? 0
  const atrasosMes = lancamentos?.filter(l => l.status === 'atraso').length ?? 0
  const diasTrabalhados = lancamentos?.filter(l => l.status === 'presente').length ?? 0

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Minha Escala</h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(hoje, "MMMM 'de' yyyy", { locale: ptBR })} · Turno {eu.turno} · {eu.setor}
        </p>
      </div>

      {/* Estatísticas do mês */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Trabalhados', value: diasTrabalhados, cor: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Faltas', value: faltasMes, cor: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Atrasos', value: atrasosMes, cor: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-bold ${s.cor}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Calendário */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Espaços em branco para alinhar */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: new Date(ano, mesNum - 1, 1).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {dias.map(dia => {
            const info = getInfo(dia)
            const diaNum = parseInt(dia.split('-')[2])
            const ehHoje = dia === hojeStr
            return (
              <div key={dia}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-center p-1 ${info.bg}
                  ${ehHoje ? 'ring-2 ring-orange-400' : ''}`}>
                <span className={`text-xs font-bold ${info.text || 'text-gray-300'} ${ehHoje ? 'text-orange-600' : ''}`}>
                  {diaNum}
                </span>
                {info.label && (
                  <span className={`text-[9px] leading-tight ${info.text} font-medium mt-0.5 hidden sm:block`}>
                    {info.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 mt-4">
        {Object.entries(STATUS_INFO).filter(([k]) => k !== 'trabalho').map(([k, v]) => (
          <span key={k} className={`text-xs ${v.bg} ${v.text} px-2 py-0.5 rounded-full`}>{v.label}</span>
        ))}
      </div>
    </div>
  )
}
