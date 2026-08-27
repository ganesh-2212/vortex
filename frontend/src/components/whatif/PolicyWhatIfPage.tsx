import React, { useState, useEffect } from 'react';
import { getPolicyWhatIfCurrent, runPolicyWhatIf } from '../../api';
import { RefreshCw, TestTube, AlertCircle, CheckCircle2, AlertTriangle, Play, Activity } from 'lucide-react';
import { PageHeader, SectionHeader, Alert, PrimaryButton, MoneyValue } from '../common/UI';

const merchantId = "11111111-1111-1111-1111-111111111111"; // Hardcoded for demo

export const PolicyWhatIfPage: React.FC = () => {
  const [currentRetries, setCurrentRetries] = useState<number>(3);
  const [proposedRetries, setProposedRetries] = useState<number | string>(3);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPolicyWhatIfCurrent(merchantId).then((data) => {
      setCurrentRetries(data.current_max_retries);
      setProposedRetries(data.current_max_retries);
      setInitializing(false);
    }).catch(err => {
      setError(err.message);
      setInitializing(false);
    });
  }, []);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await runPolicyWhatIf(merchantId, Number(proposedRetries));
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleReset = () => {
    setProposedRetries(currentRetries);
    setResult(null);
    setError(null);
  };

  if (initializing) {
    return <div className="p-8 text-center text-text-secondary text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin text-brand"/> Loading What-If Sandbox...</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <PageHeader 
        title={
          <div className="flex items-center gap-3">
            Policy What-If Lab
            <span className="bg-brand/10 text-brand text-[10px] font-bold px-2 py-0.5 rounded border border-brand/20 tracking-wider uppercase">
              SANDBOX
            </span>
          </div>
        }
        subtitle="Test recovery policy changes safely without affecting production data."
      />

      {/* Safety Information */}
      <Alert type="info" title="Sandbox Environment Active">
        <ul className="list-disc pl-5 space-y-1 mt-1 text-xs text-text-secondary">
          <li>F10 Guardrails remain the single source of truth for all safety limits.</li>
          <li>No production configuration will be changed.</li>
          <li>No recovery actions or payments will be executed.</li>
          <li>Results are deterministic projections based on the current F12 Simulation model.</li>
        </ul>
      </Alert>

      {error && (
        <Alert type="error" title={error} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <SectionHeader title="Current policy" />
          <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1 font-medium">Maximum retry attempts</label>
              <div className="text-3xl font-mono font-semibold text-text-primary">{currentRetries}</div>
            </div>
          </div>
          
          <SectionHeader title="Proposed policy" />
          <div className="bg-brand/5 border border-brand/20 rounded-lg p-6 space-y-4">
            <div>
              <label className="text-xs text-brand/80 block mb-1 font-medium">Maximum retry attempts</label>
            </div>
            <input 
              type="number"
              min="0"
              value={proposedRetries}
              onChange={(e) => setProposedRetries(e.target.value)}
              disabled={loading}
              className="bg-background border border-border text-2xl font-mono text-text-primary rounded-md px-4 py-2 w-full outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all disabled:opacity-50"
            />
          </div>
        
          <div className="pt-2 flex justify-start gap-4">
            <PrimaryButton 
              onClick={handleRun}
              disabled={loading}
              className="px-6"
            >
              {loading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Calculating...</>
              ) : (
                <><Play className="w-4 h-4" fill="currentColor" /> Run what-if</>
              )}
            </PrimaryButton>
            <button 
              onClick={handleReset} 
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 bg-transparent"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="space-y-6 pt-6 border-t border-border animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3">
            <h2 className="text-[17px] font-[650] tracking-tight text-text-primary">Policy impact projection</h2>
          </div>

          <div className={`border rounded-lg p-5 flex gap-4 ${
            result.assessment === 'FAVORABLE' ? 'bg-success/5 border-success/20' :
            result.assessment === 'UNFAVORABLE' ? 'bg-danger/5 border-danger/20' :
            result.assessment === 'INVALID' ? 'bg-warning/5 border-warning/20' :
            'bg-info/5 border-info/20'
          }`}>
            <div className="pt-0.5">
              {result.assessment === 'FAVORABLE' ? <CheckCircle2 className="w-6 h-6 text-success" /> :
               result.assessment === 'UNFAVORABLE' ? <AlertTriangle className="w-6 h-6 text-danger" /> :
               result.assessment === 'INVALID' ? <AlertCircle className="w-6 h-6 text-warning" /> :
               <Activity className="w-6 h-6 text-info" />}
            </div>
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-1.5 ${
                result.assessment === 'FAVORABLE' ? 'text-success' :
                result.assessment === 'UNFAVORABLE' ? 'text-danger' :
                result.assessment === 'INVALID' ? 'text-warning' :
                'text-info'
              }`}>
                {result.assessment}
              </h3>
              <p className="text-sm text-text-primary leading-relaxed max-w-3xl">
                {result.explanation.split('\n').pop()}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[17px] font-[650] tracking-tight text-text-primary">Expected vs current baseline</h3>
            
            <div className="overflow-x-auto border border-border rounded-lg bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-hover border-b border-border">
                  <tr>
                    <th className="py-3.5 px-5 text-xs font-semibold text-text-secondary uppercase tracking-wider">Metric</th>
                    <th className="py-3.5 px-5 text-xs font-semibold text-text-secondary uppercase tracking-wider">Current</th>
                    <th className="py-3.5 px-5 text-xs font-semibold text-text-secondary uppercase tracking-wider">Proposed</th>
                    <th className="py-3.5 px-5 text-xs font-semibold text-text-secondary uppercase tracking-wider">Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  <tr className="hover:bg-surface-hover transition-colors">
                    <td className="py-4 px-5 text-text-primary font-medium">Revenue at risk</td>
                    <td className="py-4 px-5 text-text-secondary font-mono"><MoneyValue amount={result.current_result.total_revenue_at_risk} /></td>
                    <td className="py-4 px-5 text-text-secondary font-mono"><MoneyValue amount={result.proposed_result.total_revenue_at_risk} /></td>
                    <td className="py-4 px-5 text-text-muted font-mono">-</td>
                  </tr>
                  <tr className="hover:bg-surface-hover transition-colors">
                    <td className="py-4 px-5 text-text-primary font-medium">Gross Recovery</td>
                    <td className="py-4 px-5 text-text-secondary font-mono"><MoneyValue amount={result.current_result.projected_recovery} /></td>
                    <td className="py-4 px-5 text-text-secondary font-mono"><MoneyValue amount={result.proposed_result.projected_recovery} /></td>
                    <td className={`py-4 px-5 font-mono font-medium ${result.revenue_impact > 0 ? 'text-success' : result.revenue_impact < 0 ? 'text-danger' : 'text-text-muted'}`}>
                      {result.revenue_impact > 0 ? '+' : ''}<MoneyValue amount={result.revenue_impact} />
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-hover transition-colors">
                    <td className="py-4 px-5 text-text-primary font-medium">Intervention Cost</td>
                    <td className="py-4 px-5 text-text-secondary font-mono"><MoneyValue amount={result.current_result.intervention_cost} /></td>
                    <td className="py-4 px-5 text-text-secondary font-mono"><MoneyValue amount={result.proposed_result.intervention_cost} /></td>
                    <td className={`py-4 px-5 font-mono font-medium ${result.cost_impact < 0 ? 'text-success' : result.cost_impact > 0 ? 'text-danger' : 'text-text-muted'}`}>
                      {result.cost_impact > 0 ? '+' : ''}<MoneyValue amount={result.cost_impact} />
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-hover transition-colors bg-background">
                    <td className="py-4 px-5 text-text-primary font-bold">Net Recovery</td>
                    <td className="py-4 px-5 text-text-primary font-mono font-bold"><MoneyValue amount={result.current_result.net_recovery} /></td>
                    <td className="py-4 px-5 text-text-primary font-mono font-bold"><MoneyValue amount={result.proposed_result.net_recovery} /></td>
                    <td className={`py-4 px-5 font-mono font-bold ${result.net_recovery_impact > 0 ? 'text-success' : result.net_recovery_impact < 0 ? 'text-danger' : 'text-text-muted'}`}>
                      {result.net_recovery_impact > 0 ? '+' : ''}<MoneyValue amount={result.net_recovery_impact} />
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-hover transition-colors">
                    <td className="py-4 px-5 text-text-primary font-medium">Recovery Rate</td>
                    <td className="py-4 px-5 text-text-secondary font-mono">{result.current_result.recovery_rate.toFixed(2)}%</td>
                    <td className="py-4 px-5 text-text-secondary font-mono">{result.proposed_result.recovery_rate.toFixed(2)}%</td>
                    <td className={`py-4 px-5 font-mono font-medium ${result.recovery_rate_impact > 0 ? 'text-success' : result.recovery_rate_impact < 0 ? 'text-danger' : 'text-text-muted'}`}>
                      {result.recovery_rate_impact > 0 ? '+' : ''}{result.recovery_rate_impact.toFixed(2)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
};
