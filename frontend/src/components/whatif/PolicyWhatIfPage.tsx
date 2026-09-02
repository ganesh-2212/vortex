import React, { useState, useEffect } from 'react';
import { getPolicyWhatIfCurrent, runPolicyWhatIf } from '../../api';
import { RefreshCw, TestTube, AlertCircle, CheckCircle2, AlertTriangle, Play, Activity } from 'lucide-react';
import { formatPercentage, formatCurrency } from '../../utils/formatters';

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
    return <div className="p-8 text-center text-slate-400 dark:text-brand-text-muted text-sm flex items-center justify-center gap-2 transition-colors"><RefreshCw className="w-4 h-4 animate-spin"/> Loading What-If Sandbox...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-brand-text-primary transition-colors">What-If Analysis</h2>
            <span className="bg-purple-600/20 text-purple-600 dark:text-brand-ai text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/30 tracking-wider uppercase transition-colors">
              SANDBOX
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-brand-text-muted mt-1 transition-colors">
            Test recovery policy changes safely without affecting production data.
          </p>
        </div>
      </div>

      {/* Safety Information */}
      <div className="bg-slate-50 dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-dark rounded-xl p-4 flex gap-3 text-sm transition-colors duration-200">
        <TestTube className="w-5 h-5 text-purple-600 dark:text-brand-ai shrink-0" />
        <div className="text-slate-600 dark:text-brand-text-secondary">
          <p className="font-semibold text-slate-800 dark:text-brand-text-primary mb-1">Sandbox Environment Active</p>
          <ul className="list-disc pl-4 space-y-1 text-xs text-slate-500 dark:text-brand-text-muted">
            <li>Guardrails remain the single source of truth for all safety limits.</li>
            <li>No production configuration will be changed.</li>
            <li>No recovery actions or payments will be executed.</li>
            <li>Results are deterministic projections based on the current Recovery Simulation model.</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-brand-danger/10 border border-rose-200 dark:border-brand-danger/30 rounded-xl p-4 flex gap-3 text-sm transition-colors duration-200">
          <AlertCircle className="w-5 h-5 text-rose-500 dark:text-brand-danger shrink-0" />
          <div className="text-rose-600 dark:text-brand-danger font-medium">{error}</div>
        </div>
      )}

      {/* Experiment Parameters */}
      <div className="bg-white dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-dark rounded-xl p-4.5 space-y-4 transition-colors duration-200">
        <h4 className="text-[10px] text-slate-500 dark:text-brand-text-muted font-bold uppercase tracking-wider border-b border-slate-200 dark:border-brand-border-dark pb-2 transition-colors">
          Policy Parameters
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Policy */}
          <div className="bg-slate-50 dark:bg-brand-card-dark border border-slate-200 dark:border-brand-border-dark rounded-lg p-4 transition-colors duration-200">
            <span className="text-[10px] text-slate-400 dark:text-brand-text-muted font-bold block uppercase tracking-wide mb-1">Current Recovery Policy</span>
            <label className="text-xs text-slate-500 dark:text-brand-text-muted block mb-2">Maximum Retry Attempts</label>
            <div className="text-xl tabular-nums text-slate-800 dark:text-brand-text-primary">{currentRetries}</div>
          </div>
          
          {/* Proposed Policy */}
          <div className="bg-slate-50 dark:bg-brand-card-dark border border-purple-500/30 dark:border-brand-border-dark rounded-lg p-4 relative overflow-hidden transition-colors duration-200">
            <div className="absolute inset-0 bg-purple-600/5 dark:hidden pointer-events-none" />
            <div className="relative z-10">
              <span className="text-[10px] text-purple-600 dark:text-brand-text-primary font-bold block uppercase tracking-wide mb-1">Proposed Recovery Policy</span>
              <label className="text-xs text-purple-600 dark:text-brand-text-secondary block mb-2">Maximum Retry Attempts</label>
              <input 
                type="number"
                min="0"
                value={proposedRetries}
                onChange={(e) => setProposedRetries(e.target.value)}
                disabled={loading}
                className="bg-white dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-dark text-xl tabular-nums text-slate-900 dark:text-brand-text-primary rounded px-3 py-1.5 w-full outline-none focus:border-purple-500 dark:focus:border-brand-ai transition-colors disabled:opacity-50"
              />
            </div>
          </div>
        </div>
        
        <div className="pt-2 flex justify-end gap-3">
          <button 
            onClick={handleReset} 
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-brand-text-muted hover:text-slate-800 dark:hover:text-brand-text-primary transition-colors disabled:opacity-50"
          >
            Reset Experiment
          </button>
          <button 
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-brand-ai dark:hover:bg-brand-ai/80 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(147,51,234,0.3)]"
          >
            {loading ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Calculating...</>
            ) : (
              <><Play className="w-3.5 h-3.5" fill="currentColor" /> Run What-If</>
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Assessment Banner */}
          <div className={`border rounded-xl p-4.5 flex gap-4 transition-colors duration-200 ${
            result.assessment === 'FAVORABLE' ? 'bg-emerald-50 dark:bg-brand-success/10 border-emerald-200 dark:border-brand-success/30' :
            result.assessment === 'UNFAVORABLE' ? 'bg-rose-50 dark:bg-brand-danger/10 border-rose-200 dark:border-brand-danger/30' :
            result.assessment === 'INVALID' ? 'bg-orange-50 dark:bg-brand-warning/10 border-orange-200 dark:border-brand-warning/30' :
            'bg-blue-50 dark:bg-brand-ai/10 border-blue-200 dark:border-brand-ai/30'
          }`}>
            <div className="pt-0.5">
              {result.assessment === 'FAVORABLE' ? <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-brand-success" /> :
               result.assessment === 'UNFAVORABLE' ? <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-brand-danger" /> :
               result.assessment === 'INVALID' ? <AlertCircle className="w-6 h-6 text-orange-600 dark:text-brand-warning" /> :
               <Activity className="w-6 h-6 text-blue-600 dark:text-brand-ai" />}
            </div>
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-1 ${
                result.assessment === 'FAVORABLE' ? 'text-emerald-600 dark:text-brand-success' :
                result.assessment === 'UNFAVORABLE' ? 'text-rose-600 dark:text-brand-danger' :
                result.assessment === 'INVALID' ? 'text-orange-600 dark:text-brand-warning' :
                'text-blue-600 dark:text-brand-ai'
              }`}>
                {result.assessment}
              </h3>
              <p className="text-xs text-slate-600 dark:text-brand-text-secondary leading-relaxed max-w-3xl">
                {result.explanation.split('\n').pop()}
              </p>
            </div>
          </div>

          {/* Comparison Table / Cards */}
          <div className="bg-white dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-dark rounded-xl p-4.5 space-y-4 transition-colors duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-brand-border-dark pb-2 transition-colors">
              <h4 className="text-[10px] text-slate-500 dark:text-brand-text-muted font-bold uppercase tracking-wider">
                Policy Impact Projection
              </h4>
              <span className="bg-blue-900/30 text-blue-600 dark:text-blue-400 dark:bg-blue-500/10 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30 dark:border-blue-500/20 tracking-wider uppercase">
                PROJECTED
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-brand-border-dark transition-colors">
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 dark:text-brand-text-muted uppercase tracking-wider">Metric</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 dark:text-brand-text-muted uppercase tracking-wider">Current</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 dark:text-brand-text-muted uppercase tracking-wider">Proposed</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 dark:text-brand-text-muted uppercase tracking-wider">Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202430]/50 dark:divide-brand-border-dark text-sm">
                  <tr className="hover:bg-slate-50 dark:hover:bg-brand-card-dark transition-colors">
                    <td className="py-3 px-4 text-slate-600 dark:text-brand-text-primary font-medium">Revenue At Risk</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-brand-text-muted tabular-nums">{formatCurrency(result.current_result.total_revenue_at_risk)}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-brand-text-muted tabular-nums">{formatCurrency(result.proposed_result.total_revenue_at_risk)}</td>
                    <td className="py-3 px-4 text-slate-400 dark:text-brand-text-muted tabular-nums">-</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-brand-card-dark transition-colors">
                    <td className="py-3 px-4 text-slate-600 dark:text-brand-text-primary font-medium">Gross Recovery</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-brand-text-muted tabular-nums">{formatCurrency(result.current_result.projected_recovery)}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-brand-text-muted tabular-nums">{formatCurrency(result.proposed_result.projected_recovery)}</td>
                    <td className={`py-3 px-4 tabular-nums ${result.revenue_impact > 0 ? 'text-emerald-600 dark:text-brand-success' : result.revenue_impact < 0 ? 'text-rose-600 dark:text-brand-danger' : 'text-slate-400 dark:text-brand-text-muted'}`}>
                      {result.revenue_impact > 0 ? '+' : ''}{formatCurrency(result.revenue_impact)}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-brand-card-dark transition-colors">
                    <td className="py-3 px-4 text-slate-600 dark:text-brand-text-primary font-medium">Intervention Cost</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-brand-text-muted tabular-nums">{formatCurrency(result.current_result.intervention_cost)}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-brand-text-muted tabular-nums">{formatCurrency(result.proposed_result.intervention_cost)}</td>
                    <td className={`py-3 px-4 tabular-nums ${result.cost_impact < 0 ? 'text-emerald-600 dark:text-brand-success' : result.cost_impact > 0 ? 'text-rose-600 dark:text-brand-danger' : 'text-slate-400 dark:text-brand-text-muted'}`}>
                      {result.cost_impact > 0 ? '+' : ''}{formatCurrency(result.cost_impact)}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-brand-card-dark transition-colors bg-slate-50/50 dark:bg-brand-card-dark/50">
                    <td className="py-3 px-4 text-slate-800 dark:text-brand-text-primary font-bold">Net Recovery</td>
                    <td className="py-3 px-4 text-slate-800 dark:text-brand-text-primary tabular-nums font-bold">{formatCurrency(result.current_result.net_recovery)}</td>
                    <td className="py-3 px-4 text-slate-800 dark:text-brand-text-primary tabular-nums font-bold">{formatCurrency(result.proposed_result.net_recovery)}</td>
                    <td className={`py-3 px-4 tabular-nums font-bold ${result.net_recovery_impact > 0 ? 'text-emerald-600 dark:text-brand-success' : result.net_recovery_impact < 0 ? 'text-rose-600 dark:text-brand-danger' : 'text-slate-400 dark:text-brand-text-muted'}`}>
                      {result.net_recovery_impact > 0 ? '+' : ''}{formatCurrency(result.net_recovery_impact)}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-brand-card-dark transition-colors">
                    <td className="py-3 px-4 text-slate-600 dark:text-brand-text-primary font-medium">Recovery Rate</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-brand-text-muted tabular-nums">{formatPercentage(result.current_result.recovery_rate)}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-brand-text-muted tabular-nums">{formatPercentage(result.proposed_result.recovery_rate)}</td>
                    <td className={`py-3 px-4 tabular-nums ${result.recovery_rate_impact > 0 ? 'text-emerald-600 dark:text-brand-success' : result.recovery_rate_impact < 0 ? 'text-rose-600 dark:text-brand-danger' : 'text-slate-400 dark:text-brand-text-muted'}`}>
                      {result.recovery_rate_impact > 0 ? '+' : ''}{formatPercentage(result.recovery_rate_impact)}
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
