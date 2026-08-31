import { useEffect, useState } from 'react'
import { getMerchantCommandCenter } from '../../api'
import { RefreshCw, ArrowRight, AlertCircle, Activity, Layers, Cpu } from 'lucide-react'
import { RiskBadge } from '../common/LoaderAndStates'
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters'

export function MerchantCommandCenterPage({ 
  onViewCase,
  onNavigate
}: { 
  onViewCase: (id: string) => void
  onNavigate: (tab: string) => void
}) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const merchantId = '00000000-0000-0000-0000-000000000000'
      const response = await getMerchantCommandCenter(merchantId)
      setData(response)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load command center data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Revenue Command Center...</div>
  }

  if (error) {
    return (
      <div className="p-8 text-center text-rose-500">
        <p>{error}</p>
        <button onClick={() => loadData()} className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs transition-colors">Retry</button>
      </div>
    )
  }

  if (!data) return null

  const metrics = data.metrics
  
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Revenue Command Center</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time view of revenue risk, recovery performance, and active recovery operations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Last updated: {new Date(data.generated_at).toLocaleTimeString()}
          </p>
          <button 
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-purple-700' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Section 1 - Executive Metrics */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 space-y-6">
        <div>
          <h4 className="text-[13px] text-slate-500 font-bold uppercase tracking-widest mb-1">
            Executive Revenue Metrics
          </h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div>
            <span className="text-[11px] text-rose-600 font-bold block uppercase tracking-wide">Revenue At Risk</span>
            <span className="text-3xl font-bold text-slate-900 proportional-nums tracking-tight mt-1.5 block">
              {formatCompactCurrency(metrics.total_revenue_at_risk)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-orange-600 font-bold block uppercase tracking-wide">Recovery Potential</span>
            <span className="text-3xl font-bold text-slate-900 proportional-nums tracking-tight mt-1.5 block">
              {formatCompactCurrency(metrics.total_recoverable_revenue)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-emerald-600 font-bold block uppercase tracking-wide">Confirmed Recovery</span>
            <span className="text-3xl font-bold text-slate-900 proportional-nums tracking-tight mt-1.5 block">
              {formatCompactCurrency(metrics.total_confirmed_recovered)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-purple-700 font-bold block uppercase tracking-wide">PROJECTED Incremental</span>
            <span className="text-3xl font-bold text-purple-700 proportional-nums tracking-tight mt-1.5 block">
              +{formatCompactCurrency(metrics.total_incremental_revenue)}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">vs Basic Retry</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-bold block uppercase tracking-wide">Recovery Rate</span>
            <span className="text-3xl font-bold text-slate-900 proportional-nums tracking-tight mt-1.5 block">
              {metrics.recovery_rate}%
            </span>
          </div>
        </div>
      </div>

      {/* Section 2 - Recovery Performance (F12) */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 space-y-6">
        <div>
          <h4 className="text-[13px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
            SIMULATED BASELINE COMPARISON
            <span className="text-[9px] text-purple-700 px-2 py-0.5 rounded bg-purple-50 font-bold tracking-wider uppercase border border-purple-100">RECOVERY SIMULATION ENGINE</span>
          </h4>
        </div>
        {!data.simulation_available ? (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-12 text-center space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-300" strokeWidth={1.5} />
            <div>
              <p className="text-[15px] font-bold text-slate-900 tracking-tight">Simulation evidence not available yet</p>
              <p className="text-[13px] text-slate-500 mt-1">Run a recovery simulation to compare Sentinel against baseline strategies.</p>
            </div>
            <button 
              onClick={() => onNavigate('simulation')}
              className="mt-4 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[13px] font-bold uppercase tracking-wider transition-colors shadow-sm"
            >
              Run Simulation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.revenue_comparison.map((comp: any) => {
              const isOptimized = comp.scenario_type === 'SENTINEL_OPTIMIZED'
              return (
                <div key={comp.scenario_type} className={`relative rounded-xl p-6 border ${isOptimized ? 'bg-purple-50 border-purple-200 shadow-sm' : 'bg-slate-50 border-slate-200/60'}`}>
                  {isOptimized && (
                    <div className="absolute top-0 right-0 bg-purple-100 text-purple-700 text-[9px] font-bold px-2 py-1.5 rounded-bl-lg rounded-tr-xl uppercase tracking-wider border-b border-l border-purple-200">
                      OPTIMIZED
                    </div>
                  )}
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between tracking-tight">
                    {comp.scenario_type.replace('_', ' ')}
                    <span className="text-[9px] px-2 py-0.5 bg-white border border-slate-200 font-bold tracking-wider text-slate-500 rounded uppercase">SIMULATED</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[11px] font-medium uppercase tracking-wider">Projected Recovery</span>
                      <span className="text-slate-900 text-[15px] font-bold tabular-nums">{formatCurrency(comp.simulated_projected_recovery)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[11px] font-medium uppercase tracking-wider">Cost</span>
                      <span className="text-slate-500 text-[15px] font-bold tabular-nums">{formatCurrency(comp.intervention_cost)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-200/60">
                      <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Net Recovery</span>
                      <span className="text-emerald-700 text-base font-bold tabular-nums">{formatCurrency(comp.net_recovery)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[11px] font-medium uppercase tracking-wider">Rate</span>
                      <span className="text-slate-900 text-[15px] font-bold tabular-nums">{comp.recovery_rate_percentage}%</span>
                    </div>
                    {comp.projected_incremental_revenue > 0 && (
                      <div className="flex justify-between items-center pt-3 border-t border-purple-200/50">
                        <span className="text-purple-700 text-[11px] font-bold uppercase tracking-wider">Incremental Value</span>
                        <span className="text-purple-700 text-base font-bold tabular-nums">+{formatCurrency(comp.projected_incremental_revenue)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Section 4 - Human Attention */}
      {data.human_attention_cases.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl overflow-hidden">
          <div className="bg-white px-4 py-3 border-b border-rose-200 flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider">Requires Human Attention</h4>
          </div>
          <div className="divide-y divide-rose-100">
            {data.human_attention_cases.map((attn: any) => (
              <div key={attn.case_id} className="p-4 flex items-center justify-between hover:bg-rose-50/50 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-rose-900 font-medium text-xs">Case {attn.case_id.split('-')[0]}</span>
                    <span className="text-rose-700/80 tabular-nums text-[11px]">{formatCurrency(attn.amount)}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                      {attn.current_state}
                    </span>
                    <span className="text-[10px] text-rose-600/80">Age: {attn.case_age_hours}h</span>
                  </div>
                  <p className="text-rose-600 text-[11px]">{attn.reason}</p>
                </div>
                <button 
                  onClick={() => onViewCase(attn.case_id)}
                  className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg transition-colors font-medium"
                >
                  View Case
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3 - Active Recovery Queue */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-[13px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
              Active Recovery Queue
            </h4>
            <p className="text-xs text-slate-400">All cases currently undergoing active orchestration.</p>
          </div>
          <span className="bg-slate-50 border border-slate-200 text-slate-600 text-[11px] px-3 py-1 rounded-md font-bold tracking-wider uppercase">
            {data.recovery_queue.items.length} Active
          </span>
        </div>
        
        {data.recovery_queue.items.length === 0 ? (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-16 text-center space-y-5">
            <Layers className="w-10 h-10 mx-auto text-slate-300" strokeWidth={1.5} />
            <div>
              <p className="text-lg font-bold text-slate-900 tracking-tight">No active recovery cases</p>
              <p className="text-[15px] text-slate-500 mt-2">Cases currently undergoing recovery orchestration will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400">
                    <th className="py-4 text-[11px] font-bold uppercase tracking-wider pl-4">Case ID</th>
                    <th className="py-4 text-[11px] font-bold uppercase tracking-wider">Amount</th>
                    <th className="py-4 text-[11px] font-bold uppercase tracking-wider">Risk Level</th>
                    <th className="py-4 text-[11px] font-bold uppercase tracking-wider">Strategy Assessed</th>
                    <th className="py-4 text-[11px] font-bold uppercase tracking-wider">Next Action Required</th>
                    <th className="py-4 text-[11px] font-bold uppercase tracking-wider text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {data.recovery_queue.items.map((item: any) => (
                    <tr key={item.case_id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-5 pl-4 text-slate-900 font-medium tabular-nums">{item.case_id.split('-')[0]}</td>
                      <td className="py-5 text-slate-900 font-bold tabular-nums tracking-tight">{formatCurrency(item.amount)}</td>
                      <td className="py-5">
                        <RiskBadge level={item.risk_level as any} />
                      </td>
                      <td className="py-5 text-slate-700">
                        <span className="px-2.5 py-1 text-[10px] bg-purple-50 text-purple-700 border border-purple-100/50 rounded uppercase tracking-wider font-bold">
                          {item.current_strategy}
                        </span>
                      </td>
                      <td className="py-5 text-slate-500 font-medium text-[13px] capitalize">
                        {item.orchestration_decision.replace('_', ' ').toLowerCase()}
                      </td>
                      <td className="py-5 text-right pr-4">
                        <button 
                          onClick={() => onViewCase(item.case_id)}
                          className="text-purple-600 hover:text-purple-700 font-bold text-[13px] flex items-center gap-1.5 justify-end w-full"
                        >
                          View <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Grid for Strategy and Decision Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Section 5 - Strategy Performance */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 flex flex-col">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h4 className="text-[13px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                Strategy Performance
              </h4>
              <p className="text-xs text-slate-400">Aggregated historical outcomes.</p>
            </div>
            <span className="text-[10px] text-purple-700 px-3 py-1 rounded bg-purple-50 font-bold tracking-wider uppercase border border-purple-100">STRATEGY OUTCOME INTEL</span>
          </div>
          
          {data.strategy_performance.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-12 flex-grow text-center flex flex-col justify-center items-center space-y-4">
              <Activity className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
              <div>
                <p className="text-[15px] font-bold text-slate-900 tracking-tight">Not enough historical data</p>
                <p className="text-[13px] text-slate-500 mt-1">Strategy performance will appear as recovery outcomes accumulate.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 flex-grow">
              {data.strategy_performance.map((strat: any) => (
                <div key={strat.strategy_name} className="py-4 flex justify-between items-center group">
                  <div>
                    <h3 className="text-slate-900 text-sm font-bold tracking-tight capitalize mb-1">{strat.strategy_name.replace('_', ' ').toLowerCase()}</h3>
                    <p className="text-slate-400 text-[11px] font-medium tracking-wide uppercase">{strat.attempts} attempts recorded</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-600 text-sm font-bold tabular-nums mb-1">{strat.success_rate}% Success</p>
                    <p className="text-slate-500 text-[11px] font-bold tabular-nums uppercase tracking-wider">Net: {formatCurrency(strat.net_recovery)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 7 - Decision Intelligence */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 flex flex-col">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h4 className="text-[13px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                Decision Intelligence
              </h4>
              <p className="text-xs text-slate-400">System orchestration and logic explanation.</p>
            </div>
            <span className="text-[10px] text-purple-700 px-3 py-1 rounded bg-purple-50 font-bold tracking-wider uppercase border border-purple-100">DECISION INTELLIGENCE</span>
          </div>
          
          <div className="flex flex-col flex-grow justify-between">
            <p className="text-slate-600 text-[15px] mb-8 leading-relaxed">
              Every action FLOWMINT takes is completely deterministic, relying on merchant guardrails, transparent simulations, and verifiable orchestration logic.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <p className="text-slate-500 text-[11px] mb-2 font-bold uppercase tracking-wider">Cases Assessed</p>
                <p className="text-3xl font-bold text-slate-900 proportional-nums tracking-tight">{metrics.total_cases}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <p className="text-slate-500 text-[11px] mb-2 font-bold uppercase tracking-wider">Actions Orchestrated</p>
                <p className="text-3xl font-bold text-slate-900 proportional-nums tracking-tight">{metrics.total_recovery_actions}</p>
              </div>
              <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100">
                <p className="text-emerald-700 text-[11px] mb-2 font-bold uppercase tracking-wider">Recoveries</p>
                <p className="text-3xl font-bold text-emerald-700 proportional-nums tracking-tight">{metrics.recovered_cases}</p>
              </div>
              <div className="bg-rose-50 p-5 rounded-xl border border-rose-100">
                <p className="text-rose-700 text-[11px] mb-2 font-bold uppercase tracking-wider">Blocked by Safety</p>
                <p className="text-3xl font-bold text-rose-700 proportional-nums tracking-tight">{metrics.blocked_actions}</p>
              </div>
            </div>
            
            <div className="mt-auto pt-2">
              <button 
                onClick={() => onNavigate('explanation')}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[13px] font-bold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Cpu className="w-4 h-4" />
                View Decision Intelligence
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
