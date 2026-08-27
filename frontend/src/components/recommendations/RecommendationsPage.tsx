import React from 'react';
import { RiskBadge, PageHeader, DataTable, Alert } from '../common/UI';

interface RecommendationsPageProps {
  recommendations: any[];
  onSelectCase: (caseId: string) => void;
}

export default function RecommendationsPage({
  recommendations,
  onSelectCase
}: RecommendationsPageProps) {
  const isBlocked = (status: string) => status === 'BLOCKED';

  const columns = [
    {
      header: 'Case ID',
      accessor: (row: any) => <span className="font-mono text-brand font-medium">{row.case_id.substring(0, 8)}...</span>
    },
    {
      header: 'Risk Level',
      accessor: (row: any) => <RiskBadge level={row.recommendation.risk_level} />
    },
    {
      header: 'Priority Score',
      accessor: (row: any) => <span className="font-bold text-text-primary font-mono">{row.recommendation.priority_score.toFixed(0)}</span>,
      align: 'center' as const
    },
    {
      header: 'Recommended Action',
      accessor: (row: any) => <span className="font-semibold text-text-primary capitalize">{row.recommendation.recommended_action.replace(/_/g, ' ')}</span>
    },
    {
      header: 'Confidence Rating',
      accessor: (row: any) => (
        <span className="bg-surface text-brand font-bold border border-border px-2.5 py-0.5 rounded font-mono">
          {row.recommendation.confidence}%
        </span>
      ),
      align: 'center' as const
    },
    {
      header: 'Guardrails Check',
      accessor: (row: any) => (
        <span className={`text-[10px] font-bold tracking-wide uppercase ${
          isBlocked(row.recommendation.guardrail_status) ? 'text-danger' : 'text-success'
        }`}>
          {row.recommendation.guardrail_status}
        </span>
      ),
      align: 'right' as const
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      
      <PageHeader 
        title="Recommendations Queue" 
        subtitle="AI-driven recovery action proposals awaiting manual review."
      />

      {/* Safety Notice block */}
      <Alert type="info" title="Advisory Decision Support Notice">
        Recommendations are advisory only. No recovery actions are executed automatically by the Revenue Sentinel engine.
        Action executions must be manually triggered through the Case detail diagnostics control console and pass F10 guardrails.
      </Alert>

      {/* Recommendations Queue table */}
      <div className="space-y-4">
        <DataTable 
          columns={columns}
          data={recommendations}
          keyExtractor={(row) => row.case_id}
          onRowClick={(row) => onSelectCase(row.case_id)}
          emptyMessage="No active recommendations. There are currently no active open cases requiring recovery recommendations."
        />
      </div>
    </div>
  );
}
