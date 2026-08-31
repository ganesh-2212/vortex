import { AlertTriangle, AlertCircle } from 'lucide-react'
import { RiskBadge } from '../common/LoaderAndStates'
import {formatNumber} from '../../utils/formatters';

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
    <div className="space-y-8 text-left pb-12 w-full max-w-5xl mx-auto">
      
      {/* Safety Notice block */}
      <div className="bg-purple-50/50 border border-purple-200 text-purple-700 p-6 rounded-xl flex items-start gap-4 shadow-sm">
        <AlertTriangle className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" strokeWidth={2.5} />
        <div className="flex flex-col gap-1.5">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-purple-800">Advisory Decision Support Notice</h4>
          <p className="text-[13px] font-medium text-purple-900 leading-relaxed">
            Recommendations are advisory only. No recovery actions are executed automatically by the FLOWMINT engine.
            Action executions must be manually triggered through the Case detail diagnostics control console and pass F06 guardrails.
          </p>
        </div>
      </div>

      {/* Recommendations Queue table */}
      <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">Active Recommendations</h3>

        {recommendations.length === 0 ? (
          <div className="py-24 text-center text-slate-400 space-y-4 pt-6 border-t border-slate-100 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 shadow-sm">
              <AlertCircle className="w-8 h-8 text-slate-400" strokeWidth={2} />
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-[17px] font-bold text-slate-600 tracking-tight">No Active Recommendations</h4>
              <p className="text-[13px] font-medium max-w-sm mx-auto leading-relaxed">There are currently no active open cases requiring recovery recommendations.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pt-6 border-t border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="py-4 pl-4 text-[11px] font-bold uppercase tracking-wider">Case ID</th>
                  <th className="py-4 text-[11px] font-bold uppercase tracking-wider">Risk Level</th>
                  <th className="py-4 text-center text-[11px] font-bold uppercase tracking-wider">Priority Score</th>
                  <th className="py-4 text-[11px] font-bold uppercase tracking-wider">Recommended Action</th>
                  <th className="py-4 text-center text-[11px] font-bold uppercase tracking-wider">Confidence Rating</th>
                  <th className="py-4 pr-4 text-right text-[11px] font-bold uppercase tracking-wider">Guardrails Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {recommendations.map((item) => (
                  <tr
                    key={item.case_id}
                    onClick={() => onSelectCase(item.case_id)}
                    className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-5 pl-4 tabular-nums text-purple-700 font-bold uppercase tracking-widest">
                      {item.case_id.substring(0, 8)}
                    </td>
                    <td className="py-5">
                      <RiskBadge level={item.recommendation.risk_level} />
                    </td>
                    <td className="py-5 text-center font-bold text-slate-900 tabular-nums text-[15px]">
                      {formatNumber(item.recommendation.priority_score)}
                    </td>
                    <td className="py-5 font-bold text-slate-900 uppercase tracking-tight">
                      {item.recommendation.recommended_action.replace(/_/g, ' ')}
                    </td>
                    <td className="py-5 text-center">
                      <span className="bg-purple-50 text-purple-700 font-bold border border-purple-200 px-3 py-1.5 rounded tabular-nums shadow-sm">
                        {item.recommendation.confidence}%
                      </span>
                    </td>
                    <td className="py-5 pr-4 text-right">
                      <span className={`text-[11px] font-bold tracking-widest uppercase px-2 py-1 rounded bg-slate-50 border border-slate-200 ${
                        isBlocked(item.recommendation.guardrail_status) ? 'text-rose-600' : 'text-emerald-600'
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
