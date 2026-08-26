import { ArrowUpRight, TrendingUp, AlertTriangle, ShieldCheck, Activity, Target } from 'lucide-react'

interface StrategyOutcomeStatistics {
  strategy_type: string
  total_attempts: number
  successful_attempts: number
  failed_attempts: number
  success_rate: number
  total_recovered: number
  average_recovered: number
  total_cost: number
  net_recovery: number
  average_attempts_to_recovery: number
  expected_recovery: number
  actual_recovery: number
  recovery_variance: number
}

interface StrategyPerformanceResponse {
  generated_at: string
  total_cases_analyzed: number
  total_revenue_at_risk: number
  total_revenue_recovered: number
  overall_recovery_rate: number
  strategy_statistics: StrategyOutcomeStatistics[]
  best_strategy: string
  strongest_strategy_by_revenue: string
  strongest_strategy_by_success_rate: string
}

interface EventStrategyPerformance {
  event_type: string
  total_cases: number
  best_strategy: string
  best_strategy_success_rate: number
  best_strategy_net_recovery: number
  strategy_breakdown: StrategyOutcomeStatistics[]
}

interface Props {
  performance: StrategyPerformanceResponse | null
  eventPerformance: EventStrategyPerformance[]
}

export default function StrategyPerformancePage({ performance, eventPerformance }: Props) {
  if (!performance) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Activity className="w-12 h-12 mb-4 opacity-50" />
        <p>No historical performance data available.</p>
      </div>
    )
  }

  const formatCurrency = (val: number | string) => {
    return `₹${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6 text-left pb-10">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-400" />
            Strategy Performance (F14)
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Historical evidence and outcome intelligence based on actual execution data.
          </p>
        </div>
      </div>

      <div className="bg-[#1b1e28]/20 border border-purple-500/20 text-purple-300 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-purple-400" />
        Historical strategy performance is advisory evidence. Deterministic guardrails and merchant policies remain authoritative.
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#13151c] border border-[#202430] rounded-xl p-4">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Total At Risk</span>
          <span className="text-lg font-bold text-gray-200 mt-1 block font-mono">{formatCurrency(performance.total_revenue_at_risk)}</span>
        </div>
        <div className="bg-[#13151c] border border-[#202430] rounded-xl p-4">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Total Recovered</span>
          <span className="text-lg font-bold text-emerald-400 mt-1 block font-mono">{formatCurrency(performance.total_revenue_recovered)}</span>
        </div>
        <div className="bg-[#13151c] border border-[#202430] rounded-xl p-4">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Recovery Rate</span>
          <span className="text-lg font-bold text-purple-400 mt-1 block font-mono">{performance.overall_recovery_rate}%</span>
        </div>
        <div className="bg-[#13151c] border border-[#202430] rounded-xl p-4">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Cases Analyzed</span>
          <span className="text-lg font-bold text-gray-200 mt-1 block font-mono">{performance.total_cases_analyzed}</span>
        </div>
        <div className="bg-[#13151c] border border-purple-500/30 rounded-xl p-4 bg-purple-950/10">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block flex items-center gap-1.5">
            <Target className="w-3 h-3 text-purple-400" /> Overall Best Strategy
          </span>
          <span className="text-sm font-bold text-purple-300 mt-2 block uppercase">{performance.best_strategy.replace(/_/g, ' ')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Strategy Comparison Table */}
        <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-200 mb-4 border-b border-[#202430] pb-2">Strategy Comparison</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#202430] text-gray-500 font-medium text-[10px] uppercase tracking-wider">
                  <th className="py-2 pl-2">Strategy</th>
                  <th className="py-2 text-right">Attempts</th>
                  <th className="py-2 text-right">Success Rate</th>
                  <th className="py-2 text-right">Recovered</th>
                  <th className="py-2 text-right">Cost</th>
                  <th className="py-2 text-right">Net Recovery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202430]/50 font-mono text-[11px]">
                {performance.strategy_statistics.map((strat) => {
                  const isBest = strat.strategy_type === performance.best_strategy
                  const isLowSample = strat.total_attempts < 5
                  
                  return (
                    <tr key={strat.strategy_type} className={`hover:bg-[#1a1c24]/30 ${isBest ? 'bg-purple-950/10 border-l-2 border-purple-500' : ''}`}>
                      <td className="py-3 pl-2 font-semibold text-gray-300">
                        <div className="flex items-center gap-2">
                          {strat.strategy_type.replace(/_/g, ' ')}
                          {isBest && <span className="text-[9px] text-purple-400 font-bold uppercase bg-purple-950/40 px-1 rounded">Best Overall</span>}
                          {isLowSample && <span className="text-[9px] text-amber-500 font-bold uppercase bg-amber-950/40 px-1 rounded flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5"/> Low Data</span>}
                        </div>
                      </td>
                      <td className="py-3 text-right text-gray-200">{strat.total_attempts}</td>
                      <td className="py-3 text-right text-gray-200">{strat.success_rate}%</td>
                      <td className="py-3 text-right text-emerald-400">{formatCurrency(strat.total_recovered)}</td>
                      <td className="py-3 text-right text-gray-400">{formatCurrency(strat.total_cost)}</td>
                      <td className="py-3 text-right text-emerald-400 font-bold">{formatCurrency(strat.net_recovery)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expected vs Actual Variance */}
        <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-4 border-b border-[#202430] pb-2">Expected vs Actual Recovery</h3>
          <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
            {performance.strategy_statistics.map(strat => {
              const variancePos = strat.recovery_variance >= 0
              return (
                <div key={strat.strategy_type} className="bg-[#1b1e28]/40 border border-[#202430] p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-300 uppercase block">{strat.strategy_type.replace(/_/g, ' ')}</span>
                    <span className="text-[9px] text-gray-500 font-mono">Exp: {formatCurrency(strat.expected_recovery)} | Act: {formatCurrency(strat.actual_recovery)}</span>
                  </div>
                  <div className={`text-xs font-bold font-mono flex items-center gap-1 ${variancePos ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {variancePos ? '+' : ''}{formatCurrency(strat.recovery_variance)}
                    {variancePos ? <ArrowUpRight className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Performance by Event Type */}
        <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-4 border-b border-[#202430] pb-2">Best Strategy By Event Type</h3>
          <div className="space-y-3">
            {eventPerformance.length === 0 ? (
               <p className="text-xs text-gray-500 italic">No events analyzed.</p>
            ) : (
              eventPerformance.map((ep) => (
                <div key={ep.event_type} className="bg-[#1b1e28]/40 border border-[#202430] p-3 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wide">{ep.event_type}</span>
                    <span className="text-[9px] text-gray-500">Cases: {ep.total_cases}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-purple-950/10 border border-purple-500/10 p-2 rounded">
                    <div className="flex-1">
                      <span className="text-[9px] text-gray-500 uppercase block">Historical Best</span>
                      <span className="text-xs font-bold text-purple-300 block">{ep.best_strategy.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-gray-500 uppercase block">Success Rate</span>
                      <span className="text-xs font-mono font-bold text-gray-200 block">{ep.best_strategy_success_rate}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
