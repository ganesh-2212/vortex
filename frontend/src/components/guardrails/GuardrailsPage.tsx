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
    <div className="space-y-6 text-left">
      
      {/* Authoritative Warning Notice */}
      <div className="bg-rose-950/20 border border-rose-500/20 text-rose-300 p-4 rounded-xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider font-mono text-rose-400">Deterministic Guardrails Control Area</h4>
          <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
            Guardrails are authoritative and represent the final safety authority. Recommendations are advisory and <strong>cannot bypass</strong> these constraints.
            No execution bypass mechanisms exist.
          </p>
        </div>
      </div>

      {/* Guardrails Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Max Retries */}
        <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 space-y-2">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Retry Limit Policy</span>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold text-gray-100 font-mono">{maxRetries}</span>
            <span className="text-xs text-gray-400">Max Attempts</span>
          </div>
          <p className="text-[10px] text-gray-500">
            Payment retries are strictly blocked once the attempt count reaches this limit.
          </p>
        </div>

        {/* Cooldown Period */}
        <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 space-y-2">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Cooldown Policy</span>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold text-gray-100 font-mono">{cooldownHours}h</span>
            <span className="text-xs text-gray-400">Minimum Interval</span>
          </div>
          <p className="text-[10px] text-gray-500">
            Enforces a mandatory quiet period between attempts to prevent processor alerts.
          </p>
        </div>

        {/* Global Enforcement Status */}
        <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 space-y-2">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Enforcement Status</span>
          <div className="flex items-center gap-2 mt-1">
            {recoveryEnabled ? (
              <>
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400 font-mono">ACTIVE / ENFORCING</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span className="text-sm font-semibold text-rose-400 font-mono">DISABLED / BLOCKED</span>
              </>
            )}
          </div>
          <p className="text-[10px] text-gray-500">
            {recoveryEnabled 
              ? 'Guardrails are live and actively filtering recovery action proposals.' 
              : 'All merchant recovery processes are currently paused.'}
          </p>
        </div>
      </div>

      {/* Blocked Actions Log */}
      <div className="bg-[#13151c] border border-[#202430] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#202430] flex items-center gap-2 bg-[#171922]">
          <Info className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-200">Guardrail Enforcement Block Trace Logs</h3>
        </div>

        {blockedLogs.length === 0 ? (
          <div className="py-20 text-center text-gray-500 space-y-2">
            <CheckCircle className="w-8 h-8 mx-auto text-gray-600" />
            <h4 className="text-sm font-semibold text-gray-400">No Guardrail Block Traces</h4>
            <p className="text-xs max-w-xs mx-auto">No recovery actions have been blocked by guardrail enforcement rules yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#202430] text-gray-400 font-medium">
                  <th className="py-3 pl-4">Timestamp</th>
                  <th className="py-3">Recovery Case ID</th>
                  <th className="py-3">Action Blocked</th>
                  <th className="py-3">Violation Reason</th>
                  <th className="py-3 pr-4 text-right">Trigger Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202430]">
                {blockedLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => log.recovery_case_id && onSelectCase(log.recovery_case_id)}
                    className="hover:bg-[#1a1c24]/50 cursor-pointer transition duration-150"
                  >
                    <td className="py-3 pl-4 font-mono text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 font-mono text-purple-300">
                      {log.recovery_case_id ? `${log.recovery_case_id.substring(0, 8)}...` : 'N/A'}
                    </td>
                    <td className="py-3">
                      <span className="bg-rose-950/20 text-rose-400 font-bold border border-rose-500/20 px-2 py-0.5 rounded uppercase text-[10px]">
                        {log.details?.action_type?.replace(/_/g, ' ') || 'RECOVERY ACTION'}
                      </span>
                    </td>
                    <td className="py-3 text-rose-300 font-medium">
                      {log.details?.reason || 'Guardrail restriction violated'}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-gray-500">
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
