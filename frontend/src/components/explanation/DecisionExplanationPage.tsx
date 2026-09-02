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
        <h2 className="text-[22px] font-bold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight transition-colors">
          <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" strokeWidth={2.5} />
          Decision Intelligence
        </h2>
        <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed transition-colors">
          Trace the exact chronological and deterministic reasoning behind system decisions.
        </p>
      </div>

      {/* Case Selector */}
      <div className="bg-white dark:bg-brand-surface-dark rounded-xl p-8 border border-slate-200 dark:border-brand-border-dark shadow-sm space-y-6 max-w-3xl transition-colors duration-200">
        <label className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-tight block">Select a case to inspect</label>
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2.5} />
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-brand-card-dark text-[15px] font-medium text-slate-900 dark:text-white border border-slate-200 dark:border-brand-border-dark rounded-lg pl-12 pr-5 py-3.5 outline-none focus:border-purple-500 dark:focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500 dark:focus:ring-purple-500/50 appearance-none shadow-sm cursor-pointer transition-all"
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
        <div className="bg-white dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-dark rounded-lg p-8 shadow-sm transition-colors">
          <LoadingState message="Reconstructing deterministic explanation evidence..." />
        </div>
      )}

      {error && !loading && (
        <div className="bg-white dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-dark rounded-lg p-8 shadow-sm transition-colors">
          <ErrorState message={error} onRetry={() => loadExplanation(selectedCaseId)} />
        </div>
      )}

      {explanation && (
        <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
          
          {/* Main Explanations (2/3 width) */}
          <div className="space-y-8">
            
            <div className="space-y-8">
              
              {/* AI Diagnosis (F19) */}
              <div className="bg-white dark:bg-brand-surface-dark rounded-xl p-8 border border-purple-200 dark:border-brand-ai/30 shadow-[0_4px_20px_-4px_rgba(147,51,234,0.1)] dark:shadow-[0_4px_20px_-4px_rgba(147,51,234,0.15)] relative overflow-hidden transition-colors duration-200">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-brand-ai/5 dark:to-transparent pointer-events-none" />
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[17px] font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                      <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse" />
                      AI DIAGNOSIS
                    </h3>
                    {explanation.analysis_source === 'gemini' ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50">Powered by Gemini</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Deterministic Fallback</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider">Root Cause</span>
                      <span className="text-[15px] font-bold text-slate-900 dark:text-white block tracking-tight">{explanation.diagnosis?.root_cause_category || explanation.risk_reasons?.[0] || 'UNKNOWN'}</span>
                      <p className="text-[13px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed mt-1">
                        {explanation.diagnosis?.root_cause || 'Analyzed via standard deterministic rules.'}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider">Confidence</span>
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex-1">
                          <div 
                            className={`h-full rounded-full ${explanation.diagnosis?.confidence >= 80 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : explanation.diagnosis?.confidence >= 60 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} 
                            style={{ width: `${explanation.diagnosis?.confidence || 100}%` }}
                          />
                        </div>
                        <span className="text-[15px] tabular-nums font-bold text-slate-900 dark:text-white shrink-0">{explanation.diagnosis?.confidence || 100}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-4 border-t border-purple-100 dark:border-purple-900/30">
                     <span className="text-[11px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider">Evidence</span>
                     {explanation.diagnosis?.evidence && explanation.diagnosis.evidence.length > 0 ? (
                       <ul className="space-y-1.5">
                         {explanation.diagnosis.evidence.map((ev: string, idx: number) => (
                           <li key={idx} className="text-[13px] text-slate-600 dark:text-slate-300 font-medium flex gap-2">
                             <span className="text-purple-500">•</span>
                             {ev}
                           </li>
                         ))}
                       </ul>
                     ) : (
                       <p className="text-[13px] text-slate-500 italic">No structured evidence provided.</p>
                     )}
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-brand-card-dark border border-purple-200 dark:border-purple-500/30 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-purple-700 dark:text-purple-400 block uppercase font-bold tracking-wider mb-0.5">Suggested Strategy</span>
                      <span className="text-[15px] font-bold text-purple-900 dark:text-purple-300 block tracking-tight">{(explanation.diagnosis?.recommended_action || explanation.strategy_selected).replace(/_/g, ' ')}</span>
                    </div>
                    <span className="text-[11px] font-bold text-purple-600/60 dark:text-purple-400/80 uppercase tracking-widest text-right">AI<br/>Output</span>
                  </div>
                </div>
              </div>
              
              {/* Policy & Safety */}
              <div className="bg-white dark:bg-brand-surface-dark rounded-xl p-8 border border-slate-200 dark:border-brand-border-dark shadow-sm space-y-8 transition-colors duration-200">
                <h3 className="text-[17px] font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                  <span className="w-1.5 h-4 rounded-full bg-slate-300 dark:bg-slate-600" />
                  POLICY & SAFETY
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100 dark:border-brand-border-dark">
                <div className="bg-slate-50 dark:bg-brand-card-dark border border-slate-200 dark:border-brand-border-dark p-6 rounded-xl shadow-sm flex flex-col hover:border-slate-300 dark:hover:border-slate-500 transition-colors duration-200">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider mb-2">Risk Assessed</span>
                  <span className="text-[17px] font-bold text-slate-900 dark:text-white block uppercase tracking-tight">{explanation.risk_level}</span>
                  <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-3 leading-relaxed font-medium">{explanation.risk_reasons.join(', ')}</p>
                </div>
                <div className="bg-purple-50/50 dark:bg-brand-card-dark border border-purple-200 dark:border-brand-border-dark p-6 rounded-xl shadow-sm flex flex-col hover:border-purple-300 dark:hover:border-slate-500 transition-colors duration-200">
                  <span className="text-[11px] text-purple-700 dark:text-purple-400 block uppercase font-bold tracking-wider mb-2">Recommended Strategy</span>
                  <span className="text-[17px] font-bold text-purple-900 dark:text-purple-400 block uppercase tracking-tight">{explanation.strategy_selected.replace(/_/g, ' ')}</span>
                  <p className="text-[13px] text-purple-800 dark:text-slate-300 mt-3 leading-relaxed font-medium">{explanation.strategy_reason}</p>
                </div>
              </div>
              </div>

              {/* Orchestration */}
              <div className="bg-slate-50 dark:bg-brand-card-dark border border-slate-200 dark:border-brand-border-dark p-6 rounded-xl shadow-sm flex flex-col hover:border-slate-300 dark:hover:border-slate-500 transition-colors duration-200">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider mb-2">Orchestration Decision</span>
                <span className={`text-[17px] font-bold block uppercase tracking-tight ${explanation.orchestration_decision === 'WAIT_COOLDOWN' ? 'text-amber-700 dark:text-amber-500' : 'text-emerald-700 dark:text-emerald-500'}`}>
                  {explanation.orchestration_decision.replace(/_/g, ' ')}
                </span>
                <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-3 leading-relaxed font-medium">{explanation.orchestration_reason}</p>
              </div>

              {/* Guardrails (F10) */}
              <div className="bg-slate-50 dark:bg-brand-card-dark border border-slate-200 dark:border-brand-border-dark p-6 rounded-xl space-y-6 shadow-sm transition-colors duration-200">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider">Safety Checks (Guardrails)</span>
                
                {explanation.guardrail_checks.length > 0 ? (
                  <div className="space-y-4">
                    {explanation.guardrail_checks.map((g: any, i: number) => (
                      <div key={i} className="flex items-start gap-4 bg-white dark:bg-brand-surface-dark p-5 rounded-lg border border-slate-200 dark:border-brand-border-dark shadow-sm hover:border-slate-300 dark:hover:border-slate-500 transition-colors duration-200">
                        {g.status === 'ALLOWED' ? (
                          <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                        )}
                        <div className="flex flex-col gap-1">
                          <span className="text-[15px] font-bold text-slate-900 dark:text-white block tracking-tight">{g.guardrail}</span>
                          <span className="text-[13px] text-slate-500 dark:text-slate-400 block font-medium leading-relaxed">{g.explanation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-slate-400 dark:text-slate-500 italic font-medium">Evidence unavailable.</p>
                )}
              </div>
              
              {/* Historical Evidence */}
              <div className="bg-slate-50 dark:bg-brand-card-dark border border-slate-200 dark:border-brand-border-dark p-6 rounded-xl shadow-sm flex flex-col transition-colors duration-200">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider mb-4">Historical Evidence (Strategy Performance)</span>
                {explanation.historical_evidence ? (
                  <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-brand-surface-dark p-5 rounded-lg border border-slate-200 dark:border-brand-border-dark shadow-sm transition-colors">{explanation.historical_evidence.explanation}</p>
                ) : (
                  <p className="text-[13px] text-slate-400 dark:text-slate-500 italic font-medium bg-white dark:bg-brand-surface-dark p-5 rounded-lg border border-slate-200 dark:border-brand-border-dark shadow-sm transition-colors">Evidence unavailable.</p>
                )}
              </div>
              
            </div>
            
            {/* Strategy Alternatives (Why not X?) */}
            <div className="bg-white dark:bg-brand-surface-dark rounded-xl p-8 border border-slate-200 dark:border-brand-border-dark shadow-sm transition-colors duration-200">
              <h3 className="text-[17px] font-bold text-slate-900 dark:text-white tracking-tight">Why Not Other Strategies?</h3>
              <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-brand-border-dark mt-6">
                {explanation.alternative_strategies.filter((s: any) => s.strategy_name !== explanation.strategy_selected).map((alt: any) => (
                  <div key={alt.strategy_name} className="bg-slate-50 dark:bg-brand-card-dark border border-slate-200 dark:border-brand-border-dark p-5 rounded-xl text-[13px] shadow-sm flex flex-col gap-2 hover:border-slate-300 dark:hover:border-slate-500 transition-colors duration-200">
                    <span className="font-bold text-slate-900 dark:text-white block tracking-tight">Why not {alt.strategy_name.replace(/_/g, ' ')}?</span>
                    {alt.guardrail_status === 'BLOCKED' ? (
                      <span className="text-rose-700 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 px-3 py-1.5 rounded-md inline-block w-fit">Blocked by guardrails.</span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        Expected net recovery (<span className="tabular-nums font-bold text-slate-900 dark:text-white">{formatCurrency(alt.expected_net_recovery)}</span>) was lower than the selected strategy.
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
            <div className="bg-white dark:bg-brand-surface-dark rounded-xl p-8 border border-slate-200 dark:border-brand-border-dark shadow-sm space-y-6 transition-colors duration-200">
              <h3 className="text-[17px] font-bold text-slate-900 dark:text-white tracking-tight">Financial Outcome</h3>
              
              <div className="space-y-5 pt-6 border-t border-slate-100 dark:border-brand-border-dark">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expected Recovery</span>
                  <span className="text-[15px] tabular-nums font-bold text-slate-900 dark:text-white">{formatCurrency(explanation.expected_vs_actual.expected_recovery)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actual Recovery</span>
                  <span className="text-[15px] tabular-nums font-bold text-emerald-600 dark:text-emerald-500">{formatCurrency(explanation.expected_vs_actual.actual_recovery)}</span>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-brand-border-dark flex justify-between items-center">
                  <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Variance</span>
                  <span className={`text-[15px] tabular-nums font-bold tracking-tight ${explanation.expected_vs_actual.variance >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                    {explanation.expected_vs_actual.variance >= 0 ? '+' : ''}{formatCurrency(explanation.expected_vs_actual.variance)}
                  </span>
                </div>
                <div className="text-center mt-6">
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 uppercase font-bold px-4 py-2 bg-slate-50 dark:bg-brand-card-dark rounded-lg border border-slate-200 dark:border-brand-border-dark tracking-wider shadow-sm inline-block w-full transition-colors">
                    Status: {explanation.expected_vs_actual.outcome_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Evidence Timeline */}
            <div className="bg-white dark:bg-brand-surface-dark rounded-xl p-8 border border-slate-200 dark:border-brand-border-dark shadow-sm space-y-6 transition-colors duration-200">
              <h3 className="text-[17px] font-bold text-slate-900 dark:text-white tracking-tight">Chronological Evidence Timeline</h3>
              
              <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-brand-border-dark">
                {explanation.timeline.map((evt: any, idx: number) => {
                  let colorClass = 'text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-brand-card-dark'
                  let IconType = Clock
                  
                  if (evt.status === 'COMPLETED' || evt.status === 'EXECUTED') {
                    colorClass = 'text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-900/10'
                    IconType = Check
                  } else if (evt.status === 'FAILED') {
                    colorClass = 'text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/30 bg-rose-50 dark:bg-rose-900/10'
                    IconType = XCircle
                  } else if (evt.status === 'BLOCKED') {
                    colorClass = 'text-amber-700 dark:text-amber-500 border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-900/10'
                    IconType = AlertTriangle
                  }

                  return (
                    <div key={idx} className="relative pl-10 pb-4">
                      {idx < explanation.timeline.length - 1 && (
                        <span className="absolute left-[15px] top-[28px] bottom-[-24px] w-px bg-slate-200 dark:bg-brand-border-dark"></span>
                      )}
                      <span className={`absolute left-0 top-0 w-8 h-8 rounded-full border flex items-center justify-center shadow-sm transition-colors ${colorClass}`}>
                        <IconType className="w-4 h-4" strokeWidth={2.5} />
                      </span>
                      <div className="flex flex-col gap-2 bg-slate-50 dark:bg-brand-card-dark border border-slate-200 dark:border-brand-border-dark p-5 rounded-xl shadow-sm hover:border-slate-300 dark:hover:border-slate-500 transition-colors duration-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 dark:border-brand-border-dark pb-3">
                          <span className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">{evt.title}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums font-bold tracking-widest">
                            {new Date(evt.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{evt.description}</p>
                        {evt.source_id && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums font-medium mt-1">Source ID: {evt.source_id}</p>
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
        <div className="flex flex-col items-center justify-center py-32 text-center bg-slate-50 dark:bg-brand-surface-dark/50 border border-slate-200 dark:border-brand-border-dark rounded-xl shadow-inner max-w-3xl transition-colors duration-200">
          <div className="w-16 h-16 rounded-full bg-white dark:bg-brand-card-dark flex items-center justify-center mb-6 border border-slate-200 dark:border-brand-border-dark shadow-sm">
            <Search className="w-8 h-8 text-slate-400 dark:text-slate-500" strokeWidth={2} />
          </div>
          <h3 className="text-slate-900 dark:text-white font-bold text-[17px] tracking-tight">No Case Selected</h3>
          <p className="text-slate-500 dark:text-slate-400 text-[13px] font-medium mt-2 max-w-sm leading-relaxed">
            Select a case from the dropdown above to view its complete deterministic reasoning and evidence chain.
          </p>
        </div>
      )}

    </div>
  )
}
