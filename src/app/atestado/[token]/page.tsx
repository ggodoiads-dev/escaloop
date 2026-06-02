'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { use } from 'react'

export default function AtestadoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const supabase = createClient()
  const [atestado, setAtestado] = useState<any>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('atestados')
        .select('*, colaborador:colaboradores(nome)')
        .eq('token', token)
        .single()

      setAtestado(data)
      setLoading(false)
    }
    load()
  }, [token])

  async function enviar() {
    if (!arquivo || !atestado) return
    setEnviando(true)

    const ext = arquivo.name.split('.').pop()
    const path = `atestados/${atestado.id}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('atestados')
      .upload(path, arquivo, { upsert: true })

    if (uploadErr) { setErro('Erro ao enviar arquivo: ' + uploadErr.message); setEnviando(false); return }

    const { data: urlData } = supabase.storage.from('atestados').getPublicUrl(path)

    await supabase
      .from('atestados')
      .update({ arquivo_url: urlData.publicUrl, status: 'pendente' })
      .eq('id', atestado.id)

    setSucesso(true)
    setEnviando(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400">Carregando...</div>
    </div>
  )

  if (!atestado || atestado.status === 'validado') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        {atestado?.status === 'validado' ? (
          <>
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900">Atestado já enviado</h1>
            <p className="text-gray-500 text-sm mt-2">Seu atestado foi recebido e está sendo analisado.</p>
          </>
        ) : (
          <>
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900">Link inválido</h1>
            <p className="text-gray-500 text-sm mt-2">Este link não é válido ou expirou. Entre em contato com seu líder.</p>
          </>
        )}
      </div>
    </div>
  )

  if (sucesso) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900">Atestado enviado!</h1>
        <p className="text-gray-500 text-sm mt-2">Seu atestado foi recebido com sucesso. O RH irá analisá-lo em breve.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold">E</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Envio de Atestado</h1>
          <p className="text-sm text-gray-500 mt-1">LOG20 Logística</p>
        </div>

        <div className="bg-orange-50 rounded-xl p-4 mb-6 text-sm">
          <p className="text-gray-600">Colaborador: <strong className="text-gray-900">{atestado.colaborador?.nome}</strong></p>
          <p className="text-gray-600 mt-1">
            Data da falta: <strong className="text-gray-900">
              {format(new Date(atestado.data_falta + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </strong>
          </p>
        </div>

        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-orange-400 transition"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload size={32} className="mx-auto text-gray-400 mb-2" />
          {arquivo ? (
            <p className="text-sm font-medium text-orange-600">{arquivo.name}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Toque para selecionar foto ou arquivo</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG ou PDF · máx. 10MB</p>
            </>
          )}
        </div>
        <input
          id="file-input"
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={e => setArquivo(e.target.files?.[0] ?? null)}
          capture="environment"
        />

        {erro && <p className="text-red-500 text-xs mt-2 text-center">{erro}</p>}

        <button
          onClick={enviar}
          disabled={!arquivo || enviando}
          className="w-full mt-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition"
        >
          {enviando ? 'Enviando...' : 'Enviar Atestado'}
        </button>

        <p className="text-xs text-center text-gray-400 mt-4">
          Prazo: 48h após o lançamento da falta
        </p>
      </div>
    </div>
  )
}
