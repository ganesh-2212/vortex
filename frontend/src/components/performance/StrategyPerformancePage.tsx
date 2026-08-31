import { ArrowUpRight, TrendingUp, AlertTriangle, ShieldCheck, Activity, Target } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'

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
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Activity className="w-12 h-12 mb-4 opacity-50" />
        <p>No historical performance data available.</p>
      </div>
    )
  }
  return (
    <div className="space-y-8 text-left pb-12 w-full max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-[22px] font-bold text-slate-900 flex items-center gap-2 tracking-tight">
          <TrendingUp className="w-6 h-6 text-purple-600" />
          Strategy Performance
        </h2>
        <p className="text-[15px] text-slate-500 font-medium leading-relaxed">
          Historical evidence and outcome intelligence based on actual execution data.
        </p>
      </div>

      <div className="bg-purple-50/50 border border-purple-100 text-purple-700 p-4 rounded-xl text-[13px] font-bold flex items-center gap-3 shadow-sm uppercase tracking-wider">
        <ShieldCheck className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
        Historical strategy performance is advisory evidence. Deterministic guardrails and merchant policies remain authoritative.
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 transition-colors">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Revenue At Risk</span>
          <span className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">{formatCurrency(performance.total_revenue_at_risk)}</span>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 transition-colors">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Confirmed Recovery</span>
          <span className="text-2xl font-bold text-emerald-600 tabular-nums tracking-tight">{formatCurrency(performance.total_revenue_recovered)}</span>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 transition-colors">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Recovery Rate</span>
          <span className="text-2xl font-bold text-purple-700 tabular-nums tracking-tight">{performance.overall_recovery_rate}%</span>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 transition-colors">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Cases Analyzed</span>
          <span className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">{performance.total_cases_analyzed}</span>
        </div>
        <div className="bg-purple-50/30 rounded-xl p-6 border border-purple-200 shadow-sm flex flex-col">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-purple-600" /> Overall Best
          </span>
          <span className="text-[15px] font-bold text-purple-800 uppercase tracking-tight">{performance.best_strategy.replace(/_/g, ' ')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Strategy Comparison Table */}
        <div className="bg-white rounded-xl p-8 lg:col-span-2 border border-slate-200 shadow-sm">
          <h3 className="text-[17px] font-bold text-slate-900 mb-6 tracking-tight">Strategy Comparison</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="py-4 pl-4 text-[11px] font-bold uppercase tracking-wider">Strategy</th>
                  <th className="py-4 text-right text-[11px] font-bold uppercase tracking-wider">Attempts</th>
                  <th className="py-4 text-right text-[11px] font-bold uppercase tracking-wider">Success Rate</th>
                  <th className="py-4 text-right text-[11px] font-bold uppercase tracking-wider">Recovered</th>
                  <th className="py-4 text-right text-[11px] font-bold uppercase tracking-wider">Cost</th>
                  <th className="py-4 text-right pr-4 text-[11px] font-bold uppercase tracking-wider">Net Recovery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {performance.strategy_statistics.map((strat) => {
                  const isBest = strat.strategy_type === performance.best_strategy
                  const isLowSample = strat.total_attempts < 5
                  
                  return (
                    <tr key={strat.strategy_type} className={`hover:bg-slate-50/50 transition-colors ${isBest ? 'bg-purple-50/30' : ''}`}>
                      <td className="py-5 pl-4 font-bold text-slate-900 uppercase tracking-tight">
                        <div className="flex items-center gap-3">
                          {strat.strategy_type.replace(/_/g, ' ')}
                          {isBest && <span className="text-[9px] text-purple-700 font-bold uppercase bg-purple-50 border border-purple-200 px-2 py-1 rounded tracking-wider">Best Overall</span>}
                          {isLowSample && <span className="text-[9px] text-amber-600 font-bold uppercase bg-amber-50 border border-amber-200 px-2 py-1 rounded flex items-center gap-1.5 tracking-wider"><AlertTriangle className="w-3 h-3" strokeWidth={2.5} /> Low Data</span>}
                        </div>
                      </td>
                      <td className="py-5 text-right tabular-nums font-medium text-slate-700">{strat.total_attempts}</td>
                      <td className="py-5 text-right tabular-nums font-medium text-slate-700">{strat.success_rate}%</td>
                      <td className="py-5 text-right tabular-nums font-bold text-emerald-600 tracking-tight">{formatCurrency(strat.total_recovered)}</td>
                      <td className="py-5 text-right tabular-nums text-slate-500">{formatCurrency(strat.total_cost)}</td>
                      <td className="py-5 text-right tabular-nums font-bold text-emerald-700 pr-4 tracking-tight">{formatCurrency(strat.net_recovery)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expected vs Actual Variance */}
        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
          <h3 className="text-[17px] font-bold text-slate-900 mb-6 tracking-tight">Expected vs Actual Recovery</h3>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {performance.strategy_statistics.map(strat => {
              const variancePos = strat.recovery_variance >= 0
              return (
                <div key={strat.strategy_type} className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex items-center justify-between shadow-sm hover:border-slate-300 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-900 uppercase mb-1.5 tracking-wider">{strat.strategy_type.replace(/_/g, ' ')}</span>
                    <span className="text-[13px] text-slate-500 tabular-nums font-medium">Exp: {formatCurrency(strat.expected_recovery)} | Act: {formatCurrency(strat.actual_recovery)}</span>
                  </div>
                  <div className={`text-[15px] font-bold tabular-nums tracking-tight flex items-center gap-1.5 ${variancePos ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {variancePos ? '+' : ''}{formatCurrency(strat.recovery_variance)}
                    {variancePos ? <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} /> : <TrendingUp className="w-4 h-4 rotate-180" strokeWidth={2.5} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Performance by Event Type */}
        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
          <h3 className="text-[17px] font-bold text-slate-900 mb-6 tracking-tight">Best Strategy By Event Type</h3>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {eventPerformance.length === 0 ? (
               <p className="text-[13px] text-slate-400 font-medium italic">No events analyzed.</p>
            ) : (
              eventPerformance.map((ep) => (
                <div key={ep.event_type} className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm hover:border-slate-300 transition-colors">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">{ep.event_type}</span>
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Cases: {ep.total_cases}</span>
                  </div>
                  <div className="flex items-center gap-4 bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className="text-[11px] text-slate-400 uppercase block mb-1 font-bold tracking-wider">Historical Best</span>
                      <span className="text-[13px] font-bold text-purple-700 uppercase tracking-tight">{ep.best_strategy.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-right flex flex-col">
                      <span className="text-[11px] text-slate-400 uppercase block mb-1 font-bold tracking-wider">Success Rate</span>
                      <span className="text-[15px] tabular-nums font-bold text-slate-900">{ep.best_strategy_success_rate}%</span>
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
