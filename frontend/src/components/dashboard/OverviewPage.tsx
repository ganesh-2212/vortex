import { ChevronRight } from 'lucide-react'
import { RiskBadge } from '../common/LoaderAndStates'

interface OverviewPageProps {
  summary: any
  leakage: any[]
  priorities: any[]
  stats: any
  onSelectCase: (caseId: string) => void
}

export default function OverviewPage({
  summary,
  leakage,
  priorities,
  stats,
  onSelectCase
}: OverviewPageProps) {
  const formatCurrency = (val: string | number) => {
    return `₹${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Risk levels styling helper
  const riskLevels = [
    { key: 'CRITICAL', label: 'Critical Risk', val: summary?.critical_amount || '0.00', color: 'bg-rose-500' },
    { key: 'HIGH', label: 'High Risk', val: summary?.high_amount || '0.00', color: 'bg-orange-500' },
    { key: 'MEDIUM', label: 'Medium Risk', val: summary?.medium_amount || '0.00', color: 'bg-yellow-500' },
    { key: 'LOW', label: 'Low Risk', val: summary?.low_amount || '0.00', color: 'bg-emerald-500' }
  ]

  // Calculate total at risk to render the relative magnitude percentage bar
  const totalAtRisk = Number(summary?.revenue_at_risk || 0.0)

  return (
    <div className="space-y-6">
      
      {/* Metrics Groups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Section 1: Revenue Exposure */}
        <div className="bg-[#13151c]/60 border border-[#202430] rounded-xl p-4.5 space-y-4">
          <h4 className="text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-[#202430] pb-2">
            Revenue Exposure
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#13151c] border border-[#202430] rounded-lg p-3">
              <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wide">Revenue at Risk</span>
              <span className="text-base font-bold text-gray-100 font-mono mt-1.5 block">
                {formatCurrency(summary?.revenue_at_risk || '0')}
              </span>
            </div>
            <div className="bg-[#13151c] border border-[#202430] rounded-lg p-3">
              <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wide">Open Cases</span>
              <span className="text-base font-bold text-gray-100 font-mono mt-1.5 block">
                {summary?.open_case_count || 0}
              </span>
            </div>
          </div>
          <span className="text-[9px] text-gray-500 block leading-relaxed">
            Direct financial exposure tracked across active unresolved cases.
          </span>
        </div>

        {/* Section 2: Recovery Potential */}
        <div className="bg-[#13151c]/60 border border-purple-500/10 rounded-xl p-4.5 space-y-4">
          <h4 className="text-[10px] text-purple-400 font-bold uppercase tracking-wider border-b border-[#202430] pb-2">
            Recovery Potential
          </h4>
          <div className="bg-[#13151c] border border-[#202430] rounded-lg p-3">
            <span className="text-[10px] text-purple-300 font-bold block uppercase tracking-wide">Estimated Recoverable</span>
            <span className="text-base font-bold text-purple-300 font-mono mt-1.5 block">
              {formatCurrency(summary?.estimated_recoverable || '0')}
            </span>
          </div>
          <span className="text-[9px] text-purple-300/80 block leading-relaxed font-medium">
            Heuristic estimate — not money actually recovered.
          </span>
        </div>

        {/* Section 3: Confirmed Recovery */}
        <div className="bg-[#13151c]/60 border border-emerald-500/10 rounded-xl p-4.5 space-y-4">
          <h4 className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider border-b border-[#202430] pb-2">
            Confirmed Recovery
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#13151c] border border-[#202430] rounded-lg p-3">
              <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wide">Actual Recovered</span>
              <span className="text-base font-bold text-emerald-400 font-mono mt-1.5 block">
                {formatCurrency(stats?.actual_recovered_revenue || '0')}
              </span>
            </div>
            <div className="bg-[#13151c] border border-[#202430] rounded-lg p-3">
              <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wide">Recovery Rate</span>
              <span className="text-base font-bold text-emerald-400 font-mono mt-1.5 block">
                {(stats?.recovery_rate || 0).toFixed(1)}%
              </span>
            </div>
          </div>
          <span className="text-[9px] text-emerald-400/95 block leading-relaxed font-bold tracking-wide">
            Confirmed revenue from successful recovery execution.
          </span>
        </div>
      </div>

      {/* Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Risk Distribution relative magnitude bar chart */}
          <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 md:p-6">
            <h3 className="text-sm font-semibold text-gray-200 mb-4">Risk Distribution Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {riskLevels.map((lvl) => {
                const amount = Number(lvl.val)
                const percentage = totalAtRisk > 0 ? (amount / totalAtRisk) * 100 : 0
                return (
                  <div key={lvl.key} className="bg-[#1b1e28]/20 border border-[#202430] rounded-lg p-3">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono">{lvl.label}</span>
                    <div className="text-base font-bold text-gray-100 font-mono mt-1">{formatCurrency(lvl.val)}</div>
                    
                    {/* visual relative bar */}
                    <div className="h-1 bg-[#202430] rounded-full overflow-hidden mt-3.5">
                      <div className={`h-full ${lvl.color}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                    <span className="text-[8px] text-gray-500 font-mono mt-1 block text-right">{percentage.toFixed(0)}% of risk share</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Leakage Category analysis list */}
          <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 md:p-6">
            <h3 className="text-sm font-semibold text-gray-200 mb-4">Leakage Analysis by Origin</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#202430] text-gray-400 font-medium pb-2">
                    <th className="pb-3 pl-2">Leakage Event Category</th>
                    <th className="pb-3 text-center">Open Cases</th>
                    <th className="pb-3 text-right">Amount at Risk</th>
                    <th className="pb-3 text-right pr-2">Total Leakage Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202430]">
                  {leakage.map((cat, idx) => (
                    <tr key={idx} className="hover:bg-[#1b1e28]/20 transition-colors">
                      <td className="py-3.5 pl-2 font-medium text-gray-200">
                        {cat.event_type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3.5 text-center text-gray-300 font-mono">
                        {cat.case_count}
                      </td>
                      <td className="py-3.5 text-right font-semibold text-gray-200 font-mono">
                        {formatCurrency(cat.amount_at_risk)}
                      </td>
                      <td className="py-3.5 text-right text-purple-400 font-semibold font-mono pr-2">
                        {cat.percentage_of_total.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1/3) - Priorities Queue preview */}
        <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 md:p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-gray-200">Urgent Case Priorities</h3>
              <span className="text-[9px] text-gray-500 font-mono uppercase tracking-wider font-semibold">Priority preview</span>
            </div>
            
            <div className="space-y-3">
              {priorities.slice(0, 5).map((item) => (
                <div
                  key={item.case_id}
                  onClick={() => onSelectCase(item.case_id)}
                  className="bg-[#1b1e28]/20 border border-[#202430] hover:border-purple-500/20 hover:bg-[#1b1e28]/40 transition rounded-lg p-3 flex items-center justify-between cursor-pointer group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-gray-400">#{item.case_id.substring(0, 8)}</span>
                      <RiskBadge level={item.risk_level} />
                    </div>
                    <div className="text-xs font-semibold text-gray-200 font-mono">{formatCurrency(item.amount_at_risk)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Priority</span>
                      <div className="text-xs font-bold text-purple-300 font-mono">{item.priority_score.toFixed(0)}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition" />
                  </div>
                </div>
              ))}
              {priorities.length === 0 && (
                <p className="text-xs text-gray-500 italic text-center py-12">No priority cases currently found.</p>
              )}
            </div>
          </div>
          
          {priorities.length > 5 && (
            <div className="border-t border-[#202430] pt-4 mt-4 text-center">
              <span className="text-[10px] text-purple-400 font-mono uppercase tracking-wider font-bold">
                + {priorities.length - 5} more cases in active queues
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
