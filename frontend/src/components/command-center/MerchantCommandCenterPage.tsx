import React, { useEffect, useState } from 'react';
import { getMerchantCommandCenter } from '../../api';
import { RefreshCw, ArrowRight, AlertCircle, Activity, Layers, Cpu } from 'lucide-react';
import { RiskBadge, PageHeader, SectionHeader, MetricCard, DataTable, MoneyValue, Alert, PrimaryButton } from '../common/UI';

export function MerchantCommandCenterPage({ 
  onViewCase,
  onNavigate,
  summary,
  leakage
}: { 
  onViewCase: (id: string) => void;
  onNavigate: (tab: string) => void;
  summary?: any;
  leakage?: any[];
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const merchantId = '00000000-0000-0000-0000-000000000000';
      const response = await getMerchantCommandCenter(merchantId);
      setData(response);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load command center data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-text-secondary">Loading Revenue Command Center...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <Alert type="error" title="Failed to load command center data">
          <p>{error}</p>
          <PrimaryButton onClick={() => loadData()} className="mt-4">Retry</PrimaryButton>
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  const metrics = data.metrics;
  
  const recoveryQueueColumns = [
    {
      header: 'Case',
      accessor: (row: any) => <span className="font-mono text-text-primary">{row.case_id.split('-')[0]}</span>
    },
    {
      header: 'Amount',
      accessor: (row: any) => <span className="font-mono text-text-primary"><MoneyValue amount={row.amount} /></span>
    },
    {
      header: 'Risk',
      accessor: (row: any) => <RiskBadge level={row.risk_level as any} />
    },
    {
      header: 'Strategy',
      accessor: (row: any) => (
        <span className="px-2 py-0.5 text-[10px] bg-brand/10 text-brand border border-brand/20 rounded capitalize tracking-wider font-semibold">
          {row.current_strategy.replace(/_/g, ' ')}
        </span>
      )
    },
    {
      header: 'Next Action',
      accessor: (row: any) => <span className="text-text-secondary text-xs">{row.orchestration_decision.replace(/_/g, ' ')}</span>
    },
    {
      header: 'Action',
      accessor: (row: any) => (
        <button 
          onClick={(e) => { e.stopPropagation(); onViewCase(row.case_id); }}
          className="text-brand hover:text-brand-hover font-medium text-xs flex items-center gap-1 justify-end w-full transition-colors"
        >
          View <ArrowRight className="w-3.5 h-3.5" />
        </button>
      ),
      align: 'right' as const
    }
  ];

  const totalAtRisk = Number(summary?.revenue_at_risk || 0.0);
  const riskLevels = summary ? [
    { key: 'CRITICAL', label: 'Critical Risk', val: summary.critical_amount || '0.00', color: 'bg-danger' },
    { key: 'HIGH', label: 'High Risk', val: summary.high_amount || '0.00', color: 'bg-warning' },
    { key: 'MEDIUM', label: 'Medium Risk', val: summary.medium_amount || '0.00', color: 'bg-info' },
    { key: 'LOW', label: 'Low Risk', val: summary.low_amount || '0.00', color: 'bg-success' }
  ] : [];

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
    <div className="space-y-8 pb-12">
      {/* Header */}
      <PageHeader 
        title="Revenue Command Center" 
        subtitle="Real-time view of revenue risk, recovery performance, and active operations."
        actions={
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider hidden sm:inline-block">
              Last updated: {new Date(data.generated_at).toLocaleTimeString()}
            </span>
            <button 
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 bg-surface hover:bg-surface-hover border border-border text-xs font-medium text-text-primary px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        }
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <MetricCard 
            title="Revenue at Risk" 
            value={<MoneyValue amount={summary?.revenue_at_risk || 0.0} />} 
            subtitle="Current active exposure"
          />
          <MetricCard 
            title="Open Cases" 
            value={summary?.open_cases || 0} 
            subtitle="Requiring attention"
          />
          <MetricCard 
            title="Confirmed Recovered" 
            value={<span className="text-success"><MoneyValue amount={summary?.total_recovered || 0.0} /></span>} 
            subtitle="Actual collected revenue"
          />
          <MetricCard 
            title="Recovery Rate" 
            value={<span className="text-brand font-mono">{(summary?.recovery_rate || 0.0).toFixed(1)}%</span>} 
            subtitle="Lifetime operational rate"
          />
        </div>
      </div>

      {summary && leakage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-border">
          <div className="space-y-5">
            <h3 className="text-[17px] font-[650] tracking-tight text-text-primary">Risk exposure</h3>
            <div className="space-y-4">
              {riskLevels.map((lvl, idx) => {
                const amount = Number(lvl.val);
                const percentage = totalAtRisk > 0 ? (amount / totalAtRisk) * 100 : 0;
                return (
                  <div key={lvl.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] font-semibold tracking-wide text-text-secondary uppercase">{lvl.label}</span>
                      <span className="text-[13px] font-semibold text-text-primary"><MoneyValue amount={lvl.val} /></span>
                    </div>
                    <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                      <div className={`h-full ${lvl.color}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                    {idx !== riskLevels.length - 1 && <div className="mt-4 border-b border-border/50"></div>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[17px] font-[650] tracking-tight text-text-primary">Leakage by origin</h3>
            <DataTable 
              columns={leakageColumns}
              data={leakage}
              keyExtractor={(row) => row.event_type}
              emptyMessage="No leakage data available."
            />
          </div>
        </div>
      )}

      <div className="space-y-6 pt-6 border-t border-border">
        <SectionHeader 
          title="Baseline comparison" 
          subtitle="How Sentinel's automated strategy compares to a static retry baseline."
        />
        
        {!data.simulation_available ? (
          <div className="bg-surface border border-border rounded-lg p-10 text-center space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-text-muted" />
            <div>
              <p className="text-sm font-semibold text-text-primary">Simulation evidence not available yet</p>
              <p className="text-xs text-text-secondary mt-1 max-w-md mx-auto">Run a recovery simulation to compare Sentinel against baseline strategies.</p>
            </div>
            <PrimaryButton onClick={() => onNavigate('simulation')} className="mt-4">
              Run Simulation
            </PrimaryButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.revenue_comparison.map((comp: any) => {
              const isOptimized = comp.scenario_type === 'SENTINEL_OPTIMIZED';
              return (
                <div key={comp.scenario_type} className={`relative rounded-lg p-5 border flex flex-col ${isOptimized ? 'bg-brand/5 border-brand/30 shadow-sm' : 'bg-surface border-border'}`}>
                  {isOptimized && (
                    <div className="absolute top-0 right-0 bg-brand/10 text-brand border-b border-l border-brand/20 text-[9px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">
                      OPTIMIZED
                    </div>
                  )}
                  <h3 className="text-xs font-semibold text-text-primary mb-4 flex items-center justify-between">
                    {comp.scenario_type.replace('_', ' ')}
                    <span className="text-[9px] px-1.5 py-0.5 bg-background text-text-secondary rounded border border-border">SIMULATED</span>
                  </h3>
                  <div className="space-y-3 mt-auto">
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary text-[11px] font-medium">Projected Recovery</span>
                      <span className="text-text-primary text-sm font-mono"><MoneyValue amount={comp.simulated_projected_recovery} /></span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary text-[11px] font-medium">Cost</span>
                      <span className="text-text-muted text-xs font-mono"><MoneyValue amount={comp.intervention_cost} /></span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-border">
                      <span className="text-text-secondary text-[11px] font-bold">Net Recovery</span>
                      <span className="text-success text-sm font-bold font-mono"><MoneyValue amount={comp.net_recovery} /></span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary text-[11px] font-medium">Rate</span>
                      <span className="text-text-primary text-xs font-mono">{comp.recovery_rate_percentage}%</span>
                    </div>
                    {comp.projected_incremental_revenue > 0 && (
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-brand text-[11px] font-bold">Incremental Value</span>
                        <span className="text-brand text-xs font-bold font-mono">+{<MoneyValue amount={comp.projected_incremental_revenue} />}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 4 - Human Attention */}
      {data.human_attention_cases.length > 0 && (
        <div className="space-y-4">
          <SectionHeader title="Requires Human Attention" />
          <div className="bg-danger/10 border border-danger/30 rounded-lg overflow-hidden">
            <div className="divide-y divide-danger/20">
              {data.human_attention_cases.map((attn: any) => (
                <div key={attn.case_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-danger/5 transition-colors">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-danger font-semibold text-sm">Case {attn.case_id.split('-')[0]}</span>
                      <span className="text-danger/80 font-mono text-xs font-bold"><MoneyValue amount={attn.amount} /></span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-background text-text-secondary border border-border font-medium">
                        {attn.current_state}
                      </span>
                      <span className="text-[10px] text-danger/70 font-medium">Age: {attn.case_age_hours}h</span>
                    </div>
                    <p className="text-danger/80 text-xs leading-relaxed">{attn.reason}</p>
                  </div>
                  <button 
                    onClick={() => onViewCase(attn.case_id)}
                    className="shrink-0 px-3 py-1.5 bg-background border border-danger/30 text-danger text-xs font-medium rounded-md hover:bg-danger/10 transition-colors"
                  >
                    View Case
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Section 3 - Active Recovery Queue */}
      <div className="space-y-4">
        <SectionHeader 
          title="Active Recovery Queue" 
          actions={
            <span className="bg-background border border-border text-text-secondary text-[10px] px-2 py-0.5 rounded-full font-bold">
              {data.recovery_queue.items.length} Active
            </span>
          }
        />
        <DataTable 
          columns={recoveryQueueColumns}
          data={data.recovery_queue.items}
          keyExtractor={(row) => row.case_id}
          onRowClick={(row) => onViewCase(row.case_id)}
          emptyMessage="No active recovery cases. There are currently no cases requiring intervention."
        />
      </div>

      {/* Grid for Strategy and Decision Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Section 5 - Strategy Performance */}
        <div className="space-y-4 flex flex-col">
          <SectionHeader 
            title="Strategy Performance" 
            actions={
              <span className="text-[9px] text-brand px-2 py-0.5 rounded bg-brand/10 border border-brand/20 tracking-wider font-bold">F14 OUTCOME INTEL</span>
            }
          />
          {data.strategy_performance.length === 0 ? (
            <div className="bg-surface border border-border rounded-lg p-6 text-center flex-1 flex flex-col justify-center items-center space-y-2">
              <Activity className="w-8 h-8 text-text-muted" />
              <p className="text-sm font-semibold text-text-primary">Not enough historical data</p>
              <p className="text-xs text-text-secondary">Strategy performance will appear as recovery outcomes accumulate.</p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-lg overflow-hidden divide-y divide-border flex-1">
              {data.strategy_performance.map((strat: any) => (
                <div key={strat.strategy_name} className="p-4 flex justify-between items-center hover:bg-surface-hover transition-colors">
                  <div>
                    <h3 className="text-text-primary text-xs font-semibold mb-1 capitalize tracking-wide">{strat.strategy_name.replace(/_/g, ' ')}</h3>
                    <p className="text-text-secondary text-[10px]">{strat.attempts} attempts recorded</p>
                  </div>
                  <div className="text-right">
                    <p className="text-success text-xs font-bold font-mono mb-1">{strat.success_rate}% Success</p>
                    <p className="text-text-muted text-[10px] font-mono">Net: <MoneyValue amount={strat.net_recovery} /></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 7 - Decision Intelligence */}
        <div className="space-y-4 flex flex-col">
          <SectionHeader 
            title="Decision Intelligence" 
            actions={
              <span className="text-[9px] text-brand px-2 py-0.5 rounded bg-brand/10 border border-brand/20 tracking-wider font-bold">F15 EXPLAINABILITY</span>
            }
          />
          <div className="bg-surface border border-border rounded-lg p-5 flex flex-col flex-1">
            <p className="text-text-secondary text-xs mb-6 leading-relaxed">
              Every action Revenue Sentinel takes is completely deterministic, relying on merchant guardrails, transparent simulations, and verifiable orchestration logic. No black boxes.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-background p-4 rounded-lg border border-border">
                <p className="text-text-muted text-[9px] mb-1.5 uppercase tracking-wider font-bold">Cases Assessed</p>
                <p className="text-xl font-mono font-bold text-text-primary">{metrics.total_cases}</p>
              </div>
              <div className="bg-background p-4 rounded-lg border border-border">
                <p className="text-text-muted text-[9px] mb-1.5 uppercase tracking-wider font-bold">Actions Orchestrated</p>
                <p className="text-xl font-mono font-bold text-text-primary">{metrics.total_recovery_actions}</p>
              </div>
              <div className="bg-background p-4 rounded-lg border border-border">
                <p className="text-text-muted text-[9px] mb-1.5 uppercase tracking-wider font-bold">Recoveries</p>
                <p className="text-xl font-mono font-bold text-success">{metrics.recovered_cases}</p>
              </div>
              <div className="bg-background p-4 rounded-lg border border-border">
                <p className="text-text-muted text-[9px] mb-1.5 uppercase tracking-wider font-bold">Blocked by Safety</p>
                <p className="text-xl font-mono font-bold text-danger">{metrics.blocked_actions}</p>
              </div>
            </div>

            <div className="mt-auto pt-2">
              <button 
                onClick={() => onNavigate('explanation')}
                className="w-full py-2.5 bg-brand/5 hover:bg-brand/10 border border-brand/20 text-brand text-xs rounded-md transition-colors font-medium flex justify-center items-center gap-2"
              >
                <Cpu className="w-4 h-4" />
                View Decision Intelligence
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
