import { addDays, format, parseISO, isSameDay } from 'date-fns'

// Calcula todas as datas de folga no ciclo 6x2 a partir das duas primeiras
export function calcularFolgas(folga1: string, folga2: string, mesesAFrente = 12): string[] {
  const f1 = parseISO(folga1)
  const f2 = parseISO(folga2)
  const folgas: string[] = []

  // O ciclo é: trabalho 6 dias, folga 2 dias
  // f1 = 1º dia de folga, f2 = 2º dia de folga (deve ser f1 + 1)
  let dataAtual = f1
  const limite = addDays(new Date(), mesesAFrente * 30)

  while (dataAtual <= limite) {
    folgas.push(format(dataAtual, 'yyyy-MM-dd'))
    folgas.push(format(addDays(dataAtual, 1), 'yyyy-MM-dd'))
    dataAtual = addDays(dataAtual, 8) // 6 dias trabalho + 2 folga = próximo ciclo
  }

  return folgas
}

export function ehFolga(data: string, folga1: string, folga2: string): boolean {
  const folgas = calcularFolgas(folga1, folga2)
  return folgas.includes(data)
}

export function ehSegundoDiaFolga(data: string, folga1: string, folga2: string): boolean {
  const f1 = parseISO(folga1)
  let dataAtual = f1
  const limite = addDays(new Date(), 365)
  const target = parseISO(data)

  while (dataAtual <= limite) {
    const segundoDia = addDays(dataAtual, 1)
    if (isSameDay(segundoDia, target)) return true
    dataAtual = addDays(dataAtual, 8)
  }
  return false
}

export function getDiasDoMes(ano: number, mes: number): string[] {
  const dias: string[] = []
  const data = new Date(ano, mes - 1, 1)
  while (data.getMonth() === mes - 1) {
    dias.push(format(data, 'yyyy-MM-dd'))
    data.setDate(data.getDate() + 1)
  }
  return dias
}
