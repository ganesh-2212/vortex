import { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  Activity,
  AlertTriangle,
  FileText,
  Sliders,
  DollarSign,
  Cpu,
  Layers,
  Sparkles,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronRight
} from 'lucide-react'
import { API_BASE_URL } from './config'

// Define tabs
type Tab = 'overview' | 'health' | 'incidents' | 'policy' | 'audit' | 'settings'

interface NavigationItem {
  id: Tab
  label: string
  icon: React.ComponentType<any>
  description: string
}

// --- Intelligence API Interfaces ---

interface RevenueIntelligenceSummary {
  revenue_at_risk: string
  estimated_recoverable: string
  open_case_count: number
  critical_amount: string
  high_amount: string
  medium_amount: string
  low_amount: string
  top_leakage_type: string | null
  generated_at: string
}

interface LeakageCategory {
  event_type: string
  case_count: number
  amount_at_risk: string
  percentage_of_total: number
}

interface PriorityBreakdown {
  risk_severity_score: number
  amount_score: number
  failure_count_score: number
  recovery_opportunity_score: number
  age_score: number
}

interface IntelligenceReason {
  message: string
  type: string // 'risk', 'priority', 'signal'
}

interface TimeSensitivity {
  case_age_seconds: number
  hours_since_event: number
  category: string // FRESH, AGING, STALE
}

interface PriorityCase {
  case_id: string
  amount_at_risk: string
  risk_level: string // LOW, MEDIUM, HIGH, CRITICAL
  priority_score: number
  priority_breakdown: PriorityBreakdown
  reasons: IntelligenceReason[]
  time_sensitivity: TimeSensitivity
  estimated_recoverable: string
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // --- Intelligence Dashboard States ---
  const [summary, setSummary] = useState<RevenueIntelligenceSummary | null>(null)
  const [leakage, setLeakage] = useState<LeakageCategory[]>([])
  const [priorities, setPriorities] = useState<PriorityCase[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<PriorityCase | null>(null)

  const [loading, setLoading] = useState<boolean>(true)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)

  // Fetch Summary, Leakage, and Priorities concurrently
  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryRes, leakageRes, prioritiesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/intelligence/summary`),
        fetch(`${API_BASE_URL}/api/v1/intelligence/leakage`),
        fetch(`${API_BASE_URL}/api/v1/intelligence/priorities`)
      ])

      if (!summaryRes.ok || !leakageRes.ok || !prioritiesRes.ok) {
        throw new Error('Failed to load intelligence metrics')
      }

      const summaryData = await summaryRes.json()
      const leakageData = await leakageRes.json()
      const prioritiesData = await prioritiesRes.json()

      setSummary(summaryData)
      setLeakage(leakageData)
      setPriorities(prioritiesData)
    } catch (err: any) {
      console.error(err)
      setError('Could not connect to the Revenue Sentinel backend. Please verify uvicorn is running.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch single case details
  const fetchCaseDetail = useCallback(async (caseId: string) => {
    setDetailLoading(true)
    setDetailError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/intelligence/cases/${caseId}`)
      if (!res.ok) {
        throw new Error('Failed to fetch case telemetry details')
      }
      const data = await res.json()
      setSelectedCaseDetail(data)
    } catch (err: any) {
      console.error(err)
      setDetailError('Failed to load case recovery details.')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Fetch case detail when selectedCaseId changes
  useEffect(() => {
    if (selectedCaseId) {
      fetchCaseDetail(selectedCaseId)
    } else {
      setSelectedCaseDetail(null)
    }
  }, [selectedCaseId, fetchCaseDetail])

  const navigationItems: NavigationItem[] = [
    {
      id: 'overview',
      label: 'Revenue Overview',
      icon: DollarSign,
      description: 'Global revenue leaks, recovery metrics, and risk overview.'
    },
    {
      id: 'health',
      label: 'Revenue Health',
      icon: Activity,
      description: 'Processor degradation index and checkout abandonment charts.'
    },
    {
      id: 'incidents',
      label: 'Active Incidents',
      icon: AlertTriangle,
      description: 'Real-time anomalies investigated by Gemini AI and diagnostics.'
    },
    {
      id: 'policy',
      label: 'Policy Center',
      icon: Sliders,
      description: 'Deterministic boundaries, retry configurations, and rules.'
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: FileText,
      description: 'Cryptographically-ordered log of recommendations and executions.'
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Server,
      description: 'Integrations, Webhook setups, and Gemini API configurations.'
    }
  ]

  const activeItem = navigationItems.find(item => item.id === activeTab) || navigationItems[0]

  // Helpers to aggregate risk level counts from priorities list
  const getRiskCount = (level: string) => {
    return priorities.filter(p => p.risk_level.toUpperCase() === level.toUpperCase()).length
  }

  // Format currency values
  const formatCurrency = (val: string | number) => {
    return `₹${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Get color configurations for risk levels
  const getRiskColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'CRITICAL':
        return {
          text: 'text-rose-400',
          bg: 'bg-rose-950/30',
          border: 'border-rose-500/20',
          indicator: 'bg-rose-500'
        }
      case 'HIGH':
        return {
          text: 'text-orange-400',
          bg: 'bg-orange-950/30',
          border: 'border-orange-500/20',
          indicator: 'bg-orange-500'
        }
      case 'MEDIUM':
        return {
          text: 'text-yellow-400',
          bg: 'bg-yellow-950/30',
          border: 'border-yellow-500/20',
          indicator: 'bg-yellow-500'
        }
      case 'LOW':
        default:
        return {
          text: 'text-emerald-400',
          bg: 'bg-emerald-950/30',
          border: 'border-emerald-500/20',
          indicator: 'bg-emerald-500'
        }
    }
  }

  return (
    <div className="flex h-screen w-screen bg-[#0d0e12] text-gray-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#13151c] border-r border-[#202430] flex flex-col justify-between shrink-0">
        <div>
          {/* Brand/Logo */}
          <div className="h-16 flex items-center px-6 gap-3 border-b border-[#202430]">
            <div className="bg-purple-600/20 p-2 rounded-lg border border-purple-500/30">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wider uppercase text-purple-400">Revenue Sentinel</h1>
              <span className="text-[10px] text-gray-500 font-mono">Platform Foundation v0.1.0</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group text-left ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-300 border-l-2 border-purple-500 pl-2.5'
                      : 'text-gray-400 hover:bg-[#1a1d26] hover:text-gray-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-200 ${
                    isActive ? 'text-purple-400' : 'text-gray-500 group-hover:text-gray-300'
                  }`} />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* User / Environment Info Footer */}
        <div className="p-4 border-t border-[#202430] bg-[#0f1015]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-900/40 border border-purple-700/30 flex items-center justify-center">
              <span className="text-xs font-semibold text-purple-300">RS</span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-300">Sandbox Merchant</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-gray-500 font-mono">F03 Intelligence Active</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="h-16 border-b border-[#202430] bg-[#13151c]/50 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">{activeItem.label}</h2>
            <p className="text-xs text-gray-400">{activeItem.description}</p>
          </div>
          <div className="flex items-center gap-4">
            {activeTab === 'overview' && (
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="flex items-center gap-2 bg-[#1b1e28] hover:bg-[#232734] text-gray-300 hover:text-white px-3.5 py-1.5 rounded-lg border border-[#2e3445] text-xs transition-all duration-200 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            )}
            <div className="flex items-center gap-2 bg-[#1b1e28] px-3 py-1.5 rounded-full border border-[#2e3445]">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-medium text-gray-300 font-mono">FastAPI Backend: Online</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-8 space-y-6 max-w-7xl mx-auto w-full">
          {activeTab === 'overview' ? (
            // --- Live Overview Tab content ---
            <>
              {/* Error Banner */}
              {error && (
                <div className="bg-rose-950/40 border border-rose-500/30 text-rose-300 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold">Service Connection Error</h4>
                    <p className="text-xs text-rose-300/80 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Summary Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {/* Metric 1: Revenue at Risk */}
                <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 relative overflow-hidden group hover:border-[#2e3445] transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-400">Revenue at Risk</span>
                    <AlertTriangle className="w-4.5 h-4.5 text-rose-400" />
                  </div>
                  {loading ? (
                    <div className="h-7 w-28 bg-[#202430] animate-pulse rounded my-1.5"></div>
                  ) : (
                    <h3 className="text-2xl font-bold text-gray-100">
                      {formatCurrency(summary?.revenue_at_risk || '0')}
                    </h3>
                  )}
                  <p className="text-[10px] text-rose-400/80 mt-1 tracking-wide">
                    Exposed in active open cases
                  </p>
                </div>

                {/* Metric 2: Estimated Recoverable */}
                <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 relative overflow-hidden group hover:border-[#2e3445] transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-purple-300">Estimated Recoverable</span>
                    <Sparkles className="w-4.5 h-4.5 text-purple-400 animate-pulse" />
                  </div>
                  {loading ? (
                    <div className="h-7 w-28 bg-[#202430] animate-pulse rounded my-1.5"></div>
                  ) : (
                    <h3 className="text-2xl font-bold text-purple-300">
                      {formatCurrency(summary?.estimated_recoverable || '0')}
                    </h3>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    *Heuristic Estimate - not money actually recovered
                  </p>
                </div>

                {/* Metric 3: Open Cases */}
                <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 relative overflow-hidden group hover:border-[#2e3445] transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-400">Open Recovery Cases</span>
                    <Activity className="w-4.5 h-4.5 text-yellow-400" />
                  </div>
                  {loading ? (
                    <div className="h-7 w-28 bg-[#202430] animate-pulse rounded my-1.5"></div>
                  ) : (
                    <h3 className="text-2xl font-bold text-gray-100">
                      {summary?.open_case_count || 0}
                    </h3>
                  )}
                  <p className="text-[10px] text-yellow-400/80 mt-1">
                    Requiring intervention
                  </p>
                </div>

                {/* Metric 4: Top Leakage Type */}
                <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 relative overflow-hidden group hover:border-[#2e3445] transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-400">Top Leakage Origin</span>
                    <Layers className="w-4.5 h-4.5 text-gray-400" />
                  </div>
                  {loading ? (
                    <div className="h-7 w-28 bg-[#202430] animate-pulse rounded my-1.5"></div>
                  ) : (
                    <h3 className="text-base font-bold text-gray-200 truncate">
                      {(summary?.top_leakage_type || 'None').replace(/_/g, ' ')}
                    </h3>
                  )}
                  <p className="text-[10px] text-gray-500 mt-1">
                    Highest value event category
                  </p>
                </div>
              </div>

              {/* Check for empty state */}
              {!loading && priorities.length === 0 ? (
                <div className="bg-[#13151c] border border-[#202430] rounded-2xl p-12 text-center space-y-4">
                  <div className="inline-flex bg-purple-900/10 p-5 rounded-full border border-purple-500/20 text-purple-400 mb-2">
                    <CheckCircle2 className="w-10 h-10 animate-bounce" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-200">No Active Recovery Cases</h3>
                  <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                    Your revenue stream is secure. Currently there are no failed payments, unpaid invoices, or anomalies triggering open recovery cases.
                  </p>
                  <div className="inline-block bg-[#1b1e28] px-3.5 py-1.5 rounded-full border border-[#2d3244] text-[11px] font-mono text-gray-400">
                    Calculated heuristic recoverable value: {formatCurrency(0)}
                  </div>
                </div>
              ) : (
                // --- Dashboard Split Screen ---
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                  {/* Left Column (2/3 width) - Distribution, Leakage, Queue */}
                  <div className="lg:col-span-2 space-y-6">

                    {/* Risk Overview (Distribution) */}
                    <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6">
                      <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-400" />
                        Risk Distribution
                      </h3>
                      {loading ? (
                        <div className="space-y-3">
                          <div className="h-6 bg-[#202430] animate-pulse rounded w-full"></div>
                          <div className="h-6 bg-[#202430] animate-pulse rounded w-full"></div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => {
                            const colors = getRiskColor(level)
                            const count = getRiskCount(level)
                            let amt = '0'
                            if (summary) {
                              if (level === 'CRITICAL') amt = summary.critical_amount
                              else if (level === 'HIGH') amt = summary.high_amount
                              else if (level === 'MEDIUM') amt = summary.medium_amount
                              else if (level === 'LOW') amt = summary.low_amount
                            }
                            return (
                              <div key={level} className={`border ${colors.border} ${colors.bg} rounded-lg p-3.5 text-left`}>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className={`w-2 h-2 rounded-full ${colors.indicator}`}></span>
                                  <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400">{level}</span>
                                </div>
                                <div className="text-lg font-bold text-gray-100">{formatCurrency(amt)}</div>
                                <div className="text-[10px] text-gray-500 mt-0.5">{count} active cases</div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Leakage Analysis */}
                    <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6">
                      <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400" />
                        Revenue Leakage Category Analysis
                      </h3>
                      {loading ? (
                        <div className="space-y-2">
                          <div className="h-10 bg-[#202430] animate-pulse rounded w-full"></div>
                          <div className="h-10 bg-[#202430] animate-pulse rounded w-full"></div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-[#202430] text-gray-400 font-medium">
                                <th className="pb-3">Event Type</th>
                                <th className="pb-3 text-center">Cases</th>
                                <th className="pb-3 text-right">Amount at Risk</th>
                                <th className="pb-3 text-right">Leakage Share</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#202430]">
                              {leakage.map((cat, idx) => (
                                <tr key={idx} className="hover:bg-[#1a1c24]/30 transition-colors">
                                  <td className="py-3.5 font-medium text-gray-200">
                                    {cat.event_type.replace(/_/g, ' ')}
                                  </td>
                                  <td className="py-3.5 text-center text-gray-300 font-mono">
                                    {cat.case_count}
                                  </td>
                                  <td className="py-3.5 text-right font-semibold text-gray-200 font-mono">
                                    {formatCurrency(cat.amount_at_risk)}
                                  </td>
                                  <td className="py-3.5 text-right text-purple-400 font-semibold font-mono">
                                    {cat.percentage_of_total.toFixed(1)}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Priority Recovery Queue */}
                    <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6">
                      <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-purple-400" />
                          Priority Recovery Queue
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">Sorted by urgency</span>
                      </h3>
                      {loading ? (
                        <div className="space-y-2">
                          <div className="h-12 bg-[#202430] animate-pulse rounded w-full"></div>
                          <div className="h-12 bg-[#202430] animate-pulse rounded w-full"></div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-[#202430] text-gray-400 font-medium">
                                <th className="pb-3 pl-2">Case ID</th>
                                <th className="pb-3">Risk Level</th>
                                <th className="pb-3 text-right">Amount at Risk</th>
                                <th className="pb-3 text-center">Score</th>
                                <th className="pb-3 text-right">Heuristic Estimate</th>
                                <th className="pb-3 pr-2 text-right">Inspect</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#202430]">
                              {priorities.map((item) => {
                                const colors = getRiskColor(item.risk_level)
                                const isSelected = selectedCaseId === item.case_id
                                return (
                                  <tr
                                    key={item.case_id}
                                    onClick={() => setSelectedCaseId(item.case_id)}
                                    className={`cursor-pointer transition-all duration-150 ${
                                      isSelected
                                        ? 'bg-purple-600/10 border-l-2 border-purple-500'
                                        : 'hover:bg-[#1a1c24]/50'
                                    }`}
                                  >
                                    <td className="py-3.5 pl-2 font-mono text-gray-400">
                                      {item.case_id.substring(0, 8)}...
                                    </td>
                                    <td className="py-3.5">
                                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${colors.bg} ${colors.text} border ${colors.border}`}>
                                        <span className={`w-1 h-1 rounded-full ${colors.indicator}`}></span>
                                        {item.risk_level}
                                      </span>
                                    </td>
                                    <td className="py-3.5 text-right font-semibold text-gray-200 font-mono">
                                      {formatCurrency(item.amount_at_risk)}
                                    </td>
                                    <td className="py-3.5 text-center">
                                      <span className="bg-[#1b1e28] text-purple-300 font-bold border border-[#2e3445] px-2 py-0.5 rounded font-mono">
                                        {item.priority_score.toFixed(0)}
                                      </span>
                                    </td>
                                    <td className="py-3.5 text-right text-gray-300 font-semibold font-mono">
                                      {formatCurrency(item.estimated_recoverable)}
                                    </td>
                                    <td className="py-3.5 pr-2 text-right">
                                      <ChevronRight className="w-4 h-4 text-gray-500 inline-block" />
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (1/3 width) - Case Detail */}
                  <div className="space-y-6">
                    <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6 min-h-[400px] flex flex-col justify-between">
                      {/* Case details headers */}
                      <div>
                        <div className="flex items-center justify-between border-b border-[#202430] pb-3 mb-4">
                          <h3 className="text-sm font-semibold text-gray-200">Case Recovery Telemetry</h3>
                          <span className="text-[10px] text-purple-400 font-mono">Diagnostic Panel</span>
                        </div>

                        {detailError && (
                          <div className="bg-rose-950/20 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs mb-4">
                            {detailError}
                          </div>
                        )}

                        {/* Render placeholder if no case selected */}
                        {!selectedCaseId && (
                          <div className="py-16 text-center text-gray-500 space-y-3">
                            <AlertCircle className="w-8 h-8 mx-auto text-gray-600" />
                            <p className="text-xs max-w-[200px] mx-auto leading-relaxed">
                              Select a case from the recovery queue to view detailed recovery intelligence.
                            </p>
                          </div>
                        )}

                        {/* Loading State */}
                        {detailLoading && (
                          <div className="space-y-4">
                            <div className="h-5 bg-[#202430] animate-pulse rounded w-2/3"></div>
                            <div className="h-20 bg-[#202430] animate-pulse rounded w-full"></div>
                            <div className="h-5 bg-[#202430] animate-pulse rounded w-1/2"></div>
                          </div>
                        )}

                        {/* Loaded Case details */}
                        {!detailLoading && selectedCaseDetail && (
                          <div className="space-y-5">
                            {/* Summary Metadata */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wide">Case ID</span>
                              <div className="text-xs font-mono text-gray-300 break-all bg-[#0d0e12] p-2.5 rounded border border-[#202430]">
                                {selectedCaseDetail.case_id}
                              </div>
                            </div>

                            {/* Core Diagnostics Grid */}
                            <div className="grid grid-cols-2 gap-3.5">
                              <div className="bg-[#1b1e28]/40 border border-[#202430] rounded-lg p-3">
                                <span className="text-[10px] text-gray-500 uppercase font-medium">Risk Level</span>
                                <div className="mt-1 flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${getRiskColor(selectedCaseDetail.risk_level).indicator}`}></span>
                                  <span className="text-xs font-semibold text-gray-200 uppercase">{selectedCaseDetail.risk_level}</span>
                                </div>
                              </div>
                              <div className="bg-[#1b1e28]/40 border border-[#202430] rounded-lg p-3">
                                <span className="text-[10px] text-gray-500 uppercase font-medium">Priority Score</span>
                                <div className="text-xs font-bold text-purple-300 mt-1 font-mono">
                                  {selectedCaseDetail.priority_score.toFixed(0)} / 100
                                </div>
                              </div>
                              <div className="bg-[#1b1e28]/40 border border-[#202430] rounded-lg p-3">
                                <span className="text-[10px] text-gray-500 uppercase font-medium">Exposed Risk</span>
                                <div className="text-xs font-bold text-gray-200 mt-1 font-mono">
                                  {formatCurrency(selectedCaseDetail.amount_at_risk)}
                                </div>
                              </div>
                              <div className="bg-[#1b1e28]/40 border border-[#202430] rounded-lg p-3">
                                <span className="text-[10px] text-gray-500 uppercase font-medium">Heuristic Est.</span>
                                <div className="text-xs font-bold text-purple-300 mt-1 font-mono">
                                  {formatCurrency(selectedCaseDetail.estimated_recoverable)}
                                </div>
                              </div>
                            </div>

                            {/* Time Sensitivity */}
                            <div className="bg-[#1b1e28]/40 border border-[#202430] rounded-lg p-3 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-gray-500 uppercase font-medium">Time Sensitivity</span>
                                <div className="text-xs font-bold text-gray-300 font-mono mt-0.5">
                                  {selectedCaseDetail.time_sensitivity.hours_since_event.toFixed(1)} hrs elapsed
                                </div>
                              </div>
                              <span className="bg-purple-900/30 text-purple-300 border border-purple-800/40 text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                                {selectedCaseDetail.time_sensitivity.category}
                              </span>
                            </div>

                            {/* Priority Breakdown Progress bars */}
                            <div className="space-y-2.5">
                              <span className="text-[10px] text-gray-400 uppercase font-semibold">Priority Drivers</span>
                              <div className="space-y-1.5 text-[10px] text-gray-400">
                                <div>
                                  <div className="flex justify-between mb-0.5">
                                    <span>Risk Severity (35%)</span>
                                    <span className="font-mono text-gray-300">{selectedCaseDetail.priority_breakdown.risk_severity_score.toFixed(0)}</span>
                                  </div>
                                  <div className="h-1 bg-[#202430] rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500" style={{ width: `${selectedCaseDetail.priority_breakdown.risk_severity_score}%` }}></div>
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between mb-0.5">
                                    <span>Amount Score (30%)</span>
                                    <span className="font-mono text-gray-300">{selectedCaseDetail.priority_breakdown.amount_score.toFixed(0)}</span>
                                  </div>
                                  <div className="h-1 bg-[#202430] rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500" style={{ width: `${selectedCaseDetail.priority_breakdown.amount_score}%` }}></div>
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between mb-0.5">
                                    <span>Time Sensitivity (15%)</span>
                                    <span className="font-mono text-gray-300">{selectedCaseDetail.priority_breakdown.age_score.toFixed(0)}</span>
                                  </div>
                                  <div className="h-1 bg-[#202430] rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500" style={{ width: `${selectedCaseDetail.priority_breakdown.age_score}%` }}></div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Explainability Reasons */}
                            <div className="space-y-2">
                              <span className="text-[10px] text-gray-400 uppercase font-semibold">Risk Explainability Reasons</span>
                              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                                {selectedCaseDetail.reasons.map((reason, idx) => (
                                  <div key={idx} className="bg-[#1b1e28]/20 border border-[#202430] rounded p-2 text-[10px] leading-relaxed text-gray-300 flex items-start gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${
                                      reason.type === 'risk'
                                        ? 'bg-rose-400'
                                        : reason.type === 'priority'
                                          ? 'bg-purple-400'
                                          : 'bg-blue-400'
                                    }`}></span>
                                    <span>{reason.message}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer notice detailing heuristic recovery estimate */}
                      {!detailLoading && selectedCaseDetail && (
                        <div className="border-t border-[#202430] pt-3 text-[9px] text-gray-500 leading-relaxed mt-4">
                          *Heuristic Estimate Notice: Estimated recoverable revenue is calculated using deterministic multipliers based on risk level and retries. This is a heuristic prediction only, not actual money recovered.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            // --- Placeholder fallback layout for other tabs ---
            <div className="bg-[#13151c] border border-[#202430] rounded-xl p-8 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#202430] pb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                <h3 className="text-base font-semibold text-gray-200">Active View: {activeItem.label}</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                This layout acts as the structural shell for the **{activeItem.label}** dashboard view. Under our architectural rules,
                the UI relies on components styled directly with Tailwind CSS variables and standard Tailwind classes to maintain consistent aesthetics.
              </p>
              <div className="bg-[#0d0e12] border border-[#202430] rounded-lg p-5 font-mono text-xs text-purple-300/80 space-y-2">
                <p>// Dashboard Component Blueprint</p>
                <p>Tab ID: "{activeItem.id}"</p>
                <p>Description: "{activeItem.description}"</p>
                <p>Status: Placeholder Shell Loaded</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
