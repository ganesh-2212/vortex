import { useEffect, useState } from 'react'
import { getMerchantCommandCenter } from '../../api'
import { RefreshCw, ArrowRight, AlertCircle, Activity, Layers, Cpu } from 'lucide-react'
import { RiskBadge } from '../common/LoaderAndStates'

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

  const formatCurrency = (val: string | number) => {
    return `₹${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Revenue Command Center...</div>
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
          <h2 className="text-xl font-bold text-gray-100">Revenue Command Center</h2>
          <p className="text-xs text-gray-400 mt-1">
            Real-time view of revenue risk, recovery performance, and active recovery operations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            Last updated: {new Date(data.generated_at).toLocaleTimeString()}
          </p>
          <button 
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 bg-[#1b1e28] hover:bg-[#202430] border border-[#2e3445] text-xs text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Section 1 - Executive Metrics */}
      <div className="bg-[#13151c]/60 border border-[#202430] rounded-xl p-4.5 space-y-4">
        <h4 className="text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-[#202430] pb-2">
          Executive Revenue Metrics
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-[#13151c] border border-[#202430] rounded-lg p-3">
            <span className="text-[10px] text-rose-500 font-bold block uppercase tracking-wide">ACTUAL Revenue At Risk</span>
            <span className="text-base font-bold text-rose-500 font-mono mt-1.5 block">
              {formatCurrency(metrics.total_revenue_at_risk)}
            </span>
          </div>
          <div className="bg-[#13151c] border border-[#202430] rounded-lg p-3">
            <span className="text-[10px] text-orange-400 font-bold block uppercase tracking-wide">ACTUAL Recoverable</span>
            <span className="text-base font-bold text-orange-400 font-mono mt-1.5 block">
              {formatCurrency(metrics.total_recoverable_revenue)}
            </span>
          </div>
          <div className="bg-[#13151c] border border-[#202430] rounded-lg p-3">
            <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wide">ACTUAL Confirmed</span>
            <span className="text-base font-bold text-emerald-400 font-mono mt-1.5 block">
              {formatCurrency(metrics.total_confirmed_recovered)}
            </span>
          </div>
          <div className="bg-[#13151c] border border-[#202430] rounded-lg p-3">
            <span className="text-[10px] text-purple-400 font-bold block uppercase tracking-wide">PROJECTED Incremental</span>
            <span className="text-base font-bold text-purple-400 font-mono mt-1.5 block">
              +{formatCurrency(metrics.total_incremental_revenue)}
            </span>
            <span className="text-[9px] text-gray-500 mt-1 block">vs Basic Retry</span>
          </div>
          <div className="bg-[#13151c] border border-[#202430] rounded-lg p-3">
            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wide">ACTUAL Recovery Rate</span>
            <span className="text-base font-bold text-gray-100 font-mono mt-1.5 block">
              {metrics.recovery_rate}%
            </span>
          </div>
        </div>
      </div>

      {/* Section 2 - Recovery Performance (F12) */}
      <div className="bg-[#13151c]/60 border border-[#202430] rounded-xl p-4.5 space-y-4">
        <h4 className="text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-[#202430] pb-2 flex items-center justify-between">
          SIMULATED BASELINE COMPARISON
          <span className="text-[9px] text-purple-400 px-2 py-0.5 rounded bg-purple-900/20 border border-purple-500/20">F12 SIMULATION ENGINE</span>
        </h4>
        {!data.simulation_available ? (
          <div className="bg-[#13151c] border border-[#202430] rounded-lg p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-gray-600" />
            <div>
              <p className="text-sm font-semibold text-gray-300">Simulation evidence not available yet</p>
              <p className="text-xs text-gray-500 mt-1">Run a recovery simulation to compare Sentinel against baseline strategies.</p>
            </div>
            <button 
              onClick={() => onNavigate('simulation')}
              className="mt-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-medium transition-colors"
            >
              Run Simulation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.revenue_comparison.map((comp: any) => {
              const isOptimized = comp.scenario_type === 'SENTINEL_OPTIMIZED'
              return (
                <div key={comp.scenario_type} className={`relative rounded-xl p-5 border ${isOptimized ? 'bg-purple-950/15 border-purple-500/20' : 'bg-[#13151c] border-[#202430]'}`}>
                  {isOptimized && (
                    <div className="absolute top-0 right-0 bg-purple-500/20 text-purple-300 text-[9px] font-bold px-2 py-1 rounded-bl-lg">
                      OPTIMIZED
                    </div>
                  )}
                  <h3 className="text-xs font-semibold text-gray-200 mb-3 flex items-center justify-between">
                    {comp.scenario_type.replace('_', ' ')}
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#202430] text-gray-400 rounded">SIMULATED</span>
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-[11px]">Projected Recovery</span>
                      <span className="text-gray-200 text-xs font-mono">{formatCurrency(comp.simulated_projected_recovery)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-[11px]">Cost</span>
                      <span className="text-gray-400 text-xs font-mono">{formatCurrency(comp.intervention_cost)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#202430]">
                      <span className="text-gray-400 text-[11px] font-medium">Net Recovery</span>
                      <span className="text-emerald-400 text-xs font-bold font-mono">{formatCurrency(comp.net_recovery)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-[11px]">Rate</span>
                      <span className="text-gray-200 text-xs font-mono">{comp.recovery_rate_percentage}%</span>
                    </div>
                    {comp.projected_incremental_revenue > 0 && (
                      <div className="flex justify-between pt-2">
                        <span className="text-purple-300 text-[11px] font-medium">Incremental Value</span>
                        <span className="text-purple-400 text-xs font-bold font-mono">+{formatCurrency(comp.projected_incremental_revenue)}</span>
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
        <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl overflow-hidden">
          <div className="bg-rose-900/40 px-4 py-3 border-b border-rose-500/30 flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Requires Human Attention</h4>
          </div>
          <div className="divide-y divide-rose-900/30">
            {data.human_attention_cases.map((attn: any) => (
              <div key={attn.case_id} className="p-4 flex items-center justify-between hover:bg-rose-900/10 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-rose-100 font-medium text-xs">Case {attn.case_id.split('-')[0]}</span>
                    <span className="text-rose-400/80 font-mono text-[11px]">{formatCurrency(attn.amount)}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#13151c] text-gray-300 border border-[#202430]">
                      {attn.current_state}
                    </span>
                    <span className="text-[10px] text-rose-600/80">Age: {attn.case_age_hours}h</span>
                  </div>
                  <p className="text-rose-300/70 text-[11px]">{attn.reason}</p>
                </div>
                <button 
                  onClick={() => onViewCase(attn.case_id)}
                  className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-400 text-xs rounded-lg transition-colors font-medium"
                >
                  View Case
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3 - Active Recovery Queue */}
      <div className="bg-[#13151c]/60 border border-[#202430] rounded-xl p-4.5 space-y-4">
        <h4 className="text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-[#202430] pb-2 flex items-center justify-between">
          <span>Active Recovery Queue</span>
          <span className="bg-[#202430] text-gray-300 text-[9px] px-2 py-0.5 rounded-full">
            {data.recovery_queue.items.length} Active
          </span>
        </h4>
        {data.recovery_queue.items.length === 0 ? (
          <div className="bg-[#13151c] border border-[#202430] rounded-lg p-8 text-center space-y-2">
            <Layers className="w-8 h-8 mx-auto text-gray-600" />
            <p className="text-sm font-semibold text-gray-300">No active recovery cases</p>
            <p className="text-xs text-gray-500">There are currently no cases requiring intervention.</p>
          </div>
        ) : (
          <div className="bg-[#13151c] border border-[#202430] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#202430] text-gray-400 font-medium">
                    <th className="px-4 py-3 font-medium">Case</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Risk</th>
                    <th className="px-4 py-3 font-medium">Strategy</th>
                    <th className="px-4 py-3 font-medium">Next Action</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202430]/50">
                  {data.recovery_queue.items.map((item: any) => (
                    <tr key={item.case_id} className="hover:bg-[#202430]/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-300">{item.case_id.split('-')[0]}</td>
                      <td className="px-4 py-3 text-gray-100 font-mono">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3">
                        <RiskBadge level={item.risk_level as any} />
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        <span className="px-2 py-0.5 text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">
                          {item.current_strategy}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-[11px]">
                        {item.orchestration_decision.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => onViewCase(item.case_id)}
                          className="text-purple-400 hover:text-purple-300 font-medium text-[11px] flex items-center gap-1 justify-end w-full"
                        >
                          View <ArrowRight className="w-3 h-3" />
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
        <div className="bg-[#13151c]/60 border border-[#202430] rounded-xl p-4.5 space-y-4">
          <h4 className="text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-[#202430] pb-2 flex justify-between items-center">
            Strategy Performance
            <span className="text-[9px] text-purple-400 px-2 py-0.5 rounded bg-purple-900/20 border border-purple-500/20">F14 OUTCOME INTEL</span>
          </h4>
          {data.strategy_performance.length === 0 ? (
            <div className="bg-[#13151c] border border-[#202430] rounded-lg p-6 text-center h-[calc(100%-2rem)] flex flex-col justify-center">
              <Activity className="w-6 h-6 mx-auto text-gray-600 mb-2" />
              <p className="text-sm font-semibold text-gray-300">Not enough historical data</p>
              <p className="text-xs text-gray-500 mt-1">Strategy performance will appear as recovery outcomes accumulate.</p>
            </div>
          ) : (
            <div className="bg-[#13151c] border border-[#202430] rounded-lg overflow-hidden divide-y divide-[#202430]">
              {data.strategy_performance.map((strat: any) => (
                <div key={strat.strategy_name} className="p-3.5 flex justify-between items-center hover:bg-[#202430]/30">
                  <div>
                    <h3 className="text-gray-200 text-xs font-semibold mb-0.5">{strat.strategy_name.replace('_', ' ')}</h3>
                    <p className="text-gray-500 text-[10px]">{strat.attempts} attempts recorded</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 text-xs font-bold font-mono mb-0.5">{strat.success_rate}% Success</p>
                    <p className="text-gray-400 text-[10px] font-mono">Net: {formatCurrency(strat.net_recovery)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 7 - Decision Intelligence */}
        <div className="bg-[#13151c]/60 border border-[#202430] rounded-xl p-4.5 flex flex-col">
          <h4 className="text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-[#202430] pb-2 mb-4 flex items-center justify-between">
            Decision Intelligence
            <span className="text-[9px] text-purple-400 px-2 py-0.5 rounded bg-purple-900/20 border border-purple-500/20">F15 EXPLAINABILITY</span>
          </h4>
          <div className="bg-[#13151c] border border-[#202430] rounded-lg p-5 flex flex-col flex-grow">
            <p className="text-gray-400 text-xs mb-5 leading-relaxed">
              Every action Revenue Sentinel takes is completely deterministic, relying on merchant guardrails, transparent simulations, and verifiable orchestration logic. No black boxes.
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-[#1b1e28] p-3 rounded-lg border border-[#202430]">
                <p className="text-gray-500 text-[9px] mb-1 uppercase tracking-wider font-bold">Cases Assessed</p>
                <p className="text-lg font-mono font-bold text-gray-200">{metrics.total_cases}</p>
              </div>
              <div className="bg-[#1b1e28] p-3 rounded-lg border border-[#202430]">
                <p className="text-gray-500 text-[9px] mb-1 uppercase tracking-wider font-bold">Actions Orchestrated</p>
                <p className="text-lg font-mono font-bold text-gray-200">{metrics.total_recovery_actions}</p>
              </div>
              <div className="bg-[#1b1e28] p-3 rounded-lg border border-[#202430]">
                <p className="text-gray-500 text-[9px] mb-1 uppercase tracking-wider font-bold">Recoveries</p>
                <p className="text-lg font-mono font-bold text-emerald-400">{metrics.recovered_cases}</p>
              </div>
              <div className="bg-[#1b1e28] p-3 rounded-lg border border-[#202430]">
                <p className="text-gray-500 text-[9px] mb-1 uppercase tracking-wider font-bold">Blocked by Safety</p>
                <p className="text-lg font-mono font-bold text-rose-400">{metrics.blocked_actions}</p>
              </div>
            </div>

            <div className="mt-auto pt-2">
              <button 
                onClick={() => onNavigate('explanation')}
                className="w-full py-2.5 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-400 text-xs rounded-lg transition-colors font-medium flex justify-center items-center gap-2"
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
