import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { addDays, format, isBefore, isValid, parse, startOfDay } from 'date-fns'

type Expense = {
  id: string
  dataLcto: Date | null
  categoria: string
  favorecido: string
  valor: number
  dataVencimento: Date | null
  dataPagamento: Date | null
  valorValidado?: string
  boletoDisponibilizado?: string
  controleStatus?: string
  unidade: string
  mes: string
  statusPagamento: string
}

type Filters = {
  unidade: string
  categoria: string
  status: string
  mes: string
  favorecido: string
  search: string
  vencimentoInicio: string
  vencimentoFim: string
  lancamentoInicio: string
  lancamentoFim: string
}

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2IF0GOiVlwB2jOetxh7zQyLyQ73a3l3awAMm0Nc2qUg-ZAtn7DiTmXK2Qw0TxromFGl9XZeV2-E9s/pub?gid=0&single=true&output=csv'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
})

const formatCurrency = (value: number) => currencyFormatter.format(value || 0)
const formatDate = (value: Date | null) => (value ? format(value, 'dd/MM/yyyy') : '—')

const normalizeKey = (key: string) =>
  key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const parseCurrency = (value: string) => {
  if (!value) return 0
  const sanitized = value.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const parsed = Number.parseFloat(sanitized)
  return Number.isFinite(parsed) ? parsed : 0
}

const parseDateString = (value?: string | null) => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = parse(trimmed, 'dd/MM/yyyy', new Date())
  return isValid(parsed) ? parsed : null
}

const buildExpense = (row: Record<string, string>, index: number): Expense | null => {
  const normalizedRow: Record<string, string> = {}
  Object.entries(row).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    const stringValue = typeof value === 'string' ? value.trim() : String(value)
    if (!stringValue) return
    normalizedRow[normalizeKey(key)] = stringValue
  })

  const categoria = normalizedRow['categoria'] ?? ''
  const favorecido = normalizedRow['favorecido'] ?? ''
  const unidade = normalizedRow['unidade'] ?? ''
  const valor = parseCurrency(normalizedRow['valor'] ?? '')
  const dataVencimento =
    parseDateString(normalizedRow['data vencimento'] ?? normalizedRow['datavencimento']) ?? null
  const dataPagamento =
    parseDateString(normalizedRow['data pagamento'] ?? normalizedRow['datapagamento']) ?? null
  const dataLcto = parseDateString(normalizedRow['data lcto'] ?? normalizedRow['datalcto']) ?? null
  const mes = normalizedRow['mes'] ?? ''
  const statusPagamento = normalizedRow['status pagamento'] ?? ''
  const controleStatus = normalizedRow['controle de status'] ?? normalizedRow['controlestatus'] ?? ''
  const valorValidado = normalizedRow['valor validado ?'] ?? normalizedRow['valor validado'] ?? ''
  const boletoDisponibilizado = normalizedRow['boleto disponibilizado'] ?? ''

  if (!categoria && !favorecido && !unidade && !valor) return null

  return {
    id: `${index}-${favorecido}-${categoria}-${normalizedRow['data vencimento'] ?? ''}`,
    categoria,
    favorecido,
    unidade,
    valor,
    dataVencimento,
    dataPagamento,
    dataLcto,
    mes,
    statusPagamento,
    controleStatus,
    valorValidado,
    boletoDisponibilizado,
  }
}

const statusLabel = (expense: Expense) => expense.statusPagamento || 'Sem status'

const isPaid = (expense: Expense) => {
  const statusText = statusLabel(expense).toLowerCase()
  return Boolean(expense.dataPagamento) || statusText.includes('pago') || statusText.includes('liquid')
}

const isOverdue = (expense: Expense, today: Date) =>
  !isPaid(expense) &&
  Boolean(expense.dataVencimento) &&
  Boolean(expense.dataVencimento && expense.dataVencimento < today)

const COLORS = ['#ff5a50', '#0ea5e9', '#f59e0b', '#14b8a6', '#0f172a', '#f97316', '#6366f1']

const statusTone = (label: string) => {
  const normalized = label.toLowerCase()
  if (normalized.includes('atras')) return 'danger'
  if (normalized.includes('aberto') || normalized.includes('pendente')) return 'warning'
  if (normalized.includes('pago') || normalized.includes('confirm')) return 'success'
  return 'info'
}

const abbreviateUnit = (name: string) => {
  if (!name) return 'Sem unidade'
  const cleaned = name.replace(/\s+/g, ' ').trim()
  if (/castanheira/i.test(cleaned)) return 'TBE Castanheira'
  if (/^the barber express/i.test(cleaned)) {
    const remainder = cleaned.replace(/^the barber express\s*/i, '').trim()
    return remainder ? `TBE ${remainder}` : 'TBE'
  }
  if (cleaned.length > 18) {
    const initials = cleaned
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0]?.toUpperCase())
      .join('')
    return initials || cleaned
  }
  return cleaned
}

type UpcomingRange = 'today' | 'tomorrow' | '7' | '15' | '30'

function App() {
  const [brandSrc, setBrandSrc] = useState<string>('/logo.png')
  const [showEmail, setShowEmail] = useState<boolean>(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [filters, setFilters] = useState<Filters>({
    unidade: 'todas',
    categoria: 'todas',
    status: 'todos',
    mes: 'todos',
    favorecido: '',
    search: '',
    vencimentoInicio: '',
    vencimentoFim: '',
    lancamentoInicio: '',
    lancamentoFim: '',
  })
  const [sorting, setSorting] = useState<SortingState>([{ id: 'vencimento', desc: false }])
  const [upcomingTab, setUpcomingTab] = useState<UpcomingRange>('7')
  const [upcomingUnit, setUpcomingUnit] = useState<string>('todas')
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(CSV_URL)
      if (!response.ok) {
        throw new Error('Não foi possível carregar o CSV do Google Sheets.')
      }
      const content = await response.text()
      const parsed = Papa.parse<Record<string, string>>(content, {
        header: true,
        skipEmptyLines: true,
      })

      if (parsed.errors.length) {
        throw new Error('Erro ao ler o CSV. Tente novamente em instantes.')
      }

      const mapped = parsed.data
        .map((row, index) => buildExpense(row, index))
        .filter((item): item is Expense => Boolean(item))

      setExpenses(mapped)
      setLastUpdated(new Date())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao buscar dados.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const today = startOfDay(new Date())

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (filters.unidade !== 'todas' && expense.unidade !== filters.unidade) return false
      if (filters.categoria !== 'todas' && expense.categoria !== filters.categoria) return false
      if (filters.status !== 'todos') {
        const statusText = statusLabel(expense).toLowerCase()
        if (!statusText.includes(filters.status.toLowerCase())) return false
      }
      if (filters.mes !== 'todos') {
        const referenceDate = expense.dataVencimento ?? expense.dataLcto
        const monthKey = referenceDate ? format(referenceDate, 'yyyy-MM') : ''
        if (monthKey !== filters.mes) return false
      }
      if (
        filters.favorecido &&
        !expense.favorecido.toLowerCase().includes(filters.favorecido.toLowerCase())
      ) {
        return false
      }

      if (filters.search) {
        const needle = filters.search.toLowerCase()
        const haystack = [
          expense.favorecido,
          expense.categoria,
          expense.unidade,
          statusLabel(expense),
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(needle)) return false
      }

      const vencimentoInicio = filters.vencimentoInicio
        ? startOfDay(new Date(filters.vencimentoInicio))
        : null
      const vencimentoFim = filters.vencimentoFim
        ? addDays(startOfDay(new Date(filters.vencimentoFim)), 1)
        : null
      const lancamentoInicio = filters.lancamentoInicio
        ? startOfDay(new Date(filters.lancamentoInicio))
        : null
      const lancamentoFim = filters.lancamentoFim
        ? addDays(startOfDay(new Date(filters.lancamentoFim)), 1)
        : null

      if (vencimentoInicio && (!expense.dataVencimento || isBefore(expense.dataVencimento, vencimentoInicio))) {
        return false
      }
      if (vencimentoFim && (!expense.dataVencimento || !isBefore(expense.dataVencimento, vencimentoFim))) {
        return false
      }
      if (lancamentoInicio && (!expense.dataLcto || isBefore(expense.dataLcto, lancamentoInicio))) {
        return false
      }
      if (lancamentoFim && (!expense.dataLcto || !isBefore(expense.dataLcto, lancamentoFim))) {
        return false
      }

      return true
    })
  }, [expenses, filters])

  const totals = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.valor, 0)
    const vencido = expenses
      .filter((e) => isOverdue(e, today))
      .reduce((sum, e) => sum + e.valor, 0)
    const aVencer = expenses
      .filter((e) => !isPaid(e) && e.dataVencimento && !isOverdue(e, today))
      .reduce((sum, e) => sum + e.valor, 0)
    const pago = expenses.filter(isPaid).reduce((sum, e) => sum + e.valor, 0)

    return { total, vencido, aVencer, pago }
  }, [expenses, today])

  const unitTotals = useMemo(() => {
    const grouped: Record<string, number> = {}
    expenses.forEach((expense) => {
      const unit = expense.unidade || 'Sem unidade'
      grouped[unit] = (grouped[unit] ?? 0) + expense.valor
    })
    return Object.entries(grouped).map(([fullName, value]) => ({
      name: abbreviateUnit(fullName),
      fullName,
      value,
    }))
  }, [expenses])

  const expensesForCharts = useMemo(
    () => (selectedUnit ? expenses.filter((e) => e.unidade === selectedUnit) : expenses),
    [expenses, selectedUnit],
  )

  const categoryTotals = useMemo(() => {
    const grouped: Record<string, number> = {}
    expensesForCharts.forEach((expense) => {
      const cat = expense.categoria || 'Sem categoria'
      grouped[cat] = (grouped[cat] ?? 0) + expense.valor
    })
    const ordered = Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    const totalValue = ordered.reduce((sum, item) => sum + item.value, 0) || 1
    const top = ordered.slice(0, 8)
    const restTotal = ordered.slice(8).reduce((sum, item) => sum + item.value, 0)
    const baseList = restTotal > 0 ? [...top, { name: 'Outras', value: restTotal }] : top
    return baseList.map((item) => ({
      ...item,
      perc: Math.round((item.value / totalValue) * 100),
    }))
  }, [expensesForCharts])

  const monthlyTotals = useMemo(() => {
    const grouped: Record<string, { label: string; total: number; sortValue: number }> = {}
    expensesForCharts.forEach((expense) => {
      const date = expense.dataVencimento ?? expense.dataLcto
      if (!date) return
      const label = format(date, 'MMM yyyy')
      const sortValue = Number(format(date, 'yyyyMM'))
      grouped[label] = grouped[label]
        ? { ...grouped[label], total: grouped[label].total + expense.valor }
        : { label, total: expense.valor, sortValue }
    })
    return Object.values(grouped).sort((a, b) => a.sortValue - b.sortValue)
  }, [expensesForCharts])

  const upcoming = useMemo(() => {
    const byRange = (range: UpcomingRange) => {
      const start =
        range === 'tomorrow' ? addDays(today, 1) : range === 'today' ? today : today
      const end =
        range === 'today'
          ? addDays(today, 1)
          : range === 'tomorrow'
            ? addDays(today, 2)
            : addDays(today, Number(range))

      return expenses
        .filter((expense) => {
          const matchesUnit = upcomingUnit === 'todas' || expense.unidade === upcomingUnit
          if (!matchesUnit || !expense.dataVencimento || isPaid(expense)) return false
          return (
            !isBefore(expense.dataVencimento, start) &&
            isBefore(expense.dataVencimento, end)
          )
        })
        .sort((a, b) => {
          const dateA = a.dataVencimento ? a.dataVencimento.getTime() : 0
          const dateB = b.dataVencimento ? b.dataVencimento.getTime() : 0
          return dateA - dateB
        })
    }

    return {
      today: byRange('today'),
      tomorrow: byRange('tomorrow'),
      '7': byRange('7'),
      '15': byRange('15'),
      '30': byRange('30'),
    }
  }, [expenses, today, upcomingUnit])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    expenses.forEach((expense) => {
      const label = statusLabel(expense)
      counts[label] = (counts[label] ?? 0) + 1
    })
    const total = expenses.length || 1
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, perc: Math.round((value / total) * 100) }))
      .sort((a, b) => b.value - a.value)
  }, [expenses])

  const uniqueValues = useMemo(() => {
    const unidades = Array.from(new Set(expenses.map((e) => e.unidade).filter(Boolean))).sort()
    const categorias = Array.from(new Set(expenses.map((e) => e.categoria).filter(Boolean))).sort()
    const statuses = Array.from(new Set(expenses.map((e) => statusLabel(e)).filter(Boolean))).sort()
    const monthKeys = Array.from(
      new Set(
        expenses
          .map((e) => e.dataVencimento ?? e.dataLcto)
          .filter((date): date is Date => Boolean(date))
          .map((date) => format(date, 'yyyy-MM')),
      ),
    ).sort()
    const months = monthKeys.map((value) => ({
      value,
      label: format(parse(value, 'yyyy-MM', new Date()), 'MMM/yyyy'),
    }))
    return { unidades, categorias, statuses, months }
  }, [expenses])

  const resetFilters = () =>
    setFilters({
      unidade: 'todas',
      categoria: 'todas',
      status: 'todos',
      mes: 'todos',
      favorecido: '',
      search: '',
      vencimentoInicio: '',
      vencimentoFim: '',
      lancamentoInicio: '',
      lancamentoFim: '',
    })

  const columns: ColumnDef<Expense>[] = [
    {
      header: 'Vencimento',
      id: 'vencimento',
      accessorFn: (row) => row.dataVencimento?.getTime() ?? 0,
      cell: (info) => formatDate(info.row.original.dataVencimento),
    },
    {
      header: 'Lançamento',
      id: 'lancamento',
      accessorFn: (row) => row.dataLcto?.getTime() ?? 0,
      cell: (info) => formatDate(info.row.original.dataLcto),
    },
    {
      header: 'Favorecido',
      accessorKey: 'favorecido',
    },
    {
      header: 'Categoria',
      accessorKey: 'categoria',
    },
    {
      header: 'Unidade',
      accessorKey: 'unidade',
    },
    {
      header: 'Valor',
      accessorKey: 'valor',
      cell: (info) => formatCurrency(info.getValue<number>()),
    },
    {
      header: 'Controle de Status',
      id: 'controleStatus',
      accessorFn: (row) => row.controleStatus || 'Sem status',
      cell: (info) => {
        const label = info.row.original.controleStatus || 'Sem status'
        return <span className={`badge ${statusTone(label)}`}>{label}</span>
      },
    },
    {
      header: 'Status Pagamento',
      id: 'statusPagamento',
      accessorFn: (row) => row.statusPagamento || 'Sem status',
      cell: (info) => {
        const expense = info.row.original
        const overdue = isOverdue(expense, today)
        const paid = isPaid(expense)
        const tone = paid ? 'success' : overdue ? 'danger' : 'warning'
        return <span className={`badge ${tone}`}>{expense.statusPagamento || 'Sem status'}</span>
      },
    },
    {
      header: 'Pagamento',
      id: 'pagamento',
      accessorFn: (row) => row.dataPagamento?.getTime() ?? 0,
      cell: (info) => formatDate(info.row.original.dataPagamento),
    },
  ]

  const table = useReactTable({
    data: filteredExpenses,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const renderStatusChips = () =>
    statusCounts.map((item) => (
      <div key={item.name} className={`chip ${statusTone(item.name)}`}>
        <div className="chip-main">
          <span>{item.name}</span>
          <strong>{item.value}</strong>
        </div>
        <span className="chip-perc">{item.perc}%</span>
      </div>
    ))

  const renderUpcomingList = (range: UpcomingRange) => {
    const list = upcoming[range]
    if (!list.length) {
      return <p className="muted">Nenhuma despesa no período selecionado.</p>
    }
    return (
      <div className="upcoming-list">
        {list.map((expense) => (
          <div
            key={expense.id}
            className={`upcoming-card ${isOverdue(expense, today) ? 'overdue' : ''}`}
          >
            <div>
              <p className="label">{expense.categoria}</p>
              <p className="title">{expense.favorecido}</p>
              <p className="muted">{abbreviateUnit(expense.unidade) || 'Sem unidade'}</p>
            </div>
            <div className="right">
              <p className="value">{formatCurrency(expense.valor)}</p>
              <p className="muted">Vence em {formatDate(expense.dataVencimento)}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

    return (
      <div className="page">
      <header className="hero">
        <div className="hero-left">
          <div className="brand">
            <img
              src={brandSrc}
              alt="The Barber Express"
              className="brand-logo"
              onError={() => setBrandSrc('/logo.svg')}
            />
            <div>
              <h1>Contas a pagar · THE BARBER EXPRESS</h1>
              <p className="muted">Visual inteligente conectado ao Google Sheets. Somente leitura.</p>
            </div>
          </div>
          <div className="hero-actions">
            <button className="primary" onClick={loadData} disabled={loading}>
              {loading ? 'Sincronizando...' : 'Atualizar dados'}
            </button>
            {lastUpdated && (
              <span className="muted">Última atualização: {formatDate(lastUpdated)}</span>
            )}
            <button className="ghost small" onClick={() => setShowEmail((prev) => !prev)}>
              Desenvolvedor: Luan Matheus
            </button>
            {showEmail && <span className="muted">luanmca1@gmail.com</span>}
          </div>
        </div>
      </header>

      {error && <div className="alert danger">{error}</div>}

      <section className="cards">
        <div className="card kpi">
          <p className="label">Total de despesas</p>
          <h2>{formatCurrency(totals.total)}</h2>
          <p className="muted">{expenses.length} lançamentos</p>
        </div>
        <div className="card kpi danger">
          <p className="label">Total vencido</p>
          <h2>{formatCurrency(totals.vencido)}</h2>
          <p className="muted">Em vermelho e alta prioridade</p>
        </div>
        <div className="card kpi warning">
          <p className="label">Total a vencer</p>
          <h2>{formatCurrency(totals.aVencer)}</h2>
          <p className="muted">Próximos vencimentos e abertos</p>
        </div>
        <div className="card kpi success">
          <p className="label">Total pago</p>
          <h2>{formatCurrency(totals.pago)}</h2>
          <p className="muted">Quitados ou confirmados</p>
        </div>
      </section>

      <section className="status-chips">
        <div className="section-title">
          <h3>Status das despesas</h3>
          <p className="muted">Distribuição por status informado na planilha (percentual)</p>
        </div>
        <div className="chips">{renderStatusChips()}</div>
      </section>

      <section className="charts">
        <div className="card chart">
          <div className="section-title">
            <h3>Total por unidade</h3>
            <p className="muted">
              Clique para focar nas outras visões (categorias e evolução mensal)
            </p>
          </div>
          {selectedUnit && (
            <div className="focus-pill">
              Foco em {abbreviateUnit(selectedUnit)}{' '}
              <button className="ghost small" onClick={() => setSelectedUnit(null)}>
                limpar
              </button>
            </div>
          )}
          <div className="chart-scroll">
            <ResponsiveContainer
              width="100%"
              height={Math.max(480, unitTotals.length * 48)}
            >
              <BarChart
                data={unitTotals}
                layout="vertical"
                margin={{ left: 0, right: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis type="number" tickFormatter={formatCurrency} />
                <YAxis type="category" dataKey="name" width={140} />
                <RechartsTooltip
                  formatter={(value: number, _name, props) =>
                    [formatCurrency(value), props?.payload?.fullName ?? props?.payload?.name]
                  }
                />
                <Bar
                  dataKey="value"
                  radius={[8, 8, 8, 8]}
                  onClick={(data) => {
                    const fullName = (data?.payload as { fullName?: string })?.fullName
                    if (fullName) {
                      setSelectedUnit((prev) => (prev === fullName ? null : fullName))
                    }
                  }}
                  cursor="pointer"
                >
                  {unitTotals.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart">
          <div className="section-title">
            <h3>Distribuição por categoria</h3>
            <p className="muted">
              Ranking das categorias (top 8 + outras){' '}
              {selectedUnit ? `· unidade ${abbreviateUnit(selectedUnit)}` : ''}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryTotals} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis type="number" tickFormatter={formatCurrency} />
              <YAxis type="category" dataKey="name" width={140} />
              <RechartsTooltip
                formatter={(value: number, _name, props) =>
                  `${formatCurrency(value)} · ${props?.payload?.perc ?? 0}%`
                }
              />
              <Bar
                dataKey="value"
                radius={[8, 8, 8, 8]}
                label={({ payload }: any) => (payload?.perc ? `${payload.perc}%` : '')}
              >
                {categoryTotals.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart">
          <div className="section-title">
            <h3>Evolução mensal</h3>
            <p className="muted">
              Linhas/área somando os valores por mês{' '}
              {selectedUnit ? `· unidade ${abbreviateUnit(selectedUnit)}` : ''}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyTotals} margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={formatCurrency} />
              <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#ff5a50"
                fill="#ff5a50"
                fillOpacity={0.25}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="filters card">
        <div className="section-title">
          <h3>Filtros inteligentes</h3>
          <p className="muted">Refine a lista sem alterar a planilha original</p>
        </div>
        <div className="filter-grid">
          <div className="field">
            <label>Unidade</label>
            <select
              value={filters.unidade}
              onChange={(e) => setFilters({ ...filters, unidade: e.target.value })}
            >
              <option value="todas">Todas</option>
              {uniqueValues.unidades.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Categoria</label>
            <select
              value={filters.categoria}
              onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
            >
              <option value="todas">Todas</option>
              {uniqueValues.categorias.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="todos">Todos</option>
              {uniqueValues.statuses.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Mês (vencimento)</label>
            <select value={filters.mes} onChange={(e) => setFilters({ ...filters, mes: e.target.value })}>
              <option value="todos">Todos</option>
              {uniqueValues.months.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Favorecido</label>
            <input
              type="text"
              placeholder="Buscar favorecido"
              value={filters.favorecido}
              onChange={(e) => setFilters({ ...filters, favorecido: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Busca geral</label>
            <input
              type="text"
              placeholder="Categoria, status, unidade..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Vencimento (início)</label>
            <input
              type="date"
              value={filters.vencimentoInicio}
              onChange={(e) => setFilters({ ...filters, vencimentoInicio: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Vencimento (fim)</label>
            <input
              type="date"
              value={filters.vencimentoFim}
              onChange={(e) => setFilters({ ...filters, vencimentoFim: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Lançamento (início)</label>
            <input
              type="date"
              value={filters.lancamentoInicio}
              onChange={(e) => setFilters({ ...filters, lancamentoInicio: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Lançamento (fim)</label>
            <input
              type="date"
              value={filters.lancamentoFim}
              onChange={(e) => setFilters({ ...filters, lancamentoFim: e.target.value })}
            />
          </div>
        </div>
        <div className="filter-actions">
          <p className="muted">
            Lista atual filtrada: <strong>{filteredExpenses.length}</strong> registros
          </p>
          <button className="ghost" onClick={resetFilters}>
            Limpar filtros
          </button>
        </div>
      </section>

      <section className="card table-card">
        <div className="section-title">
          <div>
            <h3>Despesas filtráveis</h3>
            <p className="muted">
              Ordene, pagine e exporte visualmente. Apenas leitura do Google Sheets.
            </p>
          </div>
          <div className="table-actions">
            <span className="badge subtle">Total: {filteredExpenses.length}</span>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={header.column.getCanSort() ? 'sortable' : ''}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' ▲',
                        desc: ' ▼',
                      }[header.column.getIsSorted() as string] ?? null}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => {
                const expense = row.original
                const rowClass = isOverdue(expense, today)
                  ? 'row overdue'
                  : isPaid(expense)
                    ? 'row paid'
                    : 'row'
                return (
                  <tr key={row.id} className={rowClass}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <div className="pagination-left">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Anterior
            </button>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Próxima
            </button>
            <span className="muted">
              Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
            </span>
          </div>
          <div className="pagination-right">
            <label className="muted">Itens por página</label>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card upcoming">
        <div className="section-title">
          <div>
            <h3>Proximos vencimentos</h3>
            <p className="muted">Apenas leitura, focado no que vence em breve</p>
          </div>
          <div className="upcoming-actions">
            <select value={upcomingUnit} onChange={(e) => setUpcomingUnit(e.target.value)}>
              <option value="todas">Todas as unidades</option>
              {uniqueValues.unidades.map((option) => (
                <option key={option} value={option}>
                  {abbreviateUnit(option)}
                </option>
              ))}
            </select>
            <div className="tabs">
              {(['today', 'tomorrow', '7', '15', '30'] as UpcomingRange[]).map((range) => (
                <button
                  key={range}
                  className={range === upcomingTab ? 'tab active' : 'tab'}
                  onClick={() => setUpcomingTab(range)}
                >
                  {range === 'today' ? 'Hoje' : range === 'tomorrow' ? 'Amanha' : 'Prox. ' + range + ' dias'}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderUpcomingList(upcomingTab)}
      </section>
    </div>
  )
}

export default App


