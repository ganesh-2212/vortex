import { useState, useEffect } from 'react'
import {
  FileText,
  Search,
  Check,
  XCircle,
  AlertTriangle,
  Clock
} from 'lucide-react'
import { getDecisionExplanation } from '../../api'
import { LoadingState, ErrorState } from '../common/LoaderAndStates'
import { formatCurrency } from '../../utils/formatters'

interface DecisionExplanationPageProps {
  cases: any[]
}

export default function DecisionExplanationPage({ cases }: DecisionExplanationPageProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('')
  const [explanation, setExplanation] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedCaseId) {
      loadExplanation(selectedCaseId)
    } else {
      setExplanation(null)
    }
  }, [selectedCaseId])

  const loadExplanation = async (caseId: string) => {
    setLoading(true)
    setError(null)
    try {
      const expl = await getDecisionExplanation(caseId)
      setExplanation(expl)
    } catch (err: any) {
      setError(err.message || 'Failed to load explanation.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="space-y-8 text-left pb-12 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2 mb-8">
        <h2 className="text-[22px] font-bold text-slate-900 flex items-center gap-3 tracking-tight">
          <FileText className="w-6 h-6 text-purple-600" strokeWidth={2.5} />
          Decision Intelligence
        </h2>
        <p className="text-[15px] font-medium text-slate-500 leading-relaxed">
          Trace the exact chronological and deterministic reasoning behind system decisions.
        </p>
      </div>

      {/* Case Selector */}
      <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-6 max-w-3xl">
        <label className="text-[13px] font-bold text-slate-900 uppercase tracking-tight block">Select a case to inspect</label>
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2.5} />
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="w-full bg-slate-50 text-[15px] font-medium text-slate-900 border border-slate-200 rounded-lg pl-12 pr-5 py-3.5 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:bg-white appearance-none shadow-sm cursor-pointer transition-all"
          >
            <option value="">-- Choose a Recovery Case --</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id} className="tabular-nums text-[13px]">
                {c.id} (Risk: {c.risk_level}, Amount: {formatCurrency(c.amount_at_risk)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
          <LoadingState message="Reconstructing deterministic explanation evidence..." />
        </div>
      )}

      {error && !loading && (
        <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
          <ErrorState message={error} onRetry={() => loadExplanation(selectedCaseId)} />
        </div>
      )}

      {explanation && (
        <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
          
          {/* Main Explanations (2/3 width) */}
          <div className="space-y-8">
            
            <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-8">
              <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">Why FLOWMINT Made This Decision</h3>
              
              {/* Risk & Strategy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col hover:border-slate-300 transition-colors">
                  <span className="text-[11px] text-slate-400 block uppercase font-bold tracking-wider mb-2">Risk Assessed</span>
                  <span className="text-[17px] font-bold text-slate-900 block uppercase tracking-tight">{explanation.risk_level}</span>
                  <p className="text-[13px] text-slate-600 mt-3 leading-relaxed font-medium">{explanation.risk_reasons.join(', ')}</p>
                </div>
                <div className="bg-purple-50/50 border border-purple-200 p-6 rounded-xl shadow-sm flex flex-col hover:border-purple-300 transition-colors">
                  <span className="text-[11px] text-purple-700 block uppercase font-bold tracking-wider mb-2">Recommended Strategy</span>
                  <span className="text-[17px] font-bold text-purple-900 block uppercase tracking-tight">{explanation.strategy_selected.replace(/_/g, ' ')}</span>
                  <p className="text-[13px] text-purple-800 mt-3 leading-relaxed font-medium">{explanation.strategy_reason}</p>
                </div>
              </div>

              {/* Orchestration */}
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col hover:border-slate-300 transition-colors">
                <span className="text-[11px] text-slate-400 block uppercase font-bold tracking-wider mb-2">Orchestration Decision</span>
                <span className={`text-[17px] font-bold block uppercase tracking-tight ${explanation.orchestration_decision === 'WAIT_COOLDOWN' ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {explanation.orchestration_decision.replace(/_/g, ' ')}
                </span>
                <p className="text-[13px] text-slate-600 mt-3 leading-relaxed font-medium">{explanation.orchestration_reason}</p>
              </div>

              {/* Guardrails (F10) */}
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl space-y-6 shadow-sm">
                <span className="text-[11px] text-slate-400 block uppercase font-bold tracking-wider">Safety Checks (Guardrails)</span>
                
                {explanation.guardrail_checks.length > 0 ? (
                  <div className="space-y-4">
                    {explanation.guardrail_checks.map((g: any, i: number) => (
                      <div key={i} className="flex items-start gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
                        {g.status === 'ALLOWED' ? (
                          <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                        )}
                        <div className="flex flex-col gap-1">
                          <span className="text-[15px] font-bold text-slate-900 block tracking-tight">{g.guardrail}</span>
                          <span className="text-[13px] text-slate-500 block font-medium leading-relaxed">{g.explanation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-slate-400 italic font-medium">Evidence unavailable.</p>
                )}
              </div>
              
              {/* Historical Evidence */}
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col">
                <span className="text-[11px] text-slate-400 block uppercase font-bold tracking-wider mb-4">Historical Evidence (Strategy Performance)</span>
                {explanation.historical_evidence ? (
                  <p className="text-[13px] font-medium text-slate-600 leading-relaxed bg-white p-5 rounded-lg border border-slate-200 shadow-sm">{explanation.historical_evidence.explanation}</p>
                ) : (
                  <p className="text-[13px] text-slate-400 italic font-medium bg-white p-5 rounded-lg border border-slate-200 shadow-sm">Evidence unavailable.</p>
                )}
              </div>
              
            </div>
            
            {/* Strategy Alternatives (Why not X?) */}
            <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
              <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">Why Not Other Strategies?</h3>
              <div className="space-y-4 pt-6 border-t border-slate-100 mt-6">
                {explanation.alternative_strategies.filter((s: any) => s.strategy_name !== explanation.strategy_selected).map((alt: any) => (
                  <div key={alt.strategy_name} className="bg-slate-50 border border-slate-200 p-5 rounded-xl text-[13px] shadow-sm flex flex-col gap-2 hover:border-slate-300 transition-colors">
                    <span className="font-bold text-slate-900 block tracking-tight">Why not {alt.strategy_name.replace(/_/g, ' ')}?</span>
                    {alt.guardrail_status === 'BLOCKED' ? (
                      <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-md inline-block w-fit">Blocked by guardrails.</span>
                    ) : (
                      <span className="text-slate-600 font-medium">
                        Expected net recovery (<span className="tabular-nums font-bold text-slate-900">{formatCurrency(alt.expected_net_recovery)}</span>) was lower than the selected strategy.
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Sidebar (1/3 width) - Outcomes & Timeline */}
          <div className="space-y-8">
            
            {/* Expected vs Actual */}
            <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">Financial Outcome</h3>
              
              <div className="space-y-5 pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-bold text-slate-500 uppercase tracking-wider">Expected Recovery</span>
                  <span className="text-[15px] tabular-nums font-bold text-slate-900">{formatCurrency(explanation.expected_vs_actual.expected_recovery)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-bold text-slate-500 uppercase tracking-wider">Actual Recovery</span>
                  <span className="text-[15px] tabular-nums font-bold text-emerald-600">{formatCurrency(explanation.expected_vs_actual.actual_recovery)}</span>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[13px] font-bold text-slate-500 uppercase tracking-wider">Variance</span>
                  <span className={`text-[15px] tabular-nums font-bold tracking-tight ${explanation.expected_vs_actual.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {explanation.expected_vs_actual.variance >= 0 ? '+' : ''}{formatCurrency(explanation.expected_vs_actual.variance)}
                  </span>
                </div>
                <div className="text-center mt-6">
                  <span className="text-[11px] text-slate-700 uppercase font-bold px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 tracking-wider shadow-sm inline-block w-full">
                    Status: {explanation.expected_vs_actual.outcome_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Evidence Timeline */}
            <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">Chronological Evidence Timeline</h3>
              
              <div className="space-y-6 pt-6 border-t border-slate-100">
                {explanation.timeline.map((evt: any, idx: number) => {
                  let colorClass = 'text-slate-500 border-slate-300 bg-slate-50'
                  let IconType = Clock
                  
                  if (evt.status === 'COMPLETED' || evt.status === 'EXECUTED') {
                    colorClass = 'text-purple-700 border-purple-200 bg-purple-50'
                    IconType = Check
                  } else if (evt.status === 'FAILED') {
                    colorClass = 'text-rose-700 border-rose-200 bg-rose-50'
                    IconType = XCircle
                  } else if (evt.status === 'BLOCKED') {
                    colorClass = 'text-amber-700 border-amber-200 bg-amber-50'
                    IconType = AlertTriangle
                  }

                  return (
                    <div key={idx} className="relative pl-10 pb-4">
                      {idx < explanation.timeline.length - 1 && (
                        <span className="absolute left-[15px] top-[28px] bottom-[-24px] w-px bg-slate-200"></span>
                      )}
                      <span className={`absolute left-0 top-0 w-8 h-8 rounded-full border flex items-center justify-center shadow-sm ${colorClass}`}>
                        <IconType className="w-4 h-4" strokeWidth={2.5} />
                      </span>
                      <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 p-5 rounded-xl shadow-sm hover:border-slate-300 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <span className="text-[13px] font-bold text-slate-900 uppercase tracking-tight">{evt.title}</span>
                          <span className="text-[11px] text-slate-500 tabular-nums font-bold tracking-widest">
                            {new Date(evt.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-600 leading-relaxed font-medium">{evt.description}</p>
                        {evt.source_id && (
                          <p className="text-[11px] text-slate-400 tabular-nums font-medium mt-1">Source ID: {evt.source_id}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {!loading && !error && !explanation && (
        <div className="flex flex-col items-center justify-center py-32 text-center bg-slate-50 border border-slate-200 rounded-xl shadow-inner max-w-3xl">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-6 border border-slate-200 shadow-sm">
            <Search className="w-8 h-8 text-slate-400" strokeWidth={2} />
          </div>
          <h3 className="text-slate-900 font-bold text-[17px] tracking-tight">No Case Selected</h3>
          <p className="text-slate-500 text-[13px] font-medium mt-2 max-w-sm leading-relaxed">
            Select a case from the dropdown above to view its complete deterministic reasoning and evidence chain.
          </p>
        </div>
      )}

    </div>
  )
}
