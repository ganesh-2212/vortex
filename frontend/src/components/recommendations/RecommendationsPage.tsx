import { AlertTriangle } from 'lucide-react'
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
      <div className="bg-purple-50/50 dark:bg-brand-ai/10 border border-purple-200 dark:border-brand-ai/20 text-purple-700 dark:text-brand-text-primary p-6 rounded-xl flex items-start gap-4 shadow-sm transition-colors duration-200">
        <AlertTriangle className="w-6 h-6 text-purple-600 dark:text-brand-ai shrink-0 mt-0.5" strokeWidth={2.5} />
        <div className="flex flex-col gap-1.5">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-purple-800 dark:text-brand-text-primary">Advisory Decision Support Notice</h4>
          <p className="text-[13px] font-medium text-purple-900 dark:text-brand-text-secondary leading-relaxed">
            Recommendations are advisory only. No recovery actions are executed automatically by the VORTEX engine.
            Action executions must be manually triggered through the Case detail diagnostics control console and pass F06 guardrails.
          </p>
        </div>
      </div>

      {/* Recommendations Queue table */}
      <div className="bg-white dark:bg-brand-surface-dark rounded-xl p-8 border border-slate-200 dark:border-brand-border-dark shadow-sm space-y-6 transition-colors duration-200">
        <h3 className="text-[17px] font-bold text-slate-900 dark:text-brand-text-primary tracking-tight">Active Recommendations</h3>

        {recommendations.length === 0 ? (
          <div className="py-24 pt-6 border-t border-slate-100 dark:border-brand-border-dark">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-subtle flex items-center justify-center mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-brand-success"></span>
              </div>
              <span className="text-[15px] font-bold text-slate-900 dark:text-brand-text-primary tracking-tight">No Active Recommendations</span>
              <span className="text-[13px] text-slate-500 dark:text-brand-text-muted mt-1">There are currently no open cases requiring recommendations.</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pt-6 border-t border-slate-100 dark:border-brand-border-dark">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-brand-border-dark text-slate-400 dark:text-brand-text-muted">
                  <th className="py-4 pl-4 text-[11px] font-bold uppercase tracking-wider">Case ID</th>
                  <th className="py-4 text-[11px] font-bold uppercase tracking-wider">Risk Level</th>
                  <th className="py-4 text-center text-[11px] font-bold uppercase tracking-wider">Priority Score</th>
                  <th className="py-4 text-[11px] font-bold uppercase tracking-wider">Recommended Action</th>
                  <th className="py-4 text-center text-[11px] font-bold uppercase tracking-wider">Confidence Rating</th>
                  <th className="py-4 pr-4 text-right text-[11px] font-bold uppercase tracking-wider">Guardrails Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-brand-border-dark text-[13px]">
                {recommendations.map((item) => (
                  <tr
                    key={item.case_id}
                    onClick={() => onSelectCase(item.case_id)}
                    className="hover:bg-slate-50/50 dark:hover:bg-brand-card-dark cursor-pointer transition-colors group"
                  >
                    <td className="py-5 pl-4 tabular-nums text-purple-700 dark:text-brand-text-primary font-bold uppercase tracking-widest group-hover:text-purple-800">
                      {item.case_id.substring(0, 8)}
                    </td>
                    <td className="py-5">
                      <RiskBadge level={item.recommendation.risk_level} />
                    </td>
                    <td className="py-5 text-center font-bold text-slate-900 dark:text-brand-text-primary tabular-nums text-[15px]">
                      {formatNumber(item.recommendation.priority_score)}
                    </td>
                    <td className="py-5 font-bold text-slate-900 dark:text-brand-text-primary uppercase tracking-tight">
                      {item.recommendation.recommended_action.replace(/_/g, ' ')}
                    </td>
                    <td className="py-5 text-center">
                      <span className="bg-purple-50 dark:bg-brand-ai/10 text-purple-700 dark:text-brand-ai font-bold border border-purple-200 dark:border-brand-ai/30 px-3 py-1.5 rounded tabular-nums shadow-sm transition-colors duration-200">
                        {item.recommendation.confidence}%
                      </span>
                    </td>
                    <td className="py-5 pr-4 text-right">
                      <span className={`text-[11px] font-bold tracking-widest uppercase px-2 py-1 rounded bg-slate-50 dark:bg-brand-card-dark border border-slate-200 dark:border-brand-border-dark ${
                        isBlocked(item.recommendation.guardrail_status) ? 'text-rose-600 dark:text-brand-danger' : 'text-emerald-600 dark:text-brand-success'
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
