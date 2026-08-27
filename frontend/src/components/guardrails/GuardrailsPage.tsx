import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { PageHeader, SectionHeader, DataTable, Alert } from '../common/UI';

interface GuardrailsPageProps {
  merchantConfig: any;
  auditLogs: any[];
  onSelectCase: (caseId: string) => void;
}

export default function GuardrailsPage({
  merchantConfig,
  auditLogs,
  onSelectCase
}: GuardrailsPageProps) {
  // Safe extraction of config values
  const maxRetries = merchantConfig?.max_retry_attempts ?? 3;
  const cooldownHours = merchantConfig?.retry_cooldown_hours ?? 24;
  const recoveryEnabled = merchantConfig?.recovery_enabled ?? true;

  // Extract blocked actions from audit logs
  const blockedLogs = auditLogs.filter(
    (log) => log.action === 'ACTION_BLOCKED' || log.action === 'PROPOSAL_BLOCKED'
  );

  const columns = [
    {
      header: 'Timestamp',
      accessor: (row: any) => <span className="font-mono text-xs text-text-secondary">{new Date(row.created_at).toLocaleString()}</span>
    },
    {
      header: 'Recovery Case ID',
      accessor: (row: any) => <span className="font-mono text-xs text-text-primary">{row.recovery_case_id ? `${row.recovery_case_id.substring(0, 8)}...` : 'N/A'}</span>
    },
    {
      header: 'Action Blocked',
      accessor: (row: any) => (
        <span className="bg-danger/10 text-danger border border-danger/30 font-semibold px-2 py-0.5 rounded uppercase text-[10px] tracking-wider">
          {row.details?.action_type?.replace(/_/g, ' ') || 'RECOVERY ACTION'}
        </span>
      )
    },
    {
      header: 'Violation Reason',
      accessor: (row: any) => <span className="text-danger font-medium text-sm">{row.details?.reason || 'Guardrail restriction violated'}</span>
    },
    {
      header: 'Trigger Source',
      accessor: (row: any) => <span className="font-mono text-xs text-text-secondary">{row.actor_type}</span>,
      align: 'right' as const
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Guardrails & Safety Rules" 
        subtitle="Manage and review the deterministic safety constraints that prevent unauthorized recovery actions."
      />
      
      {/* Authoritative Warning Notice */}
      <Alert type="error" title="Deterministic Guardrails Control Area">
        Guardrails are authoritative and represent the final safety authority. Recommendations are advisory and <strong>cannot bypass</strong> these constraints.
        No execution bypass mechanisms exist.
      </Alert>

      {/* Guardrails Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Max Retries */}
        <div className="bg-surface border border-border rounded-lg p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Retry Limit Policy</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-semibold text-text-primary font-mono">{maxRetries}</span>
              <span className="text-sm text-text-secondary font-medium">Max Attempts</span>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-4 leading-relaxed">
            Payment retries are strictly blocked once the attempt count reaches this limit.
          </p>
        </div>

        {/* Cooldown Period */}
        <div className="bg-surface border border-border rounded-lg p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Cooldown Policy</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-semibold text-text-primary font-mono">{cooldownHours}h</span>
              <span className="text-sm text-text-secondary font-medium">Minimum Interval</span>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-4 leading-relaxed">
            Enforces a mandatory quiet period between attempts to prevent processor alerts.
          </p>
        </div>

        {/* Global Enforcement Status */}
        <div className="bg-surface border border-border rounded-lg p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Enforcement Status</span>
            <div className="flex items-center gap-2 mt-3 mb-1">
              {recoveryEnabled ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <span className="text-base font-semibold text-success tracking-wide">ACTIVE / ENFORCING</span>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-danger" />
                  </div>
                  <span className="text-base font-semibold text-danger tracking-wide">DISABLED / BLOCKED</span>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-text-muted mt-4 leading-relaxed">
            {recoveryEnabled 
              ? 'Guardrails are live and actively filtering recovery action proposals.' 
              : 'All merchant recovery processes are currently paused.'}
          </p>
        </div>
      </div>

      {/* Blocked Actions Log */}
      <div className="space-y-4">
        <SectionHeader title="Guardrail Enforcement Block Trace Logs" />
        <DataTable 
          columns={columns}
          data={blockedLogs}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => row.recovery_case_id && onSelectCase(row.recovery_case_id)}
          emptyMessage="No recovery actions have been blocked by guardrail enforcement rules yet."
        />
      </div>
    </div>
  );
}
