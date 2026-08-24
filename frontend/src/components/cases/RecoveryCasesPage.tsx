import { useState } from 'react'
import { Search, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { RiskBadge, StatusBadge } from '../common/LoaderAndStates'

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

  const formatCurrency = (val: string | number) => {
    return `₹${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

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
    return sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />
  }

  return (
    <div className="space-y-6">
      
      {/* Search & Filters Controls */}
      <div className="bg-[#13151c] border border-[#202430] rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search Case or Customer UUID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1b1e28] text-xs text-gray-300 rounded-lg pl-9 pr-4 py-2 outline-none border border-[#2e3445] focus:border-purple-500 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
          
          {/* Risk Level Filter */}
          <div className="flex items-center gap-1.5 bg-[#1b1e28] px-3 py-1.5 rounded-lg border border-[#2e3445]">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-transparent text-xs text-gray-200 outline-none cursor-pointer"
            >
              <option value="ALL">All Risks</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#1b1e28] px-3 py-1.5 rounded-lg border border-[#2e3445]">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-gray-200 outline-none cursor-pointer"
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

      {/* Cases Main List Table */}
      <div className="bg-[#13151c] border border-[#202430] rounded-xl overflow-hidden">
        {sortedCases.length === 0 ? (
          <div className="py-20 text-center text-gray-500 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-gray-600" />
            <h4 className="text-sm font-semibold text-gray-400">No cases matched filters</h4>
            <p className="text-xs max-w-xs mx-auto">Try widening your search string or toggling the status/risk dropdown filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#202430] text-gray-400 font-medium">
                  <th className="py-3.5 pl-4 cursor-pointer select-none" onClick={() => handleSort('id')}>
                    Case ID {renderSortArrow('id')}
                  </th>
                  <th className="py-3.5">Risk Level</th>
                  <th className="py-3.5 cursor-pointer select-none text-right" onClick={() => handleSort('amount_at_risk')}>
                    Amount at Risk {renderSortArrow('amount_at_risk')}
                  </th>
                  <th className="py-3.5 cursor-pointer select-none text-center" onClick={() => handleSort('priority_score')}>
                    Priority Score {renderSortArrow('priority_score')}
                  </th>
                  <th className="py-3.5">Age Status</th>
                  <th className="py-3.5 cursor-pointer select-none" onClick={() => handleSort('status')}>
                    Status {renderSortArrow('status')}
                  </th>
                  <th className="py-3.5 text-right pr-4">Outcome Recovered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202430]">
                {sortedCases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c.id)}
                    className="hover:bg-[#1a1c24]/50 cursor-pointer transition duration-150"
                  >
                    <td className="py-3.5 pl-4 font-mono text-purple-300 font-medium">
                      {c.id.substring(0, 8)}...
                    </td>
                    <td className="py-3.5">
                      <RiskBadge level={c.risk_level} />
                    </td>
                    <td className="py-3.5 text-right font-bold text-gray-100 font-mono">
                      {formatCurrency(c.amount_at_risk)}
                    </td>
                    <td className="py-3.5 text-center">
                      <span className="bg-[#1b1e28] text-purple-300 font-bold border border-[#2e3445] px-2 py-0.5 rounded font-mono">
                        {c.priority_score.toFixed(0)}
                      </span>
                    </td>
                    <td className="py-3.5 text-gray-400">
                      {c.time_category}
                    </td>
                    <td className="py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3.5 text-right pr-4 font-mono">
                      {c.status === 'RECOVERED' ? (
                        <span className="text-emerald-400 font-bold">
                          {formatCurrency(c.recovered_amount || c.amount_at_risk)}
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">Unresolved</span>
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
