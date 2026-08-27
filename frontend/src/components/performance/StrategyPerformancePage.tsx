import React from 'react';
import { ArrowUpRight, TrendingUp, AlertTriangle, ShieldCheck, Activity, Target } from 'lucide-react';
import { PageHeader, SectionHeader, MetricCard, DataTable, MoneyValue, Alert } from '../common/UI';

interface StrategyOutcomeStatistics {
  strategy_type: string;
  total_attempts: number;
  successful_attempts: number;
  failed_attempts: number;
  success_rate: number;
  total_recovered: number;
  average_recovered: number;
  total_cost: number;
  net_recovery: number;
  average_attempts_to_recovery: number;
  expected_recovery: number;
  actual_recovery: number;
  recovery_variance: number;
}

interface StrategyPerformanceResponse {
  generated_at: string;
  total_cases_analyzed: number;
  total_revenue_at_risk: number;
  total_revenue_recovered: number;
  overall_recovery_rate: number;
  strategy_statistics: StrategyOutcomeStatistics[];
  best_strategy: string;
  strongest_strategy_by_revenue: string;
  strongest_strategy_by_success_rate: string;
}

interface EventStrategyPerformance {
  event_type: string;
  total_cases: number;
  best_strategy: string;
  best_strategy_success_rate: number;
  best_strategy_net_recovery: number;
  strategy_breakdown: StrategyOutcomeStatistics[];
}

interface Props {
  performance: StrategyPerformanceResponse | null;
  eventPerformance: EventStrategyPerformance[];
}

export default function StrategyPerformancePage({ performance, eventPerformance }: Props) {
  if (!performance) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <Activity className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">No historical performance data available.</p>
      </div>
    );
  }

  const columns = [
    {
      header: 'Strategy',
      accessor: (row: any) => {
        const isBest = row.strategy_type === performance.best_strategy;
        const isLowSample = row.total_attempts < 5;
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-primary capitalize">{row.strategy_type.replace(/_/g, ' ')}</span>
            {isBest && <span className="text-[9px] text-brand font-bold uppercase bg-brand/10 border border-brand/20 px-1.5 py-0.5 rounded tracking-wider">Best Overall</span>}
            {isLowSample && <span className="text-[9px] text-warning font-bold uppercase bg-warning/10 border border-warning/20 px-1.5 py-0.5 rounded flex items-center gap-1 tracking-wider"><AlertTriangle className="w-2.5 h-2.5"/> Low Data</span>}
          </div>
        );
      }
    },
    {
      header: 'Attempts',
      accessor: (row: any) => <span className="text-text-primary font-mono">{row.total_attempts}</span>,
      align: 'right' as const
    },
    {
      header: 'Success Rate',
      accessor: (row: any) => <span className="text-text-primary font-mono">{row.success_rate}%</span>,
      align: 'right' as const
    },
    {
      header: 'Recovered',
      accessor: (row: any) => <span className="text-success font-mono"><MoneyValue amount={row.total_recovered} /></span>,
      align: 'right' as const
    },
    {
      header: 'Cost',
      accessor: (row: any) => <span className="text-text-secondary font-mono"><MoneyValue amount={row.total_cost} /></span>,
      align: 'right' as const
    },
    {
      header: 'Net Recovery',
      accessor: (row: any) => <span className="text-success font-mono font-bold"><MoneyValue amount={row.net_recovery} /></span>,
      align: 'right' as const
    }
  ];

  return (
    <div className="space-y-6 pb-10">
      
      <PageHeader 
        title="Strategy performance" 
        subtitle="F14 · Historical evidence and outcome intelligence based on actual execution data."
      />

      <Alert type="info">
        Historical strategy performance is advisory evidence. Deterministic guardrails and merchant policies remain authoritative.
      </Alert>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard 
          title="Total At Risk" 
          value={<MoneyValue amount={performance.total_revenue_at_risk} />} 
        />
        <MetricCard 
          title="Total Recovered" 
          value={<span className="text-success"><MoneyValue amount={performance.total_revenue_recovered} /></span>} 
        />
        <MetricCard 
          title="Recovery Rate" 
          value={<span className="text-brand font-mono">{performance.overall_recovery_rate}%</span>} 
        />
        <MetricCard 
          title="Cases Analyzed" 
          value={<span className="font-mono">{performance.total_cases_analyzed}</span>} 
        />
        <div className="flex flex-col justify-center px-4 py-1">
          <span className="text-[10px] text-text-muted uppercase tracking-widest flex items-center gap-1.5 mb-1.5 font-semibold">
            <Target className="w-3.5 h-3.5" /> Overall best strategy
          </span>
          <span className="text-base lg:text-lg font-bold text-text-primary uppercase">{performance.best_strategy.replace(/_/g, ' ')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Strategy Comparison Table */}
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader title="Strategy Comparison" />
          <DataTable 
            columns={columns}
            data={performance.strategy_statistics}
            keyExtractor={(row) => row.strategy_type}
          />
        </div>

        {/* Expected vs Actual Variance */}
        <div className="bg-surface border border-border rounded-lg p-6 flex flex-col h-full">
          <h3 className="text-sm font-semibold text-text-primary mb-4 border-b border-border pb-2">Expected vs Actual Recovery</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar flex-1">
            {performance.strategy_statistics.map(strat => {
              const variancePos = strat.recovery_variance >= 0;
              return (
                <div key={strat.strategy_type} className="bg-background border border-border p-3 rounded-md flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-text-primary uppercase block tracking-wider">{strat.strategy_type.replace(/_/g, ' ')}</span>
                    <span className="text-[9px] text-text-secondary font-mono mt-1 block">Exp: <MoneyValue amount={strat.expected_recovery} /> | Act: <MoneyValue amount={strat.actual_recovery} /></span>
                  </div>
                  <div className={`text-xs font-bold font-mono flex items-center gap-1 bg-surface px-2 py-1 rounded border border-border ${variancePos ? 'text-success' : 'text-danger'}`}>
                    {variancePos ? '+' : ''}<MoneyValue amount={strat.recovery_variance} />
                    {variancePos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5 rotate-180" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance by Event Type */}
        <div className="bg-surface border border-border rounded-lg p-6 flex flex-col h-full">
          <h3 className="text-sm font-semibold text-text-primary mb-4 border-b border-border pb-2">Best Strategy By Event Type</h3>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
            {eventPerformance.length === 0 ? (
               <p className="text-xs text-text-muted italic">No events analyzed.</p>
            ) : (
              eventPerformance.map((ep) => (
                <div key={ep.event_type} className="bg-background border border-border p-3 rounded-md space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-text-primary uppercase tracking-wider">{ep.event_type}</span>
                    <span className="text-[10px] text-text-secondary font-medium bg-surface px-2 py-0.5 rounded border border-border">Cases: {ep.total_cases}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-brand/5 border border-brand/10 p-2.5 rounded text-sm">
                    <div className="flex-1">
                      <span className="text-[9px] text-text-muted uppercase block font-semibold mb-0.5">Historical Best</span>
                      <span className="font-bold text-brand block capitalize">{ep.best_strategy.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-right border-l border-brand/10 pl-3">
                      <span className="text-[9px] text-text-muted uppercase block font-semibold mb-0.5">Success Rate</span>
                      <span className="font-mono font-bold text-text-primary block">{ep.best_strategy_success_rate}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
