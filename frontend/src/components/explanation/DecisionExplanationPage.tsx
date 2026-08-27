import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Check,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown
} from 'lucide-react';
import { getDecisionExplanation } from '../../api';
import { LoadingState, ErrorState } from '../common/LoaderAndStates';
import { PageHeader, SectionHeader, MoneyValue } from '../common/UI';

interface DecisionExplanationPageProps {
  cases: any[];
}

export default function DecisionExplanationPage({ cases }: DecisionExplanationPageProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [explanation, setExplanation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCaseId) {
      loadExplanation(selectedCaseId);
    } else {
      setExplanation(null);
    }
  }, [selectedCaseId]);

  const loadExplanation = async (caseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const expl = await getDecisionExplanation(caseId);
      setExplanation(expl);
    } catch (err: any) {
      setError(err.message || 'Failed to load explanation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        title="Decision intelligence" 
        subtitle="Audit trace and explainability for Sentinel's recovery strategy engine."
      />

      {/* Case Selector */}
      <div className="bg-surface border border-border rounded-lg p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <label className="text-sm font-semibold text-text-primary whitespace-nowrap">Select a case to inspect:</label>
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="w-full bg-background text-sm text-text-primary border border-border rounded-md pl-10 pr-10 py-2.5 outline-none focus:border-text-secondary focus:ring-1 focus:ring-text-secondary appearance-none transition-all cursor-pointer font-mono"
          >
            <option value="" className="font-sans">-- Choose a Recovery Case --</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id.substring(0, 8)}... (Risk: {c.risk_level})
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {loading && (
        <div className="bg-surface border border-border rounded-lg p-12">
          <LoadingState message="Reconstructing deterministic explanation evidence..." />
        </div>
      )}

      {error && !loading && (
        <div className="bg-surface border border-border rounded-lg p-12">
          <ErrorState message={error} onRetry={() => loadExplanation(selectedCaseId)} />
        </div>
      )}

      {!loading && !error && explanation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Explanations (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <SectionHeader 
              title="Decision audit trace" 
              subtitle="Deterministic breakdown of the strategy evaluation."
            />
            
            <div className="bg-surface border border-border rounded-lg p-6 space-y-6">
              
              {/* Risk & Strategy */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background border border-border p-4 rounded-md">
                  <span className="text-[10px] text-text-muted block uppercase font-bold tracking-wider mb-1.5">Risk assessed</span>
                  <span className="text-base font-bold text-text-primary block uppercase tracking-wide">{explanation.risk_level}</span>
                  <p className="text-xs text-text-secondary mt-2 leading-relaxed">{explanation.risk_reasons.join(', ')}</p>
                </div>
                <div className="bg-brand/5 border border-brand/20 p-4 rounded-md">
                  <span className="text-[10px] text-brand block uppercase font-bold tracking-wider mb-1.5">Recommended strategy</span>
                  <span className="text-base font-bold text-brand block uppercase tracking-wide">{explanation.strategy_selected.replace(/_/g, ' ')}</span>
                  <p className="text-xs text-brand/80 mt-2 leading-relaxed">{explanation.strategy_reason}</p>
                </div>
              </div>

              {/* Orchestration */}
              <div className="bg-background border border-border p-4 rounded-md">
                <span className="text-[10px] text-text-muted block uppercase font-bold tracking-wider mb-1.5">Orchestration decision</span>
                <span className={`text-sm font-bold block uppercase tracking-wide ${explanation.orchestration_decision === 'WAIT_COOLDOWN' ? 'text-warning' : 'text-success'}`}>
                  {explanation.orchestration_decision.replace(/_/g, ' ')}
                </span>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">{explanation.orchestration_reason}</p>
              </div>

              {/* Guardrails */}
              <div className="bg-background border border-border p-4 rounded-md space-y-4">
                <span className="text-[10px] text-text-muted block uppercase font-bold tracking-wider">Safety checks (guardrails)</span>
                
                {explanation.guardrail_checks.length > 0 ? (
                  <div className="space-y-3">
                    {explanation.guardrail_checks.map((g: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 bg-surface p-3 rounded-md border border-border">
                        {g.status === 'ALLOWED' ? (
                          <Check className="w-5 h-5 text-success shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-danger shrink-0" />
                        )}
                        <div>
                          <span className="text-xs font-semibold text-text-primary block mb-1">{g.guardrail}</span>
                          <span className="text-[11px] text-text-secondary leading-relaxed">{g.explanation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-text-muted italic">Evidence unavailable.</p>
                )}
              </div>
              
              {/* Historical Evidence */}
              <div className="bg-background border border-border p-4 rounded-md">
                <span className="text-[10px] text-text-muted block uppercase font-bold tracking-wider mb-2">Historical evidence</span>
                {explanation.historical_evidence ? (
                  <p className="text-xs text-text-secondary leading-relaxed">{explanation.historical_evidence.explanation}</p>
                ) : (
                  <p className="text-xs text-text-muted italic">Evidence unavailable.</p>
                )}
              </div>
              
            </div>
            
            {/* Strategy Alternatives */}
            <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
              <SectionHeader title="Why not other strategies?" />
              <div className="space-y-3">
                {explanation.alternative_strategies.filter((s: any) => s.strategy_name !== explanation.strategy_selected).map((alt: any) => (
                  <div key={alt.strategy_name} className="bg-background border border-border p-4 rounded-md text-sm">
                    <span className="font-semibold text-text-primary block mb-2">Why not <span className="capitalize">{alt.strategy_name.replace(/_/g, ' ')}</span>?</span>
                    {alt.guardrail_status === 'BLOCKED' ? (
                      <span className="text-danger font-medium text-xs">Blocked by guardrails.</span>
                    ) : (
                      <span className="text-text-secondary text-xs leading-relaxed">
                        Expected net recovery (<MoneyValue amount={alt.expected_net_recovery} />) was lower than the selected strategy.
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Sidebar (1/3 width) - Outcomes & Timeline */}
          <div className="space-y-6">
            
            {/* Financial Outcome */}
            <div className="bg-surface border border-border rounded-lg p-6 space-y-5">
              <SectionHeader title="Financial outcome" />
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Expected recovery</span>
                  <span className="font-mono text-text-primary"><MoneyValue amount={explanation.expected_vs_actual.expected_recovery} /></span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Actual recovery</span>
                  <span className="font-mono font-bold text-success"><MoneyValue amount={explanation.expected_vs_actual.actual_recovery} /></span>
                </div>
                <div className="pt-3 border-t border-border flex justify-between items-center text-sm">
                  <span className="text-text-secondary font-bold">Variance</span>
                  <span className={`font-mono font-bold ${explanation.expected_vs_actual.variance >= 0 ? 'text-success' : 'text-danger'}`}>
                    {explanation.expected_vs_actual.variance >= 0 ? '+' : ''}<MoneyValue amount={explanation.expected_vs_actual.variance} />
                  </span>
                </div>
              </div>
            </div>

            {/* Evidence Timeline */}
            <div className="bg-surface border border-border rounded-lg p-6 space-y-5">
              <SectionHeader title="Chronological evidence timeline" />
              
              <div className="space-y-5">
                {explanation.timeline.map((evt: any, idx: number) => {
                  let colorClass = 'text-text-muted border-border bg-background';
                  let IconType = Clock;
                  
                  if (evt.status === 'COMPLETED' || evt.status === 'EXECUTED') {
                    colorClass = 'text-brand border-brand/30 bg-brand/10';
                    IconType = Check;
                  } else if (evt.status === 'FAILED') {
                    colorClass = 'text-danger border-danger/30 bg-danger/10';
                    IconType = XCircle;
                  } else if (evt.status === 'BLOCKED') {
                    colorClass = 'text-warning border-warning/30 bg-warning/10';
                    IconType = AlertTriangle;
                  }

                  return (
                    <div key={idx} className="relative pl-8 pb-1">
                      {idx < explanation.timeline.length - 1 && (
                        <span className="absolute left-[11px] top-[24px] bottom-[-24px] w-[2px] bg-border"></span>
                      )}
                      <span className={`absolute left-0 top-[2px] w-6 h-6 rounded-full border flex items-center justify-center z-10 ${colorClass}`}>
                        <IconType className="w-3.5 h-3.5" />
                      </span>
                      <div className="space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <span className="text-xs font-bold text-text-primary tracking-wide">{evt.title}</span>
                          <span className="text-[10px] text-text-muted font-mono bg-background px-1.5 py-0.5 rounded border border-border">
                            {new Date(evt.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary leading-relaxed">{evt.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {!loading && !error && !explanation && (
        <div className="flex flex-col items-center justify-center py-32 text-center bg-surface border border-border rounded-lg border-dashed">
          <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mb-5 border border-border shadow-sm">
            <Search className="w-6 h-6 text-text-muted" />
          </div>
          <h3 className="text-text-primary font-semibold text-lg mb-2">No Case Selected</h3>
          <p className="text-text-secondary text-sm max-w-sm leading-relaxed">
            Select a case from the dropdown above to view its complete deterministic reasoning and evidence chain.
          </p>
        </div>
      )}

    </div>
  );
}
