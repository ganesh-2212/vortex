import { ShieldAlert, AlertTriangle, CheckCircle, Info } from 'lucide-react'

interface GuardrailsPageProps {
  merchantConfig: any
  auditLogs: any[]
  onSelectCase: (caseId: string) => void
}

export default function GuardrailsPage({
  merchantConfig,
  auditLogs,
  onSelectCase
}: GuardrailsPageProps) {
  // Safe extraction of config values
  const maxRetries = merchantConfig?.max_retry_attempts ?? 3
  const cooldownHours = merchantConfig?.retry_cooldown_hours ?? 24
  const recoveryEnabled = merchantConfig?.recovery_enabled ?? true

  // Extract blocked actions from audit logs
  const blockedLogs = auditLogs.filter(
    (log) => log.action === 'ACTION_BLOCKED' || log.action === 'PROPOSAL_BLOCKED'
  )

  return (
    <div className="space-y-8 text-left pb-12 w-full max-w-6xl mx-auto">
      
      {/* Authoritative Warning Notice */}
      <div className="bg-rose-50/50 border border-rose-200 text-rose-700 p-6 rounded-xl flex items-start gap-4 shadow-sm">
        <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" strokeWidth={2.5} />
        <div className="flex flex-col gap-1.5">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-rose-800">Deterministic Guardrails Control Area</h4>
          <p className="text-[13px] font-medium text-rose-900 leading-relaxed">
            Guardrails are authoritative and represent the final safety authority. Recommendations are advisory and <strong className="font-bold">cannot bypass</strong> these constraints.
            No execution bypass mechanisms exist.
          </p>
        </div>
      </div>

      {/* Guardrails Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Max Retries */}
        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-4 hover:border-slate-300 transition-colors">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Retry Limit Policy</span>
          <div className="flex justify-between items-baseline pt-4 border-t border-slate-100">
            <span className="text-[32px] font-bold text-slate-900 tabular-nums tracking-tight">{maxRetries}</span>
            <span className="text-[13px] text-slate-500 font-bold uppercase tracking-wider">Max Attempts</span>
          </div>
          <p className="text-[13px] text-slate-600 font-medium leading-relaxed">
            Payment retries are strictly blocked once the attempt count reaches this limit.
          </p>
        </div>

        {/* Cooldown Period */}
        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-4 hover:border-slate-300 transition-colors">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Cooldown Policy</span>
          <div className="flex justify-between items-baseline pt-4 border-t border-slate-100">
            <span className="text-[32px] font-bold text-slate-900 tabular-nums tracking-tight">{cooldownHours}h</span>
            <span className="text-[13px] text-slate-500 font-bold uppercase tracking-wider">Minimum Interval</span>
          </div>
          <p className="text-[13px] text-slate-600 font-medium leading-relaxed">
            Enforces a mandatory quiet period between attempts to prevent processor alerts.
          </p>
        </div>

        {/* Global Enforcement Status */}
        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-4 hover:border-slate-300 transition-colors">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Enforcement Status</span>
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            {recoveryEnabled ? (
              <>
                <CheckCircle className="w-6 h-6 text-emerald-600" strokeWidth={2.5} />
                <span className="text-[15px] font-bold text-emerald-700 tracking-tight">ACTIVE / ENFORCING</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-6 h-6 text-rose-600" strokeWidth={2.5} />
                <span className="text-[15px] font-bold text-rose-700 tracking-tight">DISABLED / BLOCKED</span>
              </>
            )}
          </div>
          <p className="text-[13px] text-slate-600 font-medium leading-relaxed">
            {recoveryEnabled 
              ? 'Guardrails are live and actively filtering recovery action proposals.' 
              : 'All merchant recovery processes are currently paused.'}
          </p>
        </div>
      </div>

      {/* Blocked Actions Log */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3 bg-white rounded-t-xl">
          <Info className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
          <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">Guardrail Enforcement Block Trace Logs</h3>
        </div>

        {blockedLogs.length === 0 ? (
          <div className="py-24 text-center text-slate-400 space-y-4 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 shadow-sm">
              <CheckCircle className="w-8 h-8 text-slate-400" strokeWidth={2} />
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-[17px] font-bold text-slate-600 tracking-tight">No Guardrail Block Traces</h4>
              <p className="text-[13px] font-medium max-w-sm mx-auto leading-relaxed">No recovery actions have been blocked by guardrail enforcement rules yet.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="py-4 pl-8 text-[11px] font-bold uppercase tracking-wider">Timestamp</th>
                  <th className="py-4 text-[11px] font-bold uppercase tracking-wider">Recovery Case ID</th>
                  <th className="py-4 text-[11px] font-bold uppercase tracking-wider">Action Blocked</th>
                  <th className="py-4 text-[11px] font-bold uppercase tracking-wider">Violation Reason</th>
                  <th className="py-4 pr-8 text-right text-[11px] font-bold uppercase tracking-wider">Trigger Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {blockedLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => log.recovery_case_id && onSelectCase(log.recovery_case_id)}
                    className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-5 pl-8 tabular-nums font-bold text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-5 tabular-nums font-bold text-purple-700 tracking-widest uppercase">
                      {log.recovery_case_id ? log.recovery_case_id.substring(0, 8) : 'N/A'}
                    </td>
                    <td className="py-5">
                      <span className="bg-rose-50 text-rose-700 font-bold border border-rose-200 px-3 py-1.5 rounded-md uppercase tracking-tight">
                        {log.details?.action_type?.replace(/_/g, ' ') || 'RECOVERY ACTION'}
                      </span>
                    </td>
                    <td className="py-5 text-rose-600 font-bold tracking-tight">
                      {log.details?.reason || 'Guardrail restriction violated'}
                    </td>
                    <td className="py-5 pr-8 text-right tabular-nums font-bold text-slate-500 uppercase tracking-widest">
                      {log.actor_type}
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
