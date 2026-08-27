import React, { useState, useEffect } from 'react';
import { getPolicyWhatIfCurrent, runPolicyWhatIf } from '../../api';
import { RefreshCw, TestTube, AlertCircle, CheckCircle2, AlertTriangle, Play, Activity } from 'lucide-react';

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

  const formatCurrency = (val: string | number) => {
    return `₹${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (initializing) {
    return <div className="p-8 text-center text-gray-500 text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin"/> Loading What-If Sandbox...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-100">Policy What-If Lab</h2>
            <span className="bg-purple-600/20 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/30 tracking-wider uppercase">
              SANDBOX
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Test recovery policy changes safely without affecting production data.
          </p>
        </div>
      </div>

      {/* Safety Information */}
      <div className="bg-[#1b1e28] border border-[#2e3445] rounded-xl p-4 flex gap-3 text-sm">
        <TestTube className="w-5 h-5 text-purple-400 shrink-0" />
        <div className="text-gray-300">
          <p className="font-semibold text-gray-200 mb-1">Sandbox Environment Active</p>
          <ul className="list-disc pl-4 space-y-1 text-xs text-gray-400">
            <li>F10 Guardrails remain the single source of truth for all safety limits.</li>
            <li>No production configuration will be changed.</li>
            <li>No recovery actions or payments will be executed.</li>
            <li>Results are deterministic projections based on the current F12 Simulation model.</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <div className="text-rose-400 font-medium">{error}</div>
        </div>
      )}

      {/* Experiment Parameters */}
      <div className="bg-[#13151c]/60 border border-[#202430] rounded-xl p-4.5 space-y-4">
        <h4 className="text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-[#202430] pb-2">
          Policy Parameters
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Policy */}
          <div className="bg-[#13151c] border border-[#202430] rounded-lg p-4">
            <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wide mb-1">Current Recovery Policy</span>
            <label className="text-xs text-gray-400 block mb-2">Maximum Retry Attempts</label>
            <div className="text-xl font-mono text-gray-200">{currentRetries}</div>
          </div>
          
          {/* Proposed Policy */}
          <div className="bg-[#13151c] border border-purple-500/30 rounded-lg p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-purple-600/5 pointer-events-none" />
            <span className="text-[10px] text-purple-400 font-bold block uppercase tracking-wide mb-1">Proposed Recovery Policy</span>
            <label className="text-xs text-purple-300/70 block mb-2">Maximum Retry Attempts</label>
            <input 
              type="number"
              min="0"
              value={proposedRetries}
              onChange={(e) => setProposedRetries(e.target.value)}
              disabled={loading}
              className="bg-[#0d0e12] border border-[#2e3445] text-xl font-mono text-white rounded px-3 py-1.5 w-full outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
            />
          </div>
        </div>
        
        <div className="pt-2 flex justify-end gap-3">
          <button 
            onClick={handleReset} 
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            Reset Experiment
          </button>
          <button 
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(147,51,234,0.3)]"
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
          <div className={`border rounded-xl p-4.5 flex gap-4 ${
            result.assessment === 'FAVORABLE' ? 'bg-emerald-500/10 border-emerald-500/20' :
            result.assessment === 'UNFAVORABLE' ? 'bg-rose-500/10 border-rose-500/20' :
            result.assessment === 'INVALID' ? 'bg-orange-500/10 border-orange-500/20' :
            'bg-blue-500/10 border-blue-500/20'
          }`}>
            <div className="pt-0.5">
              {result.assessment === 'FAVORABLE' ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> :
               result.assessment === 'UNFAVORABLE' ? <AlertTriangle className="w-6 h-6 text-rose-400" /> :
               result.assessment === 'INVALID' ? <AlertCircle className="w-6 h-6 text-orange-400" /> :
               <Activity className="w-6 h-6 text-blue-400" />}
            </div>
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-1 ${
                result.assessment === 'FAVORABLE' ? 'text-emerald-400' :
                result.assessment === 'UNFAVORABLE' ? 'text-rose-400' :
                result.assessment === 'INVALID' ? 'text-orange-400' :
                'text-blue-400'
              }`}>
                {result.assessment}
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed max-w-3xl">
                {result.explanation.split('\n').pop()}
              </p>
            </div>
          </div>

          {/* Comparison Table / Cards */}
          <div className="bg-[#13151c]/60 border border-[#202430] rounded-xl p-4.5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#202430] pb-2">
              <h4 className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Policy Impact Projection
              </h4>
              <span className="bg-blue-900/30 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30 tracking-wider uppercase">
                PROJECTED
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#202430]">
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Metric</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Current</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Proposed</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202430]/50 text-sm">
                  <tr className="hover:bg-[#1b1e28] transition-colors">
                    <td className="py-3 px-4 text-gray-300 font-medium">Revenue At Risk</td>
                    <td className="py-3 px-4 text-gray-400 font-mono">{formatCurrency(result.current_result.total_revenue_at_risk)}</td>
                    <td className="py-3 px-4 text-gray-400 font-mono">{formatCurrency(result.proposed_result.total_revenue_at_risk)}</td>
                    <td className="py-3 px-4 text-gray-500 font-mono">-</td>
                  </tr>
                  <tr className="hover:bg-[#1b1e28] transition-colors">
                    <td className="py-3 px-4 text-gray-300 font-medium">Gross Recovery</td>
                    <td className="py-3 px-4 text-gray-400 font-mono">{formatCurrency(result.current_result.projected_recovery)}</td>
                    <td className="py-3 px-4 text-gray-400 font-mono">{formatCurrency(result.proposed_result.projected_recovery)}</td>
                    <td className={`py-3 px-4 font-mono ${result.revenue_impact > 0 ? 'text-emerald-400' : result.revenue_impact < 0 ? 'text-rose-400' : 'text-gray-500'}`}>
                      {result.revenue_impact > 0 ? '+' : ''}{formatCurrency(result.revenue_impact)}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#1b1e28] transition-colors">
                    <td className="py-3 px-4 text-gray-300 font-medium">Intervention Cost</td>
                    <td className="py-3 px-4 text-gray-400 font-mono">{formatCurrency(result.current_result.intervention_cost)}</td>
                    <td className="py-3 px-4 text-gray-400 font-mono">{formatCurrency(result.proposed_result.intervention_cost)}</td>
                    <td className={`py-3 px-4 font-mono ${result.cost_impact < 0 ? 'text-emerald-400' : result.cost_impact > 0 ? 'text-rose-400' : 'text-gray-500'}`}>
                      {result.cost_impact > 0 ? '+' : ''}{formatCurrency(result.cost_impact)}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#1b1e28] transition-colors bg-[#1b1e28]/50">
                    <td className="py-3 px-4 text-gray-200 font-bold">Net Recovery</td>
                    <td className="py-3 px-4 text-gray-200 font-mono font-bold">{formatCurrency(result.current_result.net_recovery)}</td>
                    <td className="py-3 px-4 text-gray-200 font-mono font-bold">{formatCurrency(result.proposed_result.net_recovery)}</td>
                    <td className={`py-3 px-4 font-mono font-bold ${result.net_recovery_impact > 0 ? 'text-emerald-400' : result.net_recovery_impact < 0 ? 'text-rose-400' : 'text-gray-500'}`}>
                      {result.net_recovery_impact > 0 ? '+' : ''}{formatCurrency(result.net_recovery_impact)}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#1b1e28] transition-colors">
                    <td className="py-3 px-4 text-gray-300 font-medium">Recovery Rate</td>
                    <td className="py-3 px-4 text-gray-400 font-mono">{result.current_result.recovery_rate.toFixed(2)}%</td>
                    <td className="py-3 px-4 text-gray-400 font-mono">{result.proposed_result.recovery_rate.toFixed(2)}%</td>
                    <td className={`py-3 px-4 font-mono ${result.recovery_rate_impact > 0 ? 'text-emerald-400' : result.recovery_rate_impact < 0 ? 'text-rose-400' : 'text-gray-500'}`}>
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
