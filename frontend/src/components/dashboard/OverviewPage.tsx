import React from 'react';
import { ChevronRight } from 'lucide-react';
import { RiskBadge, SectionHeader, DataTable, MoneyValue, MetricCard } from '../common/UI';

interface OverviewPageProps {
  summary: any;
  leakage: any[];
  priorities: any[];
  stats: any;
  onSelectCase: (caseId: string) => void;
}

export default function OverviewPage({
  summary,
  leakage,
  priorities,
  stats,
  onSelectCase
}: OverviewPageProps) {
  // Risk levels styling helper
  const riskLevels = [
    { key: 'CRITICAL', label: 'Critical Risk', val: summary?.critical_amount || '0.00', color: 'bg-danger' },
    { key: 'HIGH', label: 'High Risk', val: summary?.high_amount || '0.00', color: 'bg-warning' },
    { key: 'MEDIUM', label: 'Medium Risk', val: summary?.medium_amount || '0.00', color: 'bg-info' },
    { key: 'LOW', label: 'Low Risk', val: summary?.low_amount || '0.00', color: 'bg-success' }
  ];

  // Calculate total at risk to render the relative magnitude percentage bar
  const totalAtRisk = Number(summary?.revenue_at_risk || 0.0);

  const leakageColumns = [
    {
      header: 'Leakage Event Category',
      accessor: (row: any) => <span className="font-medium text-text-primary capitalize">{row.event_type.replace(/_/g, ' ')}</span>
    },
    {
      header: 'Open Cases',
      accessor: (row: any) => <span className="text-text-primary font-mono">{row.case_count}</span>,
      align: 'center' as const
    },
    {
      header: 'Amount at Risk',
      accessor: (row: any) => <span className="font-semibold text-text-primary font-mono"><MoneyValue amount={row.amount_at_risk} /></span>,
      align: 'right' as const
    },
    {
      header: 'Total Leakage Share',
      accessor: (row: any) => <span className="text-brand font-semibold font-mono">{row.percentage_of_total.toFixed(1)}%</span>,
      align: 'right' as const
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      
      {/* Metrics Groups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Section 1: Revenue Exposure */}
        <div className="space-y-4">
          <SectionHeader title="Revenue Exposure" />
          <div className="grid grid-cols-2 gap-4">
            <MetricCard 
              title="Revenue at Risk" 
              value={<MoneyValue amount={summary?.revenue_at_risk || '0'} />}
            />
            <MetricCard 
              title="Open Cases" 
              value={<span className="font-mono">{summary?.open_case_count || 0}</span>}
            />
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            Direct financial exposure tracked across active unresolved cases.
          </p>
        </div>

        {/* Section 2: Recovery Potential */}
        <div className="space-y-4">
          <SectionHeader title="Recovery Potential" />
          <div className="bg-brand/5 border border-brand/20 rounded-lg p-5 flex flex-col justify-center h-[104px]">
            <span className="text-[10px] text-brand font-bold uppercase tracking-wider mb-1">Estimated Recoverable</span>
            <span className="text-2xl font-bold text-brand font-mono">
              <MoneyValue amount={summary?.estimated_recoverable || '0'} />
            </span>
          </div>
          <p className="text-xs text-brand/80 font-medium leading-relaxed">
            Heuristic estimate — not money actually recovered.
          </p>
        </div>

        {/* Section 3: Confirmed Recovery */}
        <div className="space-y-4">
          <SectionHeader title="Confirmed Recovery" />
          <div className="grid grid-cols-2 gap-4">
            <MetricCard 
              title="Actual Recovered" 
              value={<span className="text-success"><MoneyValue amount={stats?.actual_recovered_revenue || '0'} /></span>}
            />
            <MetricCard 
              title="Recovery Rate" 
              value={<span className="text-success font-mono">{(stats?.recovery_rate || 0).toFixed(1)}%</span>}
            />
          </div>
          <p className="text-xs text-success/90 font-bold tracking-wide leading-relaxed">
            Confirmed revenue from successful recovery execution.
          </p>
        </div>
      </div>

      {/* Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Risk Distribution relative magnitude bar chart */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-5">Risk Distribution Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {riskLevels.map((lvl) => {
                const amount = Number(lvl.val);
                const percentage = totalAtRisk > 0 ? (amount / totalAtRisk) * 100 : 0;
                return (
                  <div key={lvl.key} className="bg-background border border-border rounded-lg p-4">
                    <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider font-mono">{lvl.label}</span>
                    <div className="text-base font-bold text-text-primary font-mono mt-1"><MoneyValue amount={lvl.val} /></div>
                    
                    {/* visual relative bar */}
                    <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden mt-4">
                      <div className={`h-full ${lvl.color}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                    <span className="text-[9px] text-text-secondary font-mono mt-1.5 block text-right">{percentage.toFixed(0)}% of risk share</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leakage Category analysis list */}
          <div className="space-y-4">
            <SectionHeader title="Leakage Analysis by Origin" />
            <DataTable 
              columns={leakageColumns}
              data={leakage}
              keyExtractor={(row) => row.event_type}
              emptyMessage="No leakage data available."
            />
          </div>
        </div>

        {/* Right Column (1/3) - Priorities Queue preview */}
        <div className="bg-surface border border-border rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-semibold text-text-primary">Urgent Case Priorities</h3>
              <span className="text-[9px] text-text-muted font-mono uppercase tracking-wider font-semibold">Priority preview</span>
            </div>
            
            <div className="space-y-3">
              {priorities.slice(0, 5).map((item) => (
                <div
                  key={item.case_id}
                  onClick={() => onSelectCase(item.case_id)}
                  className="bg-background border border-border hover:border-text-secondary hover:bg-surface-hover transition-colors rounded-lg p-3.5 flex items-center justify-between cursor-pointer group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono text-text-secondary">#{item.case_id.substring(0, 8)}</span>
                      <RiskBadge level={item.risk_level} />
                    </div>
                    <div className="text-sm font-semibold text-text-primary font-mono"><MoneyValue amount={item.amount_at_risk} /></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[9px] text-text-muted uppercase tracking-wider font-bold">Priority</span>
                      <div className="text-sm font-bold text-brand font-mono mt-0.5">{item.priority_score.toFixed(0)}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors" />
                  </div>
                </div>
              ))}
              {priorities.length === 0 && (
                <p className="text-sm text-text-muted text-center py-12">No priority cases currently found.</p>
              )}
            </div>
          </div>
          
          {priorities.length > 5 && (
            <div className="border-t border-border pt-4 mt-5 text-center">
              <span className="text-[10px] text-brand font-mono uppercase tracking-wider font-bold">
                + {priorities.length - 5} more cases in active queues
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
