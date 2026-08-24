import {
  ArrowLeft,
  Clock,
  Check,
  XCircle,
  AlertTriangle,
  FileText
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
  auditHistory?: any[] // from RecoveryCaseDetailResponse
  detailError: string | null
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
  auditHistory = [],
  detailError,
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column (2/3 width) - Detail & timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Summary Card */}
          <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-[#202430] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">Investigation Details</h3>
                <span className="text-[10px] text-gray-500 font-mono">ID: {caseId}</span>
              </div>
              <StatusBadge status={caseStatus || 'ACTIVE'} />
            </div>

            {detailError && (
              <div className="bg-rose-950/20 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs">
                {detailError}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#1b1e28]/30 border border-[#202430] rounded-lg p-3">
                <span className="text-[10px] text-gray-500 block uppercase font-medium">Risk Exposure</span>
                <span className="text-sm font-bold text-gray-200 font-mono mt-1 block">
                  {formatCurrency(selectedCaseDetail.amount_at_risk)}
                </span>
              </div>
              <div className="bg-[#1b1e28]/30 border border-[#202430] rounded-lg p-3">
                <span className="text-[10px] text-gray-500 block uppercase font-medium">Risk Level</span>
                <div className="mt-1">
                  <RiskBadge level={selectedCaseDetail.risk_level} />
                </div>
              </div>
              <div className="bg-[#1b1e28]/30 border border-[#202430] rounded-lg p-3 border-emerald-500/10">
                <span className="text-[10px] text-emerald-400 block font-semibold uppercase">Actual Recovered</span>
                <span className="text-sm font-bold text-emerald-400 font-mono mt-1 block">
                  {formatCurrency(caseLifecycle ? caseLifecycle.actual_recovered_amount : '0.00')}
                </span>
              </div>
              <div className="bg-[#1b1e28]/30 border border-[#202430] rounded-lg p-3">
                <span className="text-[10px] text-gray-500 block uppercase font-medium">Age Status</span>
                <span className="text-xs font-semibold text-gray-300 mt-1.5 block uppercase">
                  {selectedCaseDetail.time_sensitivity?.category || 'N/A'}
                </span>
              </div>
            </div>

            {/* Metrics note */}
            <div className="bg-[#0d0e12] border border-[#202430] rounded-lg p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-semibold text-emerald-400">Actual Recovered:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {formatCurrency(caseLifecycle ? caseLifecycle.actual_recovered_amount : '0.00')}
                </span>
              </div>
              <p className="text-[9px] text-gray-500">
                Confirmed revenue recovered through successful retry action executions.
              </p>
              <div className="h-px bg-[#202430] my-1.5"></div>
              <div className="flex justify-between">
                <span className="font-semibold text-purple-400">Heuristic Estimated Recoverable:</span>
                <span className="font-mono text-purple-400 font-bold">
                  {formatCurrency(selectedCaseDetail.estimated_recoverable)}
                </span>
              </div>
              <p className="text-[9px] text-gray-500">
                *Heuristic Estimate Notice: Calculated based on risk severity, failure history, and time categories. Not actual money recovered.
              </p>
            </div>
          </div>

          {/* Timeline of Attempts */}
          <div className="bg-[#13151c] border border-[#202430] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-200 mb-5">Execution Attempt Timeline</h3>
            <div className="space-y-4">
              {caseAttempts.map((attempt, index) => {
                const isSuccess = attempt.status === 'EXECUTED'
                const isFailed = attempt.status === 'FAILED'
                const isBlocked = attempt.status === 'BLOCKED'

                let colorClass = 'text-gray-400 border-gray-600 bg-gray-950/20'
                let Icon = Clock
                if (isSuccess) {
                  colorClass = 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20'
                  Icon = Check
                } else if (isFailed) {
                  colorClass = 'text-rose-400 border-rose-500/30 bg-rose-950/30'
                  Icon = XCircle
                } else if (isBlocked) {
                  colorClass = 'text-yellow-400 border-yellow-500/20 bg-yellow-950/20'
                  Icon = AlertTriangle
                }

                return (
                  <div key={attempt.action_id} className="relative pl-7 pb-1">
                    {/* timeline vertical line */}
                    {index < caseAttempts.length - 1 && (
                      <span className="absolute left-[9px] top-[18px] bottom-[-22px] w-0.5 bg-[#202430]"></span>
                    )}
                    <span className={`absolute left-0 top-[2px] w-5 h-5 rounded-full border flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-3 h-3" />
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
                          Txn ID: {attempt.provider_transaction_id}
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

          {/* Audit Logs associated with this case (F07 audit logs) */}
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

        {/* Right Column (1/3 width) - Risk Explainers, Recommendations, Actions */}
        <div className="space-y-6">
          
          {/* Priority Drivers */}
          <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-200 border-b border-[#202430] pb-2">Priority Drivers</h3>
            <div className="space-y-3 text-xs text-gray-400">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Risk Severity Score (35%)</span>
                  <span className="font-mono text-gray-300">{selectedCaseDetail.priority_breakdown.risk_severity_score.toFixed(0)}</span>
                </div>
                <div className="h-1 bg-[#202430] rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: `${selectedCaseDetail.priority_breakdown.risk_severity_score}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span>Amount Score (30%)</span>
                  <span className="font-mono text-gray-300">{selectedCaseDetail.priority_breakdown.amount_score.toFixed(0)}</span>
                </div>
                <div className="h-1 bg-[#202430] rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: `${selectedCaseDetail.priority_breakdown.amount_score}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Age/Time Sensitivity (15%)</span>
                  <span className="font-mono text-gray-300">{selectedCaseDetail.priority_breakdown.age_score.toFixed(0)}</span>
                </div>
                <div className="h-1 bg-[#202430] rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: `${selectedCaseDetail.priority_breakdown.age_score}%` }}></div>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#202430]">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Explainability Reasons</span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {selectedCaseDetail.reasons.map((r: any, idx: number) => (
                  <div key={idx} className="bg-[#1b1e28]/30 border border-[#202430] rounded p-2 text-[10px] leading-relaxed text-gray-300 flex items-start gap-1.5">
                    <span className={`w-1 h-1 rounded-full shrink-0 mt-1.5 ${
                      r.type === 'risk' ? 'bg-rose-400' : r.type === 'priority' ? 'bg-purple-400' : 'bg-blue-400'
                    }`}></span>
                    <span>{r.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendation Support Card */}
          {caseRecommendation && (
            <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 space-y-4 border-purple-500/20">
              <div className="flex justify-between items-center border-b border-[#202430] pb-2">
                <span className="text-xs font-semibold text-purple-300">Automated Recommendation</span>
                <span className="bg-[#1b1e28] text-purple-300 font-bold border border-[#2e3445] px-2 py-0.5 rounded font-mono text-[9px]">
                  {caseRecommendation.confidence}% Confidence
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[9px] text-gray-500 uppercase block">Recommended Path</span>
                  <span className="text-sm font-bold text-gray-200 block mt-0.5">
                    {caseRecommendation.recommended_action.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="h-1.5 bg-[#202430] rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: `${caseRecommendation.confidence}%` }}></div>
                </div>

                {/* Reasons */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Explainability Factors</span>
                  <div className="space-y-1">
                    {caseRecommendation.reasons.map((r: any, idx: number) => (
                      <div key={idx} className="text-[10px] text-gray-400 leading-normal flex items-start gap-1.5">
                        <span className={`w-1 h-1 rounded-full shrink-0 mt-1.5 ${
                          r.impact === 'positive' ? 'bg-emerald-400' : r.impact === 'negative' ? 'bg-rose-400' : 'bg-gray-400'
                        }`}></span>
                        <span>{r.message}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-purple-950/20 border border-purple-500/20 text-purple-300 p-2.5 rounded text-[9px] text-center uppercase tracking-wider font-semibold">
                  Recommendation only — no action has been executed.
                </div>
              </div>
            </div>
          )}

          {/* Action Execution controls */}
          <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-200 border-b border-[#202430] pb-2">Execution Center</h3>
            
            {caseStatus !== 'RECOVERED' && caseStatus !== 'STOPPED' ? (
              <div className="space-y-4">
                
                {/* Propose controls */}
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

                {/* Actions listing with execution run buttons */}
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
                        
                        {isAllowed && (
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
                              onClick={() => handleExecuteAction(act.id)}
                              disabled={isExecuting || executingActionId !== null}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/40 text-white text-xs py-1.5 rounded font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              {isExecuting ? 'Executing...' : 'Run Execution'}
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
