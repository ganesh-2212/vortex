import { AlertTriangle, AlertCircle } from 'lucide-react'
import { RiskBadge } from '../common/LoaderAndStates'

interface RecommendationsPageProps {
  recommendations: any[]
  onSelectCase: (caseId: string) => void
}

export default function RecommendationsPage({
  recommendations,
  onSelectCase
}: RecommendationsPageProps) {
  const isBlocked = (status: string) => status === 'BLOCKED'

  return (
    <div className="space-y-6 text-left">
      
      {/* Safety Notice block */}
      <div className="bg-purple-950/20 border border-purple-500/20 text-purple-300 p-4 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider font-mono">Advisory Decision Support Notice</h4>
          <p className="text-xs text-purple-300/80 mt-1 leading-relaxed">
            Recommendations are advisory only. No recovery actions are executed automatically by the Revenue Sentinel engine.
            Action executions must be manually triggered through the Case detail diagnostics control console and pass F06 guardrails.
          </p>
        </div>
      </div>

      {/* Recommendations Queue table */}
      <div className="bg-[#13151c] border border-[#202430] rounded-xl overflow-hidden">
        {recommendations.length === 0 ? (
          <div className="py-20 text-center text-gray-500 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-gray-600" />
            <h4 className="text-sm font-semibold text-gray-400">No Active Recommendations</h4>
            <p className="text-xs max-w-xs mx-auto">There are currently no active open cases requiring recovery recommendations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#202430] text-gray-400 font-medium">
                  <th className="py-3.5 pl-4">Case ID</th>
                  <th className="py-3.5">Risk Level</th>
                  <th className="py-3.5 text-center">Priority Score</th>
                  <th className="py-3.5">Recommended Action</th>
                  <th className="py-3.5 text-center">Confidence Rating</th>
                  <th className="py-3.5 pr-4 text-right">Guardrails Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202430]">
                {recommendations.map((item) => (
                  <tr
                    key={item.case_id}
                    onClick={() => onSelectCase(item.case_id)}
                    className="hover:bg-[#1a1c24]/50 cursor-pointer transition duration-150"
                  >
                    <td className="py-3.5 pl-4 font-mono text-purple-300 font-medium">
                      {item.case_id.substring(0, 8)}...
                    </td>
                    <td className="py-3.5">
                      <RiskBadge level={item.recommendation.risk_level} />
                    </td>
                    <td className="py-3.5 text-center font-bold text-gray-300 font-mono">
                      {item.recommendation.priority_score.toFixed(0)}
                    </td>
                    <td className="py-3.5 font-semibold text-gray-200">
                      {item.recommendation.recommended_action.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 text-center">
                      <span className="bg-[#1b1e28] text-purple-300 font-bold border border-[#2e3445] px-2.5 py-0.5 rounded font-mono">
                        {item.recommendation.confidence}%
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <span className={`text-[10px] font-bold tracking-wide uppercase ${
                        isBlocked(item.recommendation.guardrail_status) ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {item.recommendation.guardrail_status}
                      </span>
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
