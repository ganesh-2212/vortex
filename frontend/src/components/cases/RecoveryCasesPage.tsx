import { useState } from 'react'
import { Search, ChevronDown, ChevronUp, AlertCircle, RefreshCw, Filter } from 'lucide-react'
import { RiskBadge, StatusBadge } from '../common/LoaderAndStates'
import { FinancialValue } from '../common/FinancialValue'
import { formatNumber, formatCurrency } from '../../utils/formatters'

interface RecoveryCasesPageProps {
  cases: any[]
  priorities: any[]
  onSelectCase: (caseId: string) => void
}

type SortField = 'id' | 'amount_at_risk' | 'priority_score' | 'created_at' | 'status'
type SortOrder = 'asc' | 'desc'

export default function RecoveryCasesPage({
  cases,
  priorities,
  onSelectCase
}: RecoveryCasesPageProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [riskFilter, setRiskFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortField, setSortField] = useState<SortField>('priority_score')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  // Cross-reference cases list with priorities metadata to attach priority score & time sensitivity
  const enrichedCases = cases.map((c) => {
    const activeIntel = priorities.find((p) => p.case_id === c.id)
    return {
      ...c,
      priority_score: activeIntel ? activeIntel.priority_score : (c.status === 'RECOVERED' ? 100 : 0),
      time_category: activeIntel ? activeIntel.time_sensitivity.category : 'N/A',
      estimated_recoverable: activeIntel ? activeIntel.estimated_recoverable : '0.00'
    }
  })

  // KPI calculations
  const totalCases = enrichedCases.length;
  const activeCases = enrichedCases.filter(c => !['RECOVERED', 'STOPPED'].includes(c.status)).length;
  const revenueAtRisk = enrichedCases.filter(c => !['RECOVERED', 'STOPPED'].includes(c.status)).reduce((acc, c) => acc + Number(c.amount_at_risk), 0);
  const potentialRecovery = enrichedCases.filter(c => !['RECOVERED', 'STOPPED'].includes(c.status)).reduce((acc, c) => acc + Number(c.estimated_recoverable || c.amount_at_risk), 0);
  const confirmedRecovery = enrichedCases.filter(c => c.status === 'RECOVERED').reduce((acc, c) => acc + Number(c.recovered_amount || c.amount_at_risk), 0);
  const recoveryRate = totalCases > 0 ? Math.round((enrichedCases.filter(c => c.status === 'RECOVERED').length / totalCases) * 100) : 0;

  // Handle client-side sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Apply filters and search
  const filteredCases = enrichedCases.filter((c) => {
    const matchesSearch =
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer_id.toLowerCase().includes(searchTerm.toLowerCase())
      
    const matchesRisk = riskFilter === 'ALL' || c.risk_level.toUpperCase() === riskFilter.toUpperCase()
    const matchesStatus = statusFilter === 'ALL' || c.status.toUpperCase() === statusFilter.toUpperCase()

    return matchesSearch && matchesRisk && matchesStatus
  })

  // Sort filtered list
  const sortedCases = [...filteredCases].sort((a, b) => {
    let aVal: any = a[sortField]
    let bVal: any = b[sortField]

    if (sortField === 'amount_at_risk') {
      aVal = Number(a.amount_at_risk)
      bVal = Number(b.amount_at_risk)
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const renderSortArrow = (field: SortField) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1 text-purple-600" /> : <ChevronDown className="w-3 h-3 inline ml-1 text-purple-600" />
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* 1. Header (Compact) */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h2 className="text-[19px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Recovery Cases
            <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider">{activeCases} ACTIVE</span>
          </h2>
          <p className="text-[13px] text-slate-500 mt-1 font-medium">Manage and monitor revenue recovery operations and orchestration paths.</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded transition-colors border border-transparent hover:border-slate-200">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* 2. KPI Metrics Row (Horizontal) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Revenue at Risk</span>
          <FinancialValue value={formatCurrency(revenueAtRisk)} size="metric" className="text-rose-600" />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Recovery Potential</span>
          <FinancialValue value={formatCurrency(potentialRecovery)} size="metric" className="text-purple-700" />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Confirmed Recovery</span>
          <FinancialValue value={formatCurrency(confirmedRecovery)} size="metric" className="text-emerald-600" />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Active Cases</span>
          <FinancialValue value={activeCases} size="metric" className="text-slate-900" />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Recovery Rate</span>
          <FinancialValue value={`${recoveryRate}%`} size="metric" className="text-slate-900" />
        </div>
      </div>

      {/* 3. Compact Toolbar (Filters) */}
      <div className="bg-white border border-slate-200 rounded-lg p-2 flex flex-col md:flex-row gap-2 justify-between items-center shadow-sm">
        <div className="relative w-full md:w-80 h-9">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Case or Customer ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-full bg-slate-50 text-[13px] text-slate-900 rounded-md pl-9 pr-3 outline-none border border-transparent focus:border-purple-300 focus:bg-white transition-all font-medium placeholder:text-slate-400"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto h-9">
          <div className="flex items-center gap-2 h-full bg-slate-50 px-3 rounded-md border border-slate-100 hover:border-slate-200 transition-colors">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-transparent text-[12px] font-bold text-slate-600 outline-none cursor-pointer uppercase tracking-wider h-full py-2"
            >
              <option value="ALL">All Risks</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2 h-full bg-slate-50 px-3 rounded-md border border-slate-100 hover:border-slate-200 transition-colors">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-[12px] font-bold text-slate-600 outline-none cursor-pointer uppercase tracking-wider h-full py-2"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RECOVERED">Recovered</option>
              <option value="STOPPED">Stopped</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Case Table (The Hero) */}
      <div className="bg-white border border-slate-200 rounded-xl flex-grow overflow-hidden shadow-sm flex flex-col">
        {sortedCases.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center py-16 text-slate-500 space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-300" strokeWidth={1.5} />
            <h4 className="text-[15px] font-bold text-slate-900 tracking-tight">No active recovery cases</h4>
            <p className="text-[13px] max-w-sm text-center">Trigger a payment failure from Webhooks to create a recovery case.</p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-grow h-[400px]">
            <table className="w-full text-left border-collapse sticky-header">
              <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm border-b border-slate-200">
                <tr className="text-slate-500">
                  <th className="py-3 pl-5 cursor-pointer select-none hover:text-slate-900 transition text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" onClick={() => handleSort('id')}>
                    Case ID {renderSortArrow('id')}
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Risk</th>
                  <th className="py-3 px-4 cursor-pointer select-none text-right hover:text-slate-900 transition text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" onClick={() => handleSort('amount_at_risk')}>
                    Amount {renderSortArrow('amount_at_risk')}
                  </th>
                  <th className="py-3 px-4 cursor-pointer select-none text-center hover:text-slate-900 transition text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" onClick={() => handleSort('priority_score')}>
                    Score {renderSortArrow('priority_score')}
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Age</th>
                  <th className="py-3 px-4 cursor-pointer select-none hover:text-slate-900 transition text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" onClick={() => handleSort('status')}>
                    Status {renderSortArrow('status')}
                  </th>
                  <th className="py-3 pr-5 text-right text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Recovered Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedCases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c.id)}
                    className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 pl-5 text-slate-900 group-hover:text-purple-700 transition-colors">
                      <FinancialValue value={c.id.substring(0, 8)} size="table" className="text-inherit" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="scale-90 origin-left"><RiskBadge level={c.risk_level} /></div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <FinancialValue value={formatCurrency(c.amount_at_risk)} size="table" className="text-slate-900" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-purple-50 border border-purple-100 text-purple-700 font-bold px-2 py-1 rounded">
                        <FinancialValue value={formatNumber(c.priority_score)} size="table" className="text-inherit" />
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[12px] font-medium capitalize">
                      {c.time_category.replace(/_/g, ' ').toLowerCase()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="scale-90 origin-left"><StatusBadge status={c.status} /></div>
                    </td>
                    <td className="py-3 pr-5 text-right">
                      {c.status === 'RECOVERED' ? (
                        <span className="text-emerald-600">
                          <FinancialValue value={formatCurrency(c.recovered_amount || c.amount_at_risk)} size="table" className="text-inherit" />
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-medium italic">Unresolved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
