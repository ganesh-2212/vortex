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

  const formatCurrency = (val: string | number) => {
    return `₹${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            Decision Intelligence (F15)
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Trace the exact chronological and deterministic reasoning behind system decisions.
          </p>
        </div>
      </div>

      {/* Case Selector */}
      <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6">
        <label className="text-xs font-semibold text-gray-300 block mb-2">Select a case to inspect</label>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="w-full bg-[#1b1e28] text-sm text-gray-200 border border-[#202430] rounded-lg pl-9 pr-4 py-2.5 outline-none focus:border-purple-500/50 appearance-none"
          >
            <option value="">-- Choose a Recovery Case --</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} (Risk: {c.risk_level}, Amount: {formatCurrency(c.amount_at_risk)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="bg-[#13151c] border border-[#202430] rounded-xl p-8">
          <LoadingState message="Reconstructing deterministic explanation evidence..." />
        </div>
      )}

      {error && !loading && (
        <div className="bg-[#13151c] border border-[#202430] rounded-xl p-8">
          <ErrorState message={error} onRetry={() => loadExplanation(selectedCaseId)} />
        </div>
      )}

      {!loading && !error && explanation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Explanations (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-gray-200 border-b border-[#202430] pb-2">Why Revenue Sentinel Made This Decision</h3>
              
              {/* Risk & Strategy */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1b1e28]/30 border border-[#202430] p-3 rounded-lg">
                  <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider mb-1">Risk Assessed</span>
                  <span className="text-sm font-bold text-gray-200 block uppercase">{explanation.risk_level}</span>
                  <p className="text-[11px] text-gray-400 mt-1">{explanation.risk_reasons.join(', ')}</p>
                </div>
                <div className="bg-[#1b1e28]/30 border border-[#202430] p-3 rounded-lg">
                  <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider mb-1">Recommended Strategy</span>
                  <span className="text-sm font-bold text-purple-300 block uppercase">{explanation.strategy_selected.replace(/_/g, ' ')}</span>
                  <p className="text-[11px] text-gray-400 mt-1">{explanation.strategy_reason}</p>
                </div>
              </div>

              {/* Orchestration */}
              <div className="bg-[#1b1e28]/30 border border-[#202430] p-3 rounded-lg">
                <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider mb-1">Orchestration Decision</span>
                <span className={`text-sm font-bold block uppercase ${explanation.orchestration_decision === 'WAIT_COOLDOWN' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {explanation.orchestration_decision.replace(/_/g, ' ')}
                </span>
                <p className="text-[11px] text-gray-400 mt-1">{explanation.orchestration_reason}</p>
              </div>

              {/* Guardrails (F10) */}
              <div className="bg-[#1b1e28]/30 border border-[#202430] p-4 rounded-lg space-y-3">
                <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">Safety Checks (F10 Guardrails)</span>
                
                {explanation.guardrail_checks.length > 0 ? (
                  <div className="space-y-2">
                    {explanation.guardrail_checks.map((g: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 bg-[#13151c] p-2 rounded border border-[#202430]">
                        {g.status === 'ALLOWED' ? (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <div>
                          <span className="text-[11px] font-semibold text-gray-200 block">{g.guardrail}</span>
                          <span className="text-[10px] text-gray-400">{g.explanation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">Evidence unavailable.</p>
                )}
              </div>
              
              {/* Historical Evidence */}
              <div className="bg-[#1b1e28]/30 border border-[#202430] p-3 rounded-lg">
                <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider mb-1">Historical Evidence (F14)</span>
                {explanation.historical_evidence ? (
                  <p className="text-[11px] text-gray-400">{explanation.historical_evidence.explanation}</p>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">Evidence unavailable.</p>
                )}
              </div>
              
            </div>
            
            {/* Strategy Alternatives (Why not X?) */}
            <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-200 border-b border-[#202430] pb-2 mb-4">Why Not Other Strategies?</h3>
              <div className="space-y-3">
                {explanation.alternative_strategies.filter((s: any) => s.strategy_name !== explanation.strategy_selected).map((alt: any) => (
                  <div key={alt.strategy_name} className="bg-[#1b1e28]/20 border border-[#202430] p-3 rounded-lg text-xs">
                    <span className="font-semibold text-gray-300 block mb-1">Why not {alt.strategy_name.replace(/_/g, ' ')}?</span>
                    {alt.guardrail_status === 'BLOCKED' ? (
                      <span className="text-rose-400">Blocked by guardrails.</span>
                    ) : (
                      <span className="text-gray-400">
                        Expected net recovery ({formatCurrency(alt.expected_net_recovery)}) was lower than the selected strategy.
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Sidebar (1/3 width) - Outcomes & Timeline */}
          <div className="space-y-6">
            
            {/* Expected vs Actual */}
            <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-200 border-b border-[#202430] pb-2">Financial Outcome</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Expected Recovery</span>
                  <span className="text-xs font-mono text-gray-200">{formatCurrency(explanation.expected_vs_actual.expected_recovery)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Actual Recovery</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{formatCurrency(explanation.expected_vs_actual.actual_recovery)}</span>
                </div>
                <div className="pt-2 border-t border-[#202430] flex justify-between items-center">
                  <span className="text-xs text-gray-400">Variance</span>
                  <span className={`text-xs font-mono font-bold ${explanation.expected_vs_actual.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {explanation.expected_vs_actual.variance >= 0 ? '+' : ''}{formatCurrency(explanation.expected_vs_actual.variance)}
                  </span>
                </div>
                <div className="text-center mt-2">
                  <span className="text-[10px] text-gray-500 uppercase font-bold px-2 py-1 bg-[#1b1e28] rounded border border-[#2e3445]">
                    Status: {explanation.expected_vs_actual.outcome_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Evidence Timeline */}
            <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-200 border-b border-[#202430] pb-2 mb-4">Chronological Evidence Timeline</h3>
              
              <div className="space-y-4">
                {explanation.timeline.map((evt: any, idx: number) => {
                  let colorClass = 'text-gray-400 border-gray-600 bg-gray-950/20'
                  let IconType = Clock
                  
                  if (evt.status === 'COMPLETED' || evt.status === 'EXECUTED') {
                    colorClass = 'text-purple-400 border-purple-500/30 bg-purple-950/20'
                    IconType = Check
                  } else if (evt.status === 'FAILED') {
                    colorClass = 'text-rose-400 border-rose-500/30 bg-rose-950/30'
                    IconType = XCircle
                  } else if (evt.status === 'BLOCKED') {
                    colorClass = 'text-amber-400 border-amber-500/30 bg-amber-950/20'
                    IconType = AlertTriangle
                  }

                  return (
                    <div key={idx} className="relative pl-7 pb-1">
                      {idx < explanation.timeline.length - 1 && (
                        <span className="absolute left-[9px] top-[18px] bottom-[-22px] w-0.5 bg-[#202430]"></span>
                      )}
                      <span className={`absolute left-0 top-[2px] w-5 h-5 rounded-full border flex items-center justify-center ${colorClass}`}>
                        <IconType className="w-3 h-3" />
                      </span>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-200">{evt.title}</span>
                          <span className="text-[9px] text-gray-500 font-mono">
                            {new Date(evt.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400">{evt.description}</p>
                        {evt.source_id && (
                          <p className="text-[8px] text-gray-500 font-mono">Source ID: {evt.source_id}</p>
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
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-[#1b1e28] flex items-center justify-center mb-4 border border-[#2e3445]">
            <Search className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-gray-300 font-medium text-lg">No Case Selected</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-sm">
            Select a case from the dropdown above to view its complete deterministic reasoning and evidence chain.
          </p>
        </div>
      )}

    </div>
  )
}
