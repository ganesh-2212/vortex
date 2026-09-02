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
        <h2 className="text-[22px] font-bold text-slate-900 dark:text-brand-text-primary flex items-center gap-2 tracking-tight transition-colors">
          <TrendingUp className="w-6 h-6 text-purple-600 dark:text-brand-ai" />
          Strategy Performance
        </h2>
        <p className="text-[15px] text-slate-500 dark:text-brand-text-muted font-medium leading-relaxed transition-colors">
          Historical evidence and outcome intelligence based on actual execution data.
        </p>
      </div>

      <div className="bg-purple-50/50 dark:bg-brand-ai/10 border border-purple-100 dark:border-brand-ai/20 text-purple-700 dark:text-brand-ai p-4 rounded-xl text-[13px] font-bold flex items-center gap-3 shadow-sm uppercase tracking-wider transition-colors duration-200">
        <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-brand-ai" strokeWidth={2.5} />
        Historical strategy performance is advisory evidence. Deterministic guardrails and merchant policies remain authoritative.
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-brand-surface-dark rounded-xl p-6 border border-slate-200 dark:border-brand-border-dark shadow-sm flex flex-col hover:border-slate-300 dark:hover:border-brand-border-subtle transition-colors duration-200">
          <span className="text-[11px] text-slate-400 dark:text-brand-text-muted font-bold uppercase tracking-wider block mb-2">Revenue At Risk</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-brand-text-primary tabular-nums tracking-tight">{formatCurrency(performance.total_revenue_at_risk)}</span>
        </div>
        <div className="bg-white dark:bg-brand-surface-dark rounded-xl p-6 border border-slate-200 dark:border-brand-border-dark shadow-sm flex flex-col hover:border-slate-300 dark:hover:border-brand-border-subtle transition-colors duration-200">
          <span className="text-[11px] text-slate-400 dark:text-brand-text-muted font-bold uppercase tracking-wider block mb-2">Confirmed Recovery</span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-brand-success tabular-nums tracking-tight">{formatCurrency(performance.total_revenue_recovered)}</span>
        </div>
        <div className="bg-white dark:bg-brand-surface-dark rounded-xl p-6 border border-slate-200 dark:border-brand-border-dark shadow-sm flex flex-col hover:border-slate-300 dark:hover:border-brand-border-subtle transition-colors duration-200">
          <span className="text-[11px] text-slate-400 dark:text-brand-text-muted font-bold uppercase tracking-wider block mb-2">Recovery Rate</span>
          <span className="text-2xl font-bold text-purple-700 dark:text-brand-ai tabular-nums tracking-tight">{performance.overall_recovery_rate}%</span>
        </div>
        <div className="bg-white dark:bg-brand-surface-dark rounded-xl p-6 border border-slate-200 dark:border-brand-border-dark shadow-sm flex flex-col hover:border-slate-300 dark:hover:border-brand-border-subtle transition-colors duration-200">
          <span className="text-[11px] text-slate-400 dark:text-brand-text-muted font-bold uppercase tracking-wider block mb-2">Cases Analyzed</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-brand-text-primary tabular-nums tracking-tight">{performance.total_cases_analyzed}</span>
        </div>
        <div className="bg-purple-50/30 dark:bg-brand-ai/10 rounded-xl p-6 border border-purple-200 dark:border-brand-ai/20 shadow-sm flex flex-col transition-colors duration-200">
          <span className="text-[11px] text-slate-400 dark:text-brand-text-muted font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-purple-600 dark:text-brand-ai" /> Overall Best
          </span>
          <span className="text-[15px] font-bold text-purple-800 dark:text-brand-ai uppercase tracking-tight">{performance.best_strategy.replace(/_/g, ' ')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Strategy Comparison Table */}
        <div className="bg-white dark:bg-brand-surface-dark rounded-xl p-8 lg:col-span-2 border border-slate-200 dark:border-brand-border-dark shadow-sm transition-colors duration-200">
          <h3 className="text-[17px] font-bold text-slate-900 dark:text-brand-text-primary mb-6 tracking-tight">Strategy Comparison</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-brand-border-dark text-slate-400 dark:text-brand-text-muted">
                  <th className="py-4 pl-4 text-[11px] font-bold uppercase tracking-wider">Strategy</th>
                  <th className="py-4 text-right text-[11px] font-bold uppercase tracking-wider">Attempts</th>
                  <th className="py-4 text-right text-[11px] font-bold uppercase tracking-wider">Success Rate</th>
                  <th className="py-4 text-right text-[11px] font-bold uppercase tracking-wider">Recovered</th>
                  <th className="py-4 text-right text-[11px] font-bold uppercase tracking-wider">Cost</th>
                  <th className="py-4 text-right pr-4 text-[11px] font-bold uppercase tracking-wider">Net Recovery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-brand-border-dark text-[13px]">
                {performance.strategy_statistics.map((strat) => {
                  const isBest = strat.strategy_type === performance.best_strategy
                  const isLowSample = strat.total_attempts < 5
                  
                  return (
                    <tr key={strat.strategy_type} className={`hover:bg-slate-50/50 dark:hover:bg-brand-card-dark transition-colors ${isBest ? 'bg-purple-50/30 dark:bg-brand-ai/10' : ''}`}>
                      <td className="py-5 pl-4 font-bold text-slate-900 dark:text-brand-text-primary uppercase tracking-tight">
                        <div className="flex items-center gap-3">
                          {strat.strategy_type.replace(/_/g, ' ')}
                          {isBest && <span className="text-[9px] text-purple-700 dark:text-brand-ai font-bold uppercase bg-purple-50 dark:bg-brand-ai/10 border border-purple-200 dark:border-brand-ai/30 px-2 py-1 rounded tracking-wider">Best Overall</span>}
                          {isLowSample && <span className="text-[9px] text-amber-600 dark:text-brand-warning font-bold uppercase bg-amber-50 dark:bg-brand-warning/10 border border-amber-200 dark:border-brand-warning/30 px-2 py-1 rounded flex items-center gap-1.5 tracking-wider"><AlertTriangle className="w-3 h-3" strokeWidth={2.5} /> Low Data</span>}
                        </div>
                      </td>
                      <td className="py-5 text-right tabular-nums font-medium text-slate-700 dark:text-brand-text-primary">{strat.total_attempts}</td>
                      <td className="py-5 text-right tabular-nums font-medium text-slate-700 dark:text-brand-text-primary">{strat.success_rate}%</td>
                      <td className="py-5 text-right tabular-nums font-bold text-emerald-600 dark:text-brand-success tracking-tight">{formatCurrency(strat.total_recovered)}</td>
                      <td className="py-5 text-right tabular-nums text-slate-500 dark:text-brand-text-secondary">{formatCurrency(strat.total_cost)}</td>
                      <td className="py-5 text-right tabular-nums font-bold text-emerald-700 dark:text-brand-success pr-4 tracking-tight">{formatCurrency(strat.net_recovery)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expected vs Actual Variance */}
        <div className="bg-white dark:bg-brand-surface-dark rounded-xl p-8 border border-slate-200 dark:border-brand-border-dark shadow-sm transition-colors duration-200">
          <h3 className="text-[17px] font-bold text-slate-900 dark:text-brand-text-primary mb-6 tracking-tight">Expected vs Actual Recovery</h3>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {performance.strategy_statistics.map(strat => {
              const variancePos = strat.recovery_variance >= 0
              return (
                <div key={strat.strategy_type} className="bg-slate-50 dark:bg-brand-card-dark border border-slate-200 dark:border-brand-border-dark p-5 rounded-xl flex items-center justify-between shadow-sm hover:border-slate-300 dark:hover:border-brand-border-subtle transition-colors duration-200">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-900 dark:text-brand-text-primary uppercase mb-1.5 tracking-wider">{strat.strategy_type.replace(/_/g, ' ')}</span>
                    <span className="text-[13px] text-slate-500 dark:text-brand-text-secondary tabular-nums font-medium">Exp: {formatCurrency(strat.expected_recovery)} | Act: {formatCurrency(strat.actual_recovery)}</span>
                  </div>
                  <div className={`text-[15px] font-bold tabular-nums tracking-tight flex items-center gap-1.5 ${variancePos ? 'text-emerald-600 dark:text-brand-success' : 'text-rose-600 dark:text-brand-danger'}`}>
                    {variancePos ? '+' : ''}{formatCurrency(strat.recovery_variance)}
                    {variancePos ? <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} /> : <TrendingUp className="w-4 h-4 rotate-180" strokeWidth={2.5} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Performance by Event Type */}
        <div className="bg-white dark:bg-brand-surface-dark rounded-xl p-8 border border-slate-200 dark:border-brand-border-dark shadow-sm transition-colors duration-200">
          <h3 className="text-[17px] font-bold text-slate-900 dark:text-brand-text-primary mb-6 tracking-tight">Best Strategy By Event Type</h3>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {eventPerformance.length === 0 ? (
               <p className="text-[13px] text-slate-400 dark:text-brand-text-muted font-medium italic">No events analyzed.</p>
            ) : (
              eventPerformance.map((ep) => (
                <div key={ep.event_type} className="bg-slate-50 dark:bg-brand-card-dark border border-slate-200 dark:border-brand-border-dark p-5 rounded-xl space-y-4 shadow-sm hover:border-slate-300 dark:hover:border-brand-border-subtle transition-colors duration-200">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-brand-border-dark pb-3">
                    <span className="text-[11px] font-bold text-slate-900 dark:text-brand-text-primary uppercase tracking-wider">{ep.event_type}</span>
                    <span className="text-[11px] text-slate-500 dark:text-brand-text-muted font-bold uppercase tracking-wider">Cases: {ep.total_cases}</span>
                  </div>
                  <div className="flex items-center gap-4 bg-white dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-dark p-4 rounded-lg shadow-sm transition-colors duration-200">
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className="text-[11px] text-slate-400 dark:text-brand-text-muted uppercase block mb-1 font-bold tracking-wider">Historical Best</span>
                      <span className="text-[13px] font-bold text-purple-700 dark:text-brand-ai uppercase tracking-tight">{ep.best_strategy.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-right flex flex-col">
                      <span className="text-[11px] text-slate-400 dark:text-brand-text-muted uppercase block mb-1 font-bold tracking-wider">Success Rate</span>
                      <span className="text-[15px] tabular-nums font-bold text-slate-900 dark:text-brand-text-primary">{ep.best_strategy_success_rate}%</span>
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
