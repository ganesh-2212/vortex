import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Play,
  FileText,
  BarChart2,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { runRecoverySimulation, getLatestSimulation } from '../../api';
import { PageHeader, SectionHeader, DataTable, MoneyValue, MetricCard, Alert, PrimaryButton } from '../common/UI';

interface SimulationPageProps {
  cases: any[];
}

export default function SimulationPage({ cases }: SimulationPageProps) {
  const activeCases = cases.filter(
    (c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS' || c.status === 'ESCALATED'
  );

  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>(activeCases.map((c) => c.id));
  const [batchSize, setBatchSize] = useState(Math.max(5, activeCases.length));
  const [simulating, setSimulating] = useState(false);
  const [latestResult, setLatestResult] = useState<any>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [inspectedCaseId, setInspectedCaseId] = useState<string | null>(null);

  useEffect(() => {
    async function loadLatest() {
      try {
        const res = await getLatestSimulation();
        setLatestResult(res);
      } catch (err) {
        // Suppress 404/400 errors for fresh systems
      }
    }
    loadLatest();
  }, []);

  // Auto update selected list if cases list changes
  useEffect(() => {
    setSelectedCaseIds(activeCases.map((c) => c.id));
    setBatchSize(activeCases.length);
  }, [cases]);

  const handleToggleCase = (id: string) => {
    if (selectedCaseIds.includes(id)) {
      setSelectedCaseIds(selectedCaseIds.filter((cid) => cid !== id));
    } else {
      setSelectedCaseIds([...selectedCaseIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedCaseIds.length === activeCases.length) {
      setSelectedCaseIds([]);
    } else {
      setSelectedCaseIds(activeCases.map((c) => c.id));
    }
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    setSimError(null);
    setInspectedCaseId(null);
    try {
      const sliceIds = selectedCaseIds.slice(0, batchSize);
      const res = await runRecoverySimulation({ case_ids: sliceIds });
      setLatestResult(res);
    } catch (err: any) {
      console.error(err);
      setSimError(err.message || 'Failed to execute recovery simulation run.');
    } finally {
      setSimulating(false);
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    if (outcome.toUpperCase() === 'RECOVERED') {
      return 'text-success bg-success/10 border-success/30';
    }
    return 'text-text-secondary bg-surface border-border';
  };

  const inspectedCaseDetail = latestResult?.cases?.find(
    (c: any) => c.case_id === inspectedCaseId
  );

  const simLogColumns = [
    {
      header: 'Case Reference',
      accessor: (row: any) => <span className="font-mono text-brand font-medium">#{row.case_id.substring(0, 8)}...</span>
    },
    {
      header: 'Risk Amount',
      accessor: (row: any) => <span className="font-mono text-text-primary"><MoneyValue amount={row.amount_at_risk} /></span>,
      align: 'right' as const
    },
    {
      header: 'Risk Level',
      accessor: (row: any) => (
        <span className="text-[10px] font-semibold text-text-secondary bg-surface border border-border px-1.5 py-0.5 rounded uppercase">
          {row.risk_level}
        </span>
      ),
      align: 'center' as const
    },
    {
      header: 'Sentinel Strategy',
      accessor: (row: any) => <span className="font-semibold text-text-primary text-[10px] uppercase">{row.sentinel_strategy.replace(/_/g, ' ')}</span>
    },
    {
      header: 'Net Recovery',
      accessor: (row: any) => <span className="font-mono text-success font-bold"><MoneyValue amount={row.sentinel_net_recovered} /></span>,
      align: 'right' as const
    },
    {
      header: 'Inspect',
      accessor: (row: any) => <ChevronRight className="w-4 h-4 text-brand ml-auto cursor-pointer" />,
      align: 'right' as const
    }
  ];

  return (
    <div className="space-y-6">
      
      <PageHeader 
        title="Recovery simulation" 
        subtitle="Analyze projected revenue outcomes against historical datasets without affecting production state."
      />

      {/* Simulation Warning Disclaimer Banner */}
      <Alert type="warning" title="SIMULATION MODE ACTIVE — NO REAL TRANSACTIONS">
        The simulator does not execute live payments, modify gateway ledgers, charge customer accounts, or transition production cases. All calculated recovery scenarios are projected for business value demonstration only.
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column (2/3 width) - Setup Panel and Simulation Results */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Config and Action Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
            <div className="space-y-4">
              <h3 className="text-[17px] font-[650] tracking-tight text-text-primary">Simulation batch config</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-text-secondary">Historical window</span>
                  <span className="font-semibold text-text-primary">Last 30 Days</span>
                </div>
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-text-secondary">Sample size</span>
                  <span className="font-semibold text-text-primary">{activeCases.length} cases</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-primary">Simulation Limit</label>
                <input
                  type="number"
                  min="1"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 0)}
                  className="w-full bg-background text-sm text-text-primary rounded-md border border-border p-2 outline-none focus:border-text-secondary transition-colors font-mono disabled:opacity-50"
                  disabled={simulating}
                />
              </div>

              <PrimaryButton
                onClick={handleRunSimulation}
                disabled={simulating || selectedCaseIds.length === 0}
                className="w-full py-2.5"
              >
                <Play className={`w-4 h-4 ${simulating ? 'animate-pulse' : ''}`} />
                {simulating ? 'Simulating Projections...' : 'Execute Recovery Simulation'}
              </PrimaryButton>
            </div>
          </div>

          {simError && (
            <Alert type="error">{simError}</Alert>
          )}

          {/* Results Comparison Grid */}
          {latestResult && (
            <div className="space-y-6">
              
              <div className="space-y-6 pt-8 border-t border-border">
                <div className="flex items-center gap-3">
                  <h2 className="text-[17px] font-[650] tracking-tight text-text-primary">Projected recovery</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-brand/10 border border-brand/20 text-brand">Simulation Output</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <MetricCard 
                    title="Total at risk" 
                    value={<MoneyValue amount={latestResult.total_revenue_at_risk} />} 
                  />
                  <MetricCard 
                    title="Sentinel recovery rate" 
                    isSimulated={true}
                    value={<span className="text-brand font-mono">{latestResult.sentinel_recovery_rate}%</span>} 
                  />
                  <MetricCard 
                    title="Intervention cost" 
                    isSimulated={true}
                    value={<span className="text-text-secondary font-mono"><MoneyValue amount={latestResult.total_intervention_cost} /></span>} 
                  />
                  <MetricCard 
                    title="Cases simulated" 
                    value={<span className="font-mono">{latestResult.number_of_simulated_cases}</span>} 
                  />
                </div>
              </div>

              {/* Incremental gains card */}
              <div className="bg-brand/5 border border-brand/20 rounded-lg p-6 space-y-5">
                <h3 className="text-sm font-semibold text-brand tracking-wide">Incremental revenue proof</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-background border border-border p-5 rounded-md flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-text-muted uppercase block font-bold tracking-wider">vs No Intervention Baseline</span>
                      <span className="text-xl font-extrabold text-success mt-1.5 block font-mono">
                        +<MoneyValue amount={latestResult.incremental_recovery_vs_no_intervention} />
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-success/50" />
                  </div>

                  <div className="bg-background border border-border p-5 rounded-md flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-text-muted uppercase block font-bold tracking-wider">vs Basic Retry Baseline</span>
                      <span className="text-xl font-extrabold text-brand mt-1.5 block font-mono">
                        +<MoneyValue amount={latestResult.incremental_recovery_vs_basic_retry} />
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-brand/50" />
                  </div>
                </div>

                <div className="text-xs text-text-secondary leading-relaxed">
                  Additional Recovery Lift over basic strategy: <strong className="text-brand font-mono font-bold">+{latestResult.additional_recovery_percentage}%</strong>. Total Net Recovery Value: <strong className="text-text-primary font-mono"><MoneyValue amount={latestResult.sentinel_net_recovery} /></strong>.
                </div>
              </div>

              {/* Revenue Recovery Comparison table */}
              <div className="space-y-4">
                <SectionHeader title="Revenue Recovery Comparison" />
                <div className="overflow-x-auto border border-border rounded-lg bg-surface">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-surface-hover border-b border-border text-xs uppercase text-text-secondary">
                      <tr>
                        <th className="py-3 px-4 font-medium">Recovery Policy Option</th>
                        <th className="py-3 px-4 text-right font-medium">Recovered Amount</th>
                        <th className="py-3 px-4 text-right font-medium">Estimated Lift</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono text-sm">
                      <tr className="hover:bg-surface-hover transition-colors">
                        <td className="py-3 px-4 font-semibold text-text-secondary font-sans text-xs">No Intervention (Baseline)</td>
                        <td className="py-3 px-4 text-right text-text-secondary"><MoneyValue amount={latestResult.no_intervention_recovered_amount} /></td>
                        <td className="py-3 px-4 text-right text-text-muted">0.00%</td>
                      </tr>
                      <tr className="hover:bg-surface-hover transition-colors">
                        <td className="py-3 px-4 font-semibold text-text-primary font-sans text-xs">Basic Retry Strategy</td>
                        <td className="py-3 px-4 text-right text-text-primary"><MoneyValue amount={latestResult.basic_retry_recovered_amount} /></td>
                        <td className="py-3 px-4 text-right text-brand">
                          +{latestResult.basic_retry_recovered_amount > 0 ? '100' : '0'}%
                        </td>
                      </tr>
                      <tr className="bg-brand/10 border-l-2 border-brand text-brand font-bold font-sans">
                        <td className="py-3 px-4 text-xs font-bold">Revenue Sentinel Optimized</td>
                        <td className="py-3 px-4 text-right text-success font-mono"><MoneyValue amount={latestResult.sentinel_recovered_amount} /></td>
                        <td className="py-3 px-4 text-right text-success font-mono">
                          +{latestResult.sentinel_recovery_rate}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Case-level simulations table */}
              <div className="space-y-4">
                <SectionHeader title="Simulated Batch Cases log" />
                <DataTable 
                  columns={simLogColumns}
                  data={latestResult.cases}
                  keyExtractor={(row: any) => row.case_id}
                  onRowClick={(row: any) => setInspectedCaseId(row.case_id)}
                />
              </div>

            </div>
          )}

        </div>

        {/* Right Column (1/3 width) - Case diagnostics detail inspector */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-lg p-5 space-y-4 text-left lg:sticky lg:top-6">
            <SectionHeader title="Simulation Inspector" />

            {inspectedCaseDetail ? (
              <div className="space-y-5 text-sm">
                <div className="bg-background rounded-md border border-border p-4 font-mono space-y-2 text-text-secondary">
                  <div className="border-b border-border pb-2 text-[10px] text-text-muted mb-2 tracking-wider">
                    Case UUID: {inspectedCaseDetail.case_id}
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Amount at Risk:</span>
                    <span className="font-bold text-text-primary"><MoneyValue amount={inspectedCaseDetail.amount_at_risk} /></span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Risk Severity:</span>
                    <span className="font-bold text-text-primary">{inspectedCaseDetail.risk_level}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Policy Comparison</span>
                  
                  <div className="space-y-2 font-mono text-xs">
                    <div className="bg-background border border-border p-3 rounded-md flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-text-muted block uppercase font-bold tracking-wider mb-0.5">No Intervention</span>
                        <span className="font-bold text-text-secondary"><MoneyValue amount={inspectedCaseDetail.no_intervention_recovered} /></span>
                      </div>
                      <span className="text-[10px] text-text-muted font-medium">Rate: 0%</span>
                    </div>

                    <div className="bg-background border border-border p-3 rounded-md flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-text-muted block uppercase font-bold tracking-wider mb-0.5">Basic Retry Strategy</span>
                        <span className="font-bold text-text-primary"><MoneyValue amount={inspectedCaseDetail.basic_retry_recovered} /></span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-text-secondary block uppercase tracking-wider font-semibold mb-0.5">{inspectedCaseDetail.basic_retry_strategy.replace(/_/g, ' ')}</span>
                        <span className="text-[9px] text-text-muted">Cost: <MoneyValue amount={inspectedCaseDetail.basic_retry_cost} /></span>
                      </div>
                    </div>

                    <div className="bg-brand/10 border border-brand/20 p-3 rounded-md flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-brand block uppercase font-bold tracking-wider mb-0.5">Sentinel Optimized</span>
                        <span className="font-bold text-success"><MoneyValue amount={inspectedCaseDetail.sentinel_recovered} /></span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-brand block uppercase tracking-wider font-semibold mb-0.5">{inspectedCaseDetail.sentinel_strategy.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-brand/80 font-bold">Prob: {inspectedCaseDetail.sentinel_probability}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-background border border-border rounded-md p-4 font-mono space-y-2.5 text-xs text-text-primary">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Sentinel Net Recovery:</span>
                    <span className="font-bold"><MoneyValue amount={inspectedCaseDetail.sentinel_net_recovered} /></span>
                  </div>
                  <div className="flex justify-between items-center border-t border-border pt-2.5">
                    <span className="text-text-secondary">Lift vs Basic Retry:</span>
                    <span className="font-bold text-success">+<MoneyValue amount={inspectedCaseDetail.incremental_vs_basic_retry} /></span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-text-secondary">Outcome:</span>
                    <span className={`px-2 py-0.5 rounded border text-[9px] uppercase font-bold tracking-wider ${getOutcomeBadge(inspectedCaseDetail.final_outcome)}`}>
                      {inspectedCaseDetail.final_outcome}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-text-muted text-xs">
                Select a simulated case from the batch list to inspect baseline vs Sentinel recovery lifts.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
