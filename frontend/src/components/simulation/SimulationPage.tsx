import { useState, useEffect } from 'react'
import {
  TrendingUp,
  AlertTriangle,
  Play,
  FileText,
  BarChart2,
  ChevronRight,
  ArrowRight
} from 'lucide-react'
import { runRecoverySimulation, getLatestSimulation, runRecoveryBenchmark } from '../../api'
import { formatCurrency } from '../../utils/formatters'

interface SimulationPageProps {
  cases: any[]
}

export default function SimulationPage({ cases }: SimulationPageProps) {
  const activeCases = cases.filter(
    (c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS' || c.status === 'ESCALATED'
  )

  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>(activeCases.map((c) => c.id))
  const [batchSize, setBatchSize] = useState(Math.max(5, activeCases.length))
  const [simulating, setSimulating] = useState(false)
  const [latestResult, setLatestResult] = useState<any>(null)
  const [simError, setSimError] = useState<string | null>(null)
  const [inspectedCaseId, setInspectedCaseId] = useState<string | null>(null)

  // Benchmark State
  const [runningBenchmark, setRunningBenchmark] = useState(false)
  const [benchmarkResult, setBenchmarkResult] = useState<any>(null)
  const [benchmarkCases, setBenchmarkCases] = useState<number>(500)
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null)

  useEffect(() => {
    async function loadLatest() {
      try {
        const res = await getLatestSimulation()
        setLatestResult(res)
      } catch (err) {
        // Suppress 404/400 errors for fresh systems
      }
    }
    loadLatest()
  }, [])

  // Auto update selected list if cases list changes
  useEffect(() => {
    setSelectedCaseIds(activeCases.map((c) => c.id))
    setBatchSize(activeCases.length)
  }, [cases])

  const handleToggleCase = (id: string) => {
    if (selectedCaseIds.includes(id)) {
      setSelectedCaseIds(selectedCaseIds.filter((cid) => cid !== id))
    } else {
      setSelectedCaseIds([...selectedCaseIds, id])
    }
  }

  const handleSelectAll = () => {
    if (selectedCaseIds.length === activeCases.length) {
      setSelectedCaseIds([])
    } else {
      setSelectedCaseIds(activeCases.map((c) => c.id))
    }
  }

  const handleRunSimulation = async () => {
    setSimulating(true)
    setSimError(null)
    setInspectedCaseId(null)
    try {
      const sliceIds = selectedCaseIds.slice(0, batchSize)
      const res = await runRecoverySimulation({ case_ids: sliceIds })
      setLatestResult(res)
    } catch (err: any) {
      console.error(err)
      setSimError(err.message || 'Failed to execute recovery simulation run.')
    } finally {
      setSimulating(false)
    }
  }

  const handleRunBenchmark = async () => {
    setRunningBenchmark(true)
    setBenchmarkError(null)
    try {
      const res = await runRecoveryBenchmark(benchmarkCases, 42)
      setBenchmarkResult(res)
    } catch (err: any) {
      console.error(err)
      setBenchmarkError(err.message || 'Failed to execute recovery benchmark.')
    } finally {
      setRunningBenchmark(false)
    }
  }

  const getOutcomeBadge = (outcome: string) => {
    if (outcome.toUpperCase() === 'RECOVERED') {
      return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    }
    return 'text-slate-600 bg-gray-50 border-slate-200'
  }

  const inspectedCaseDetail = latestResult?.cases?.find(
    (c: any) => c.case_id === inspectedCaseId
  )

  return (
    <div className="space-y-8 text-left pb-12 w-full max-w-6xl mx-auto">
      
      {/* Simulation Warning Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200 text-amber-900 p-6 rounded-xl flex items-start gap-4 shadow-sm">
        <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" strokeWidth={2.5} />
        <div className="flex flex-col gap-1.5">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-amber-800">SIMULATION MODE ACTIVE — NO REAL TRANSACTIONS</h4>
          <p className="text-[13px] font-medium text-amber-900 leading-relaxed">
            The simulator does not execute live payments, modify gateway ledgers, charge customer accounts, or transition production cases. All calculated recovery scenarios are projected for business value demonstration only.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
        
        {/* Left Column (2/3 width) - Setup Panel and Simulation Results */}
        <div className="space-y-8">
          
          {/* Setup controls panel */}
          <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <BarChart2 className="w-5 h-5 text-purple-600" />
                <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">Simulation Batch Config</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Active cases: {activeCases.length}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Simulation Limit</label>
                <input
                  type="number"
                  min="1"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 text-[15px] tabular-nums text-slate-900 rounded-lg border border-slate-200 p-3 outline-none focus:border-purple-500 focus:bg-white transition-all shadow-sm"
                  disabled={simulating}
                />
              </div>

              <div className="flex flex-col justify-end">
                <button
                  onClick={handleRunSimulation}
                  disabled={simulating || selectedCaseIds.length === 0}
                  className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-400 text-white text-[13px] font-bold uppercase tracking-wider px-6 py-3.5 rounded-lg transition-all flex items-center justify-center gap-3 shadow-sm"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {simulating ? 'Simulating Projections...' : 'Execute Recovery Simulation'}
                </button>
              </div>
            </div>

            {/* Cases checklists */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Cases ({selectedCaseIds.length} checked)</span>
                <button
                  onClick={handleSelectAll}
                  disabled={simulating || activeCases.length === 0}
                  className="text-[11px] text-purple-700 hover:text-purple-900 font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {selectedCaseIds.length === activeCases.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {activeCases.length === 0 ? (
                <div className="text-[13px] text-slate-400 font-medium italic py-8 bg-slate-50 border border-slate-200 rounded-xl text-center shadow-inner">
                  No active open recovery cases found. Trigger webhook failures first.
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1 shadow-sm">
                  {activeCases.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg cursor-pointer select-none text-[13px] tabular-nums font-medium text-slate-600 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCaseIds.includes(c.id)}
                        onChange={() => handleToggleCase(c.id)}
                        disabled={simulating}
                        className="accent-slate-900 w-4 h-4 rounded border-slate-300"
                      />
                      <span className="truncate flex-1 min-w-0 text-slate-900">Case #{c.id.substring(0, 8)}...</span>
                      <span className="text-slate-900 font-bold">{formatCurrency(c.amount_at_risk)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {simError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-5 rounded-xl text-[13px] font-medium shadow-sm">
                {simError}
              </div>
            )}
          </div>

          {/* Results Comparison Grid */}
          {latestResult && (
            <div className="space-y-8">
              
              {/* Aggregate Indicators grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 transition-colors">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Total At Risk</span>
                  <span className="text-2xl font-bold text-slate-900 proportional-nums tracking-tight">
                    {formatCurrency(latestResult.total_revenue_at_risk)}
                  </span>
                </div>
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 transition-colors">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Sentinel Recovery Rate</span>
                  <span className="text-2xl font-bold text-purple-700 proportional-nums tracking-tight">
                    {latestResult.sentinel_recovery_rate}%
                  </span>
                </div>
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 transition-colors">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Intervention Cost</span>
                  <span className="text-2xl font-bold text-slate-600 proportional-nums tracking-tight">
                    {formatCurrency(latestResult.total_intervention_cost)}
                  </span>
                </div>
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 transition-colors">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Cases Simulated</span>
                  <span className="text-2xl font-bold text-slate-900 proportional-nums tracking-tight">
                    {latestResult.number_of_simulated_cases} <span className="text-[15px] font-medium text-slate-500">({latestResult.number_of_simulated_successful_recoveries} rec)</span>
                  </span>
                </div>
              </div>

              {/* Incremental gains card */}
              <div className="bg-purple-50/50 rounded-xl p-8 space-y-8 border border-purple-200 shadow-sm">
                <h3 className="text-[17px] font-bold text-purple-900 tracking-tight">Incremental Revenue Proof</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-purple-100">
                  <div className="bg-white border border-slate-200 p-6 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">vs No Intervention Baseline</span>
                      <span className="text-3xl font-bold text-emerald-600 proportional-nums tracking-tight">
                        +{formatCurrency(latestResult.incremental_recovery_vs_no_intervention)}
                      </span>
                    </div>
                    <ArrowRight className="w-8 h-8 text-emerald-500" strokeWidth={2} />
                  </div>

                  <div className="bg-white border border-slate-200 p-6 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">vs Basic Retry Baseline</span>
                      <span className="text-3xl font-bold text-purple-700 proportional-nums tracking-tight">
                        +{formatCurrency(latestResult.incremental_recovery_vs_basic_retry)}
                      </span>
                    </div>
                    <ArrowRight className="w-8 h-8 text-purple-500" strokeWidth={2} />
                  </div>
                </div>

                <div className="text-[13px] font-medium text-slate-600 leading-relaxed tabular-nums bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  Additional Recovery Lift over basic strategy: <strong className="text-purple-700 font-bold">+{latestResult.additional_recovery_percentage}%</strong>. Total Net Recovery Value: {formatCurrency(latestResult.sentinel_net_recovery)}.
                </div>
              </div>

              {/* Revenue Recovery Comparison table */}
              <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
                <h3 className="text-[17px] font-bold text-slate-900 mb-6 tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Revenue Recovery Comparison
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400">
                        <th className="py-4 pl-4 text-[11px] font-bold uppercase tracking-wider">Recovery Policy Option</th>
                        <th className="py-4 text-right text-[11px] font-bold uppercase tracking-wider">Recovered Amount</th>
                        <th className="py-4 text-right pr-4 text-[11px] font-bold uppercase tracking-wider">Estimated Lift</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[13px] tabular-nums">
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-5 pl-4 font-bold text-slate-500 font-sans uppercase tracking-tight">No Intervention (Baseline)</td>
                        <td className="py-5 text-right font-medium text-slate-500">{formatCurrency(latestResult.no_intervention_recovered_amount)}</td>
                        <td className="py-5 text-right font-medium text-slate-400 pr-4">0.00%</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-5 pl-4 font-bold text-slate-900 font-sans uppercase tracking-tight">Basic Retry Strategy</td>
                        <td className="py-5 text-right font-medium text-slate-700">{formatCurrency(latestResult.basic_retry_recovered_amount)}</td>
                        <td className="py-5 text-right text-purple-700 pr-4 font-bold tracking-tight">
                          +{latestResult.basic_retry_recovered_amount > 0 ? '100' : '0'}%
                        </td>
                      </tr>
                      <tr className="bg-purple-50/30 transition-colors">
                        <td className="py-5 pl-4 text-purple-900 font-bold font-sans uppercase tracking-tight flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          FLOWMINT Optimized
                        </td>
                        <td className="py-5 text-right text-emerald-600 font-bold tracking-tight">{formatCurrency(latestResult.sentinel_recovered_amount)}</td>
                        <td className="py-5 text-right text-emerald-600 font-bold pr-4 tracking-tight">
                          +{latestResult.sentinel_recovery_rate}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Case-level simulations table */}
              <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
                <h3 className="text-[17px] font-bold text-slate-900 mb-6 tracking-tight">Simulated Batch Cases log</h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400">
                        <th className="py-4 pl-4 text-[11px] font-bold uppercase tracking-wider">Case Reference</th>
                        <th className="py-4 text-right text-[11px] font-bold uppercase tracking-wider">Risk Amount</th>
                        <th className="py-4 text-center text-[11px] font-bold uppercase tracking-wider">Risk Level</th>
                        <th className="py-4 text-[11px] font-bold uppercase tracking-wider">Sentinel Strategy</th>
                        <th className="py-4 text-right text-[11px] font-bold uppercase tracking-wider">Net Recovery</th>
                        <th className="py-4 text-right pr-4 text-[11px] font-bold uppercase tracking-wider">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[13px]">
                      {latestResult.cases.map((c: any) => {
                        const isInspected = inspectedCaseId === c.case_id
                        return (
                          <tr
                            key={c.case_id}
                            onClick={() => setInspectedCaseId(c.case_id)}
                            className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                              isInspected ? 'bg-purple-50/30' : ''
                            }`}
                          >
                            <td className="py-5 pl-4 tabular-nums text-purple-700 font-bold uppercase tracking-widest">
                              #{c.case_id.substring(0, 8)}
                            </td>
                            <td className="py-5 text-right tabular-nums text-slate-900 font-medium">
                              {formatCurrency(c.amount_at_risk)}
                            </td>
                            <td className="py-5 text-center">
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded uppercase tracking-wider">
                                {c.risk_level}
                              </span>
                            </td>
                            <td className="py-5 font-bold text-slate-900 uppercase tracking-tight">
                              {c.sentinel_strategy.replace(/_/g, ' ')}
                            </td>
                            <td className="py-5 text-right tabular-nums text-emerald-600 font-bold tracking-tight">
                              {formatCurrency(c.sentinel_net_recovered)}
                            </td>
                            <td className="py-5 text-right pr-4 text-purple-600">
                              <ChevronRight className="w-5 h-5 ml-auto" strokeWidth={2.5} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Inspector detailed view */}
        <div className="space-y-8">
          <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-8 text-left">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-600" />
                <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">Simulation Inspector</h3>
              </div>
            </div>

            {inspectedCaseDetail ? (
              <div className="space-y-8 text-[13px] pt-6 border-t border-slate-100">
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 tabular-nums space-y-4 shadow-sm">
                  <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Case UUID</span>
                    <span className="text-[13px] font-medium text-slate-900">{inspectedCaseDetail.case_id}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-500 uppercase tracking-wider font-bold text-[11px]">Amount at Risk:</span>
                    <span className="font-bold text-slate-900 text-[15px]">{formatCurrency(inspectedCaseDetail.amount_at_risk)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 uppercase tracking-wider font-bold text-[11px]">Risk Severity:</span>
                    <span className="font-bold text-slate-900 text-[13px] uppercase tracking-widest">{inspectedCaseDetail.risk_level}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wider">Policy Comparison</span>
                  
                  <div className="space-y-4 tabular-nums text-[13px]">
                    <div className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center shadow-sm hover:border-slate-300 transition-colors">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-slate-400 block uppercase font-sans font-bold tracking-wider">No Intervention</span>
                        <span className="text-[15px] font-bold text-slate-900">{formatCurrency(inspectedCaseDetail.no_intervention_recovered)}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-sans font-bold uppercase tracking-wider">Rate: 0%</span>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center shadow-sm hover:border-slate-300 transition-colors">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-slate-400 block uppercase font-sans font-bold tracking-wider">Basic Retry Strategy</span>
                        <span className="text-[15px] font-bold text-slate-900">{formatCurrency(inspectedCaseDetail.basic_retry_recovered)}</span>
                      </div>
                      <div className="flex flex-col text-right gap-1">
                        <span className="text-[11px] text-slate-700 block uppercase font-sans font-bold tracking-wider">{inspectedCaseDetail.basic_retry_strategy.replace(/_/g, ' ')}</span>
                        <span className="text-[11px] text-slate-400 font-sans font-bold uppercase tracking-wider">Cost: {formatCurrency(inspectedCaseDetail.basic_retry_cost)}</span>
                      </div>
                    </div>

                    <div className="bg-purple-50/50 border border-purple-200 p-5 rounded-xl flex justify-between items-center shadow-sm">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-purple-700 block uppercase font-sans font-bold tracking-wider">Sentinel Optimized</span>
                        <span className="text-[15px] font-bold text-emerald-600 tracking-tight">{formatCurrency(inspectedCaseDetail.sentinel_recovered)}</span>
                      </div>
                      <div className="flex flex-col text-right gap-1">
                        <span className="text-[11px] text-purple-800 block uppercase font-sans font-bold tracking-wider">{inspectedCaseDetail.sentinel_strategy.replace(/_/g, ' ')}</span>
                        <span className="text-[11px] text-purple-600 font-sans font-bold uppercase tracking-wider">Prob: {inspectedCaseDetail.sentinel_probability}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 tabular-nums space-y-4 text-[13px] text-purple-900 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[11px] font-sans uppercase tracking-wider text-purple-700">Sentinel Net Recovery:</span>
                    <span className="font-bold text-[15px] tracking-tight">{formatCurrency(inspectedCaseDetail.sentinel_net_recovered)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-purple-200 pt-4">
                    <span className="font-bold text-[11px] font-sans uppercase tracking-wider text-purple-700">Lift vs Basic Retry:</span>
                    <span className="font-bold text-emerald-600 text-[15px] tracking-tight">+{formatCurrency(inspectedCaseDetail.incremental_vs_basic_retry)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-[11px] font-sans uppercase tracking-wider text-purple-700">Outcome:</span>
                    <span className={`px-3 py-1.5 rounded text-[10px] font-sans uppercase font-bold tracking-wider ${getOutcomeBadge(inspectedCaseDetail.final_outcome)}`}>
                      {inspectedCaseDetail.final_outcome}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-24 text-slate-400 italic text-[13px] font-medium border-t border-slate-100 pt-16">
                Select a simulated case from the batch list to inspect baseline vs Sentinel recovery lifts.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* RECOVERY PROOF / BATCH BENCHMARK SECTION */}
      <div className="pt-16 mt-8 border-t border-slate-200">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-purple-600" strokeWidth={2.5} />
              <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">Recovery Proof</h2>
            </div>
            <p className="text-[13px] text-slate-500 font-medium">Measured recovery performance from a deterministic synthetic evaluation.</p>
          </div>
          <span className="text-[11px] font-bold px-3 py-1.5 rounded uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200">
            SYNTHETIC EVALUATION
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-8 text-left">
          <div className="flex flex-col md:flex-row gap-6 items-end border-b border-slate-100 pb-8">
            <div className="flex flex-col gap-2 w-full md:w-48">
              <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Evaluation Cases</label>
              <select
                value={benchmarkCases}
                onChange={(e) => setBenchmarkCases(parseInt(e.target.value))}
                disabled={runningBenchmark}
                className="w-full bg-slate-50 text-[15px] font-medium text-slate-900 rounded-lg border border-slate-200 p-3 outline-none focus:border-purple-500 focus:bg-white transition-all cursor-pointer disabled:opacity-50"
              >
                <option value={100}>100 Cases</option>
                <option value={250}>250 Cases</option>
                <option value={500}>500 Cases (Default)</option>
                <option value={1000}>1000 Cases</option>
              </select>
            </div>
            <button
              onClick={handleRunBenchmark}
              disabled={runningBenchmark}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-[13px] font-bold uppercase tracking-wider px-6 py-3.5 rounded-lg transition-all flex items-center justify-center gap-3 shadow-sm h-[50px] whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              {runningBenchmark ? 'Evaluating...' : 'Run Recovery Evaluation'}
            </button>
          </div>

          {benchmarkError && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-[13px] font-medium border border-red-200">
              {benchmarkError}
            </div>
          )}

          {benchmarkResult && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* PRIMARY METRICS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Revenue Recovered</span>
                  <span className="text-[24px] font-bold text-emerald-600 tracking-tight">{formatCurrency(benchmarkResult.metrics.recovered_revenue)}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Revenue at Risk</span>
                  <span className="text-[24px] font-bold text-slate-900 tracking-tight">{formatCurrency(benchmarkResult.metrics.total_revenue_at_risk)}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Recovery Rate</span>
                  <span className="text-[24px] font-bold text-purple-600 tracking-tight">{benchmarkResult.metrics.recovery_rate.toFixed(1)}%</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cases Evaluated</span>
                  <span className="text-[24px] font-bold text-slate-900 tracking-tight tabular-nums">{benchmarkResult.metrics.cases_evaluated}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* STRATEGY COMPARISON */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-4">Strategy Comparison</h3>
                  <div className="space-y-6">
                    {benchmarkResult.strategy_comparisons.map((comp: any) => (
                      <div key={comp.name} className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-[13px] font-bold text-slate-700">{comp.name}</span>
                          <span className="text-[13px] font-bold text-slate-900">{comp.recovery_rate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${comp.name === 'FLOWMINT' ? 'bg-purple-600' : 'bg-slate-400'}`}
                            style={{ width: `${comp.recovery_rate}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-medium text-slate-500">
                          <span>{formatCurrency(comp.recovered_revenue)}</span>
                          <span>{comp.successful_recoveries} recovered</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SAFETY PANEL */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-4">Recovery Safety</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col gap-1">
                      <span className="text-[20px] font-bold text-rose-600 tabular-nums">{benchmarkResult.safety.guardrail_violations}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Guardrail Violations</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col gap-1">
                      <span className="text-[20px] font-bold text-amber-600 tabular-nums">{benchmarkResult.safety.unsafe_actions_blocked}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Unsafe Actions Blocked</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col gap-1">
                      <span className="text-[20px] font-bold text-indigo-600 tabular-nums">{benchmarkResult.safety.human_escalations}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Human Escalations</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col gap-1">
                      <span className="text-[20px] font-bold text-slate-700 tabular-nums">{benchmarkResult.safety.stopped_cases}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Stopped Cases</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* REPRODUCIBILITY */}
              <div className="flex items-center gap-6 pt-6 border-t border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="text-slate-300">ID:</span> {benchmarkResult.evaluation_id}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-slate-300">SEED:</span> {benchmarkResult.seed}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-slate-300">EVALUATED:</span> {new Date(benchmarkResult.evaluated_at).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
