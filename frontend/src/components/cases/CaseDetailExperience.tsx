import { useState } from 'react'
import {
  ArrowLeft,
  Clock,
  Check,
  XCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  ChevronRight
} from 'lucide-react'
import { RiskBadge, StatusBadge, LoadingState } from '../common/LoaderAndStates'

interface CaseDetailExperienceProps {
  caseId: string
  detailLoading: boolean
  selectedCaseDetail: any
  caseActions: any[]
  caseStatus: string | null
  caseLifecycle: any
  caseAttempts: any[]
  caseRecommendation: any
  caseStrategy?: any
  orchestrationState?: any
  auditHistory?: any[] // from RecoveryCaseDetailResponse
  detailError: string | null
  detailSuccess: string | null
  proposing: boolean
  proposedActionType: string
  setProposedActionType: (action: string) => void
  handleProposeAction: () => void
  executingActionId: string | null
  simulateFailure: boolean
  setSimulateFailure: (sim: boolean) => void
  handleExecuteAction: (actionId: string) => void
  onBack: () => void
}

export default function CaseDetailExperience({
  caseId,
  detailLoading,
  selectedCaseDetail,
  caseActions,
  caseStatus,
  caseLifecycle,
  caseAttempts,
  caseRecommendation,
  caseStrategy,
  orchestrationState,
  auditHistory = [],
  detailError,
  detailSuccess,
  proposing,
  proposedActionType,
  setProposedActionType,
  handleProposeAction,
  executingActionId,
  simulateFailure,
  setSimulateFailure,
  handleExecuteAction,
  onBack
}: CaseDetailExperienceProps) {
  const [confirmingAction, setConfirmingAction] = useState<any | null>(null)

  const formatCurrency = (val: string | number) => {
    return `₹${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (detailLoading || !selectedCaseDetail) {
    return (
      <div className="bg-[#13151c] border border-[#202430] rounded-xl p-8">
        <LoadingState message="Fetching case operational telemetry logs..." />
      </div>
    )
  }

  // Determine horizontal timeline stages progress
  const hasProposed = caseActions.length > 0
  const hasExecuted = caseAttempts.length > 0
  const isTerminal = caseStatus === 'RECOVERED' || caseStatus === 'STOPPED' || caseStatus === 'ESCALATED'

  const stages = [
    { label: 'Event Ingest', active: true },
    { label: 'Case Created', active: true },
    { label: 'Recommended', active: !!caseRecommendation || isTerminal },
    { label: 'Action Proposed', active: hasProposed || isTerminal },
    { label: 'Executed', active: hasExecuted || isTerminal },
    { label: 'Outcome Resolved', active: isTerminal }
  ]

  // F13 Orchestration Timeline
  const orchStages = [
    { label: 'PAYMENT FAILED', active: true },
    { label: 'RISK ASSESSED', active: !!selectedCaseDetail?.risk_level },
    { label: 'STRATEGY SELECTED', active: !!caseStrategy },
    { label: 'RETRY EXECUTED', active: hasExecuted },
    { label: 'COOLDOWN', active: orchestrationState?.cooldown_active },
    { label: 'RE-EVALUATED', active: orchestrationState?.attempt_number > 1 },
    { label: caseStatus === 'RECOVERED' ? 'RECOVERED' : caseStatus === 'STOPPED' ? 'STOPPED' : caseStatus === 'ESCALATED' ? 'ESCALATED' : 'RECOVERED / ESCALATED / STOPPED', active: isTerminal }
  ]

  return (
    <div className="space-y-6 text-left">
      
      {/* Header Back controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-purple-400 hover:text-purple-300 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Queues
        </button>
        <span className="text-[10px] text-gray-500 font-mono">Case Details Console</span>
      </div>

      {/* Horizontal Lifecycle Steps Timeline */}
      <div className="bg-[#13151c] border border-[#202430] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Flow Timeline</span>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 flex-1 justify-end">
          {orchStages.map((stg, index) => (
            <div key={stg.label} className="flex items-center gap-1.5">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                stg.active
                  ? 'bg-purple-950/40 text-purple-300 border border-purple-500/20'
                  : 'bg-[#1b1e28]/20 text-gray-500 border border-[#2e3445]'
              }`}>
                {stg.label}
              </span>
              {index < orchStages.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-gray-600 hidden md:inline" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Feedback banners */}
      {detailError && (
        <div className="bg-rose-950/20 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{detailError}</span>
        </div>
      )}

      {detailSuccess && (
        <div className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{detailSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column (2/3 width) - Situation, Outcome, Timelines */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Situation Section */}
          <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-[#202430] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">Situation</h3>
                <span className="text-[10px] text-gray-500 font-mono">Case Reference UUID: {caseId}</span>
              </div>
              <StatusBadge status={caseStatus || 'ACTIVE'} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#1b1e28]/30 border border-[#202430] rounded-lg p-3">
                <span className="text-[10px] text-gray-500 block uppercase font-medium">Risk Amount</span>
                <span className="text-sm font-bold text-gray-200 font-mono mt-1 block">
                  {formatCurrency(selectedCaseDetail.amount_at_risk)}
                </span>
              </div>
              <div className="bg-[#1b1e28]/30 border border-[#202430] rounded-lg p-3">
                <span className="text-[10px] text-gray-500 block uppercase font-medium">Risk Priority</span>
                <div className="mt-1">
                  <RiskBadge level={selectedCaseDetail.risk_level} />
                </div>
              </div>
              <div className="bg-[#1b1e28]/30 border border-[#202430] rounded-lg p-3">
                <span className="text-[10px] text-gray-500 block uppercase font-medium">Age Category</span>
                <span className="text-xs font-semibold text-gray-300 mt-1.5 block uppercase">
                  {selectedCaseDetail.time_sensitivity?.category || 'N/A'}
                </span>
              </div>
              <div className="bg-[#1b1e28]/30 border border-[#202430] rounded-lg p-3">
                <span className="text-[10px] text-gray-500 block uppercase font-medium">Merchant ID</span>
                <span className="text-[10px] font-mono text-gray-400 mt-1.5 block truncate">
                  {selectedCaseDetail.merchant_id || 'Acme Corp'}
                </span>
              </div>
            </div>
          </div>

          {/* Outcome Details Section */}
          {isTerminal && (
            <div className="bg-emerald-950/10 border border-emerald-500/20 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-400">Outcome Status</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">Final Outcome State</span>
                  <span className="text-sm font-bold text-gray-200 block mt-0.5">{caseStatus}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">Actual Recovered Revenue</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono block mt-0.5">
                    {formatCurrency(caseLifecycle ? caseLifecycle.actual_recovered_amount : '0.00')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">Timeline Recovery Event</span>
                  <span className="text-[10px] text-gray-400 font-mono block mt-1 truncate">
                    {caseLifecycle?.recovered_at ? new Date(caseLifecycle.recovered_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Strategy Optimization Panel (F11) */}
          {caseStrategy && (
            <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-[#202430] pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-200">Recovery Strategy Optimization (Advisory)</h3>
                  <span className="text-[10px] text-gray-500">Deterministic net recovery value algorithm</span>
                </div>
                <span className="text-[9px] font-bold text-purple-400 bg-purple-950/20 border border-purple-500/20 px-2 py-0.5 rounded uppercase">
                  F11 Optimizer
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-[#1b1e28]/30 border border-[#202430] rounded-lg p-3">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">Recommended Strategy</span>
                  <span className="text-xs font-bold text-purple-300 mt-1 block uppercase">
                    {caseStrategy.recommended_strategy.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="bg-[#1b1e28]/30 border border-[#202430] rounded-lg p-3">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">Probability</span>
                  <span className="text-xs font-bold text-gray-200 font-mono mt-1 block">
                    {caseStrategy.recovery_probability}%
                  </span>
                </div>
                <div className="bg-[#1b1e28]/30 border border-[#202430] rounded-lg p-3">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">Expected Recovery</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono mt-1 block">
                    {formatCurrency(caseStrategy.expected_recovery_amount)}
                  </span>
                </div>
                <div className="bg-[#1b1e28]/30 border border-[#202430] rounded-lg p-3">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">Expected Net Recovery</span>
                  <span className="text-xs font-bold text-purple-400 font-mono mt-1 block">
                    {formatCurrency(caseStrategy.expected_net_recovery)}
                  </span>
                </div>
                <div className="bg-[#1b1e28]/30 border border-[#202430] rounded-lg p-3">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">Confidence Score</span>
                  <span className="text-xs font-bold text-gray-200 font-mono mt-1 block">
                    {caseStrategy.confidence}%
                  </span>
                </div>
              </div>

              <div className="bg-purple-950/10 border border-purple-500/10 p-3 rounded-lg space-y-2">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Optimizer Rationale</span>
                <ul className="text-xs text-gray-300 list-disc list-inside space-y-1 pl-1">
                  {caseStrategy.reasons.map((r: string, idx: number) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>

              {/* Strategy Comparison Sub-section */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-gray-400 block uppercase tracking-wider">Candidate Strategies Comparison</span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#202430] text-gray-500 font-medium text-[10px]">
                        <th className="py-2 pl-2">Strategy Name</th>
                        <th className="py-2">Eligibility</th>
                        <th className="py-2 text-right">Probability</th>
                        <th className="py-2 text-right">Cost</th>
                        <th className="py-2 text-right">Net Recovery</th>
                        <th className="py-2 text-right pr-2">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#202430]/50 font-mono text-[11px]">
                      {caseStrategy.strategies.map((strat: any) => {
                        const isRec = strat.strategy_name === caseStrategy.recommended_strategy
                        return (
                          <tr key={strat.strategy_name} className={`hover:bg-[#1a1c24]/30 ${isRec ? 'bg-purple-950/10 border-l-2 border-purple-500' : ''}`}>
                            <td className="py-2 pl-2 font-semibold text-gray-300">
                              {strat.strategy_name.replace(/_/g, ' ')}
                              {isRec && <span className="text-[9px] text-purple-400 ml-1.5 font-bold uppercase">(Rec)</span>}
                              {!strat.executable && <span className="text-[8px] text-gray-500 ml-1.5 italic">(Advisory-only)</span>}
                            </td>
                            <td className="py-2">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                strat.guardrail_status === 'ALLOWED'
                                  ? 'text-emerald-400 bg-emerald-950/20 border-emerald-500/20'
                                  : 'text-rose-400 bg-rose-950/20 border-rose-500/20'
                              }`}>
                                {strat.guardrail_status}
                              </span>
                            </td>
                            <td className="py-2 text-right text-gray-200">{strat.recovery_probability}%</td>
                            <td className="py-2 text-right text-gray-400">{formatCurrency(strat.intervention_cost)}</td>
                            <td className="py-2 text-right text-emerald-400 font-bold">{formatCurrency(strat.expected_net_recovery)}</td>
                            <td className="py-2 text-right pr-2 text-gray-200">{strat.confidence}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[#1b1e28]/20 border border-[#2e3445]/40 text-gray-500 p-2.5 rounded-lg text-[10px] text-center font-semibold italic">
                Strategy optimization is advisory. No payment action is executed by the optimizer.
              </div>
            </div>
          )}

          {/* Attempt timeline history */}
          <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-200 mb-5">Execution Attempt Logs</h3>
            <div className="space-y-4">
              {caseAttempts.map((attempt, index) => {
                const isSuccess = attempt.status === 'EXECUTED'
                const isFailed = attempt.status === 'FAILED'
                const isBlocked = attempt.status === 'BLOCKED'

                let colorClass = 'text-gray-400 border-gray-600 bg-gray-950/20'
                let IconType = Clock
                if (isSuccess) {
                  colorClass = 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20'
                  IconType = Check
                } else if (isFailed) {
                  colorClass = 'text-rose-400 border-rose-500/30 bg-rose-950/30'
                  IconType = XCircle
                } else if (isBlocked) {
                  colorClass = 'text-yellow-400 border-yellow-500/20 bg-yellow-950/20'
                  IconType = AlertTriangle
                }

                return (
                  <div key={attempt.action_id} className="relative pl-7 pb-1">
                    {index < caseAttempts.length - 1 && (
                      <span className="absolute left-[9px] top-[18px] bottom-[-22px] w-0.5 bg-[#202430]"></span>
                    )}
                    <span className={`absolute left-0 top-[2px] w-5 h-5 rounded-full border flex items-center justify-center ${colorClass}`}>
                      <IconType className="w-3 h-3" />
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-200">
                          Attempt #{attempt.attempt_number}: {attempt.action_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {attempt.executed_timestamp ? new Date(attempt.executed_timestamp).toLocaleTimeString() : 'N/A'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {isSuccess && `Success — ${formatCurrency(attempt.amount_recovered)} recovered`}
                        {isFailed && `Failed — ₹0.00 recovered`}
                        {isBlocked && `Blocked by guardrails`}
                      </p>
                      {attempt.provider_transaction_id && (
                        <p className="text-[10px] text-emerald-500 font-mono font-semibold">
                          Txn Reference ID: {attempt.provider_transaction_id}
                        </p>
                      )}
                      {attempt.failure_reason && (
                        <p className="text-[10px] text-rose-400">
                          Reason: {attempt.failure_reason}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              {caseAttempts.length === 0 && (
                <p className="text-xs text-gray-500 italic text-center py-6">No retry attempts have been executed yet.</p>
              )}
            </div>
          </div>

          {/* Audit trail */}
          <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-[#202430] pb-3">
              <FileText className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-gray-200">Case Audit Trail</h3>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {auditHistory.map((log) => (
                <div key={log.id} className="bg-[#1b1e28]/20 border border-[#202430] rounded p-3 text-xs space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-gray-300 uppercase tracking-wider">{log.action}</span>
                    <span className="font-mono text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  {log.details && (
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                    </p>
                  )}
                  <div className="text-[9px] text-gray-500">Actor: {log.actor_type} ({log.actor_id || 'System'})</div>
                </div>
              ))}
              {auditHistory.length === 0 && (
                <p className="text-xs text-gray-500 italic text-center py-6">No audit trails recorded for this case.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width) - Intelligence, Recommendation, Actions */}
        <div className="space-y-6">
          
          {/* Intelligence Section */}
          <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-200 border-b border-[#202430] pb-2">Intelligence</h3>

            <div className="space-y-3 text-xs text-gray-400">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Priority Rank Score</span>
                  <span className="font-mono text-purple-300 font-bold">
                    {selectedCaseDetail.priority_score.toFixed(0)}/100
                  </span>
                </div>
                <div className="h-1.5 bg-[#202430] rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: `${selectedCaseDetail.priority_score}%` }}></div>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#202430]">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Explainability Factors</span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {selectedCaseDetail.reasons.map((r: any, idx: number) => (
                  <div key={idx} className="bg-[#1b1e28]/30 border border-[#202430] rounded p-2 text-[10px] leading-relaxed text-gray-300 flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5"></span>
                    <span>{r.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recovery Orchestration Section (F13) */}
          {orchestrationState && (
            <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-[#202430] pb-2">
                <span className="text-sm font-semibold text-gray-200">Recovery Orchestration</span>
                <span className="bg-purple-950/20 text-purple-400 font-bold border border-purple-500/20 px-2 py-0.5 rounded font-mono text-[9px] uppercase">
                  Adaptive Scheduler
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-[9px] text-gray-500 uppercase block font-semibold">Current State</span>
                  <span className={`text-sm font-bold block mt-0.5 ${isTerminal ? 'text-emerald-400' : orchestrationState.decision === 'WAIT_COOLDOWN' ? 'text-amber-400' : 'text-gray-200'}`}>
                    {isTerminal ? caseStatus : orchestrationState.decision.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 uppercase block font-semibold">Current Strategy</span>
                  <span className="text-sm font-bold text-purple-300 block mt-0.5">
                    {orchestrationState.selected_strategy.replace(/_/g, ' ')}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-gray-500 uppercase block font-semibold">Next Decision</span>
                  <span className="text-xs font-bold text-gray-300 block mt-0.5">
                    {orchestrationState.decision.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 uppercase block font-semibold">Attempt</span>
                  <span className="text-xs font-bold text-gray-300 block mt-0.5">
                    {orchestrationState.attempt_number}
                  </span>
                </div>

                <div className="col-span-2">
                  <span className="text-[9px] text-gray-500 uppercase block font-semibold">Cooldown</span>
                  <span className={`text-xs font-bold block mt-0.5 ${orchestrationState.cooldown_active ? 'text-amber-400' : 'text-gray-300'}`}>
                    {orchestrationState.cooldown_active ? 'Active' : 'Not Active'}
                  </span>
                </div>

                {orchestrationState.scheduled_time && (
                  <div className="col-span-2">
                    <span className="text-[9px] text-gray-500 uppercase block font-semibold">Next Evaluation / Retry Available In</span>
                    <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                      {new Date(orchestrationState.scheduled_time).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-[#1b1e28]/30 border border-[#202430] p-3 rounded-lg mt-2">
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider block mb-1">Reason</span>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  {orchestrationState.reason}
                </p>
                {isTerminal && (
                  <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                    Further recovery actions automatically stopped.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Recommendation Section */}
          {caseRecommendation && (
            <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 space-y-4 border-purple-500/20">
              <div className="flex justify-between items-center border-b border-[#202430] pb-2">
                <span className="text-xs font-semibold text-purple-300">Recommendation</span>
                <span className="bg-[#1b1e28] text-purple-300 font-bold border border-[#2e3445] px-2 py-0.5 rounded font-mono text-[9px]">
                  {caseRecommendation.confidence}% Confidence
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[9px] text-gray-500 uppercase block font-semibold">Recommended Action</span>
                  <span className="text-sm font-bold text-purple-300 block mt-0.5">
                    {caseRecommendation.recommended_action.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Guardrails Check</span>
                  <span className="text-xs font-bold text-gray-200 block">
                    {caseRecommendation.guardrail_status}
                  </span>
                </div>

                <div className="bg-purple-950/20 border border-purple-500/25 text-purple-300 p-2.5 rounded text-[10px] text-center font-semibold">
                  Recommendation only — no action has been executed.
                </div>
              </div>
            </div>
          )}

          {/* Actions / Execution Center Section */}
          <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-200 border-b border-[#202430] pb-2">Action / Execution Center</h3>
            
            {caseStatus !== 'RECOVERED' && caseStatus !== 'STOPPED' ? (
              <div className="space-y-4">
                
                {/* Proposal controls */}
                <div className="flex gap-2">
                  <select
                    value={proposedActionType}
                    onChange={(e) => setProposedActionType(e.target.value)}
                    className="bg-[#1b1e28] text-xs text-gray-300 rounded px-2 py-1.5 outline-none border border-[#2e3445] flex-1 cursor-pointer"
                    disabled={proposing}
                  >
                    <option value="RETRY_PAYMENT">RETRY_PAYMENT</option>
                    <option value="ESCALATE_TO_HUMAN">ESCALATE_TO_HUMAN</option>
                    <option value="STOP_RECOVERY">STOP_RECOVERY</option>
                  </select>
                  <button
                    onClick={handleProposeAction}
                    disabled={proposing}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/40 text-white text-xs px-4 py-1.5 rounded font-medium transition cursor-pointer"
                  >
                    {proposing ? 'Proposing...' : 'Propose'}
                  </button>
                </div>

                {/* Inline Confirmation Card */}
                {confirmingAction && (
                  <div className="bg-purple-950/20 border border-purple-500/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs uppercase tracking-wide">
                      <AlertTriangle className="w-4 h-4 text-purple-400" />
                      Verify Recovery Execution
                    </div>
                    <div className="text-[11px] text-gray-300 space-y-1.5 leading-relaxed">
                      <p>
                        Are you sure you want to execute <strong className="text-purple-300">{confirmingAction.action_type}</strong> for amount {formatCurrency(selectedCaseDetail.amount_at_risk)}?
                      </p>
                      <div className="bg-[#1b1e28]/40 border border-[#202430] p-2 rounded text-[10px] space-y-1 font-mono text-gray-400">
                        <div>Action: {confirmingAction.action_type}</div>
                        <div>Current Retries: {caseAttempts.length}</div>
                        <div>Guardrail: {confirmingAction.status}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setConfirmingAction(null)}
                        className="flex-1 bg-[#1b1e28] hover:bg-[#252a39] border border-[#2e3445] text-gray-300 text-xs py-1.5 rounded font-semibold transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          handleExecuteAction(confirmingAction.id)
                          setConfirmingAction(null)
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1.5 rounded font-bold transition cursor-pointer"
                      >
                        Confirm Action
                      </button>
                    </div>
                  </div>
                )}

                {/* Allowed actions queue */}
                <div className="space-y-2">
                  {caseActions.map((act) => {
                    const isAllowed = act.status === 'ALLOWED'
                    const isExecuting = executingActionId === act.id

                    let statusColor = 'text-gray-400 bg-gray-950/30 border-gray-500/20'
                    if (act.status === 'ALLOWED') statusColor = 'text-purple-400 bg-purple-950/20 border-purple-500/20'
                    if (act.status === 'BLOCKED') statusColor = 'text-rose-400 bg-rose-950/20 border-rose-500/20'
                    if (act.status === 'EXECUTED') statusColor = 'text-emerald-400 bg-emerald-950/20 border-emerald-500/20'
                    if (act.status === 'FAILED') statusColor = 'text-rose-500 bg-rose-950/30 border-rose-600/30'

                    return (
                      <div key={act.id} className="bg-[#1b1e28]/20 border border-[#202430] rounded p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-gray-200">
                            {act.action_type.replace(/_/g, ' ')} {act.action_type === 'RETRY_PAYMENT' ? `#${act.attempt_number}` : ''}
                          </span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${statusColor}`}>
                            {act.status}
                          </span>
                        </div>
                        {act.reason && (
                          <p className="text-[10px] text-gray-400 leading-normal">{act.reason}</p>
                        )}
                        
                        {isAllowed && !confirmingAction && (
                          <div className="pt-1.5 flex flex-col gap-1.5">
                            {act.action_type === 'RETRY_PAYMENT' && (
                              <label className="flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={simulateFailure}
                                  onChange={(e) => setSimulateFailure(e.target.checked)}
                                  className="accent-purple-500"
                                />
                                Simulate Failure
                              </label>
                            )}
                            <button
                              onClick={() => setConfirmingAction(act)}
                              disabled={isExecuting || executingActionId !== null}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/40 text-white text-xs py-1.5 rounded font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              Run Execution
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {caseActions.length === 0 && (
                    <p className="text-xs text-gray-500 italic py-2 text-center">No proposed actions. Choose an action type and propose it above.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#1b1e28]/10 border border-purple-500/10 text-purple-300 p-4 rounded text-xs text-center">
                This case has reached its resolved terminal state (<span className="font-bold">{caseStatus}</span>). Further recovery execution is locked.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
