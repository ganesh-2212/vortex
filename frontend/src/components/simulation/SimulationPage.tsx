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
import { runRecoverySimulation, getLatestSimulation } from '../../api'

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

  const formatCurrency = (val: number | string) => {
    return `₹${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getOutcomeBadge = (outcome: string) => {
    if (outcome.toUpperCase() === 'RECOVERED') {
      return 'text-emerald-400 bg-emerald-950/20 border-emerald-500/20'
    }
    return 'text-gray-400 bg-gray-950/20 border-gray-500/20'
  }

  const inspectedCaseDetail = latestResult?.cases?.find(
    (c: any) => c.case_id === inspectedCaseId
  )

  return (
    <div className="space-y-6 text-left">
      
      {/* Simulation Warning Disclaimer Banner */}
      <div className="bg-amber-950/20 border border-amber-500/20 text-amber-300 p-4 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider font-mono">SIMULATION MODE ACTIVE — NO REAL TRANSACTIONS</h4>
          <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
            The simulator does not execute live payments, modify gateway ledgers, charge customer accounts, or transition production cases. All calculated recovery scenarios are projected for business value demonstration only.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column (2/3 width) - Setup Panel and Simulation Results */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Setup controls panel */}
          <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#202430] pb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-200">Simulation Batch Config</h3>
              </div>
              <span className="text-[10px] text-gray-500 font-mono">Active cases: {activeCases.length}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase block">Simulation Limit</label>
                <input
                  type="number"
                  min="1"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#1b1e28] text-xs text-gray-300 rounded border border-[#2e3445] p-2 outline-none focus:border-purple-500 transition font-mono"
                  disabled={simulating}
                />
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <button
                  onClick={handleRunSimulation}
                  disabled={simulating || selectedCaseIds.length === 0}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/40 text-white text-xs px-4 py-2.5 rounded font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  {simulating ? 'Simulating Projections...' : 'Execute Recovery Simulation'}
                </button>
              </div>
            </div>

            {/* Cases checklists */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Select Cases ({selectedCaseIds.length} checked)</span>
                <button
                  onClick={handleSelectAll}
                  disabled={simulating || activeCases.length === 0}
                  className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold transition cursor-pointer"
                >
                  {selectedCaseIds.length === activeCases.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {activeCases.length === 0 ? (
                <div className="text-xs text-gray-500 italic py-4 bg-[#1b1e28]/35 border border-[#2e3445]/50 rounded text-center">
                  No active open recovery cases found. Trigger webhook failures first.
                </div>
              ) : (
                <div className="bg-[#1b1e28]/35 border border-[#2e3445]/50 rounded max-h-36 overflow-y-auto divide-y divide-[#202430]/40 p-2 space-y-1">
                  {activeCases.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 p-1.5 hover:bg-[#202430]/35 rounded cursor-pointer select-none text-[11px] font-mono text-gray-300"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCaseIds.includes(c.id)}
                        onChange={() => handleToggleCase(c.id)}
                        disabled={simulating}
                        className="accent-purple-600"
                      />
                      <span className="truncate flex-1">Case #{c.id.substring(0, 8)}...</span>
                      <span className="text-gray-400 font-bold">{formatCurrency(c.amount_at_risk)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {simError && (
              <div className="bg-rose-950/20 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs">
                {simError}
              </div>
            )}
          </div>

          {/* Results Comparison Grid */}
          {latestResult && (
            <div className="space-y-6">
              
              {/* Aggregate Indicators grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#13151c] border border-[#202430] rounded-xl p-4">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">Total At Risk</span>
                  <span className="text-base font-bold text-gray-200 font-mono mt-1 block">
                    {formatCurrency(latestResult.total_revenue_at_risk)}
                  </span>
                </div>
                <div className="bg-[#13151c] border border-[#202430] rounded-xl p-4">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">Sentinel Recovery Rate</span>
                  <span className="text-base font-bold text-purple-400 font-mono mt-1 block">
                    {latestResult.sentinel_recovery_rate}%
                  </span>
                </div>
                <div className="bg-[#13151c] border border-[#202430] rounded-xl p-4">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">Intervention Cost</span>
                  <span className="text-base font-bold text-gray-400 font-mono mt-1 block">
                    {formatCurrency(latestResult.total_intervention_cost)}
                  </span>
                </div>
                <div className="bg-[#13151c] border border-[#202430] rounded-xl p-4">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">Cases Simulated</span>
                  <span className="text-base font-bold text-gray-200 font-mono mt-1 block">
                    {latestResult.number_of_simulated_cases} ({latestResult.number_of_simulated_successful_recoveries} recovered)
                  </span>
                </div>
              </div>

              {/* Incremental gains card */}
              <div className="bg-purple-950/15 border border-purple-500/20 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-purple-300">Incremental Revenue Proof</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#13151c]/70 border border-[#202430] p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block font-medium">vs No Intervention Baseline</span>
                      <span className="text-lg font-extrabold text-emerald-400 mt-1 block font-mono">
                        +{formatCurrency(latestResult.incremental_recovery_vs_no_intervention)}
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-emerald-500" />
                  </div>

                  <div className="bg-[#13151c]/70 border border-[#202430] p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block font-medium">vs Basic Retry Baseline</span>
                      <span className="text-lg font-extrabold text-purple-400 mt-1 block font-mono">
                        +{formatCurrency(latestResult.incremental_recovery_vs_basic_retry)}
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-purple-500" />
                  </div>
                </div>

                <div className="text-[10px] text-gray-400 leading-relaxed font-mono">
                  Additional Recovery Lift over basic strategy: <strong className="text-purple-300">+{latestResult.additional_recovery_percentage}%</strong>. Total Net Recovery Value: {formatCurrency(latestResult.sentinel_net_recovery)}.
                </div>
              </div>

              {/* Recovery Recovery Comparison table */}
              <div className="bg-[#13151c] border border-[#202430] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#202430] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-gray-200">Revenue Recovery Comparison</h3>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#202430] text-gray-400 font-medium">
                      <th className="py-3 pl-5">Recovery Policy Option</th>
                      <th className="py-3 text-right">Recovered Amount</th>
                      <th className="py-3 text-right pr-5">Estimated Lift</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#202430] font-mono">
                    <tr className="hover:bg-[#1a1c24]/30">
                      <td className="py-3 pl-5 font-semibold text-gray-400">No Intervention (Baseline)</td>
                      <td className="py-3 text-right text-gray-400">{formatCurrency(latestResult.no_intervention_recovered_amount)}</td>
                      <td className="py-3 text-right text-gray-500 pr-5">0.00%</td>
                    </tr>
                    <tr className="hover:bg-[#1a1c24]/30">
                      <td className="py-3 pl-5 font-semibold text-gray-300">Basic Retry Strategy</td>
                      <td className="py-3 text-right text-gray-300">{formatCurrency(latestResult.basic_retry_recovered_amount)}</td>
                      <td className="py-3 text-right text-purple-400 pr-5">
                        +{latestResult.basic_retry_recovered_amount > 0 ? '100' : '0'}%
                      </td>
                    </tr>
                    <tr className="bg-purple-950/10 font-bold border-l-2 border-purple-500">
                      <td className="py-3 pl-4 text-purple-300">Revenue Sentinel Optimized</td>
                      <td className="py-3 text-right text-emerald-400">{formatCurrency(latestResult.sentinel_recovered_amount)}</td>
                      <td className="py-3 text-right text-emerald-400 pr-5">
                        +{latestResult.sentinel_recovery_rate}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Case-level simulations table */}
              <div className="bg-[#13151c] border border-[#202430] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#202430]">
                  <h3 className="text-sm font-semibold text-gray-200">Simulated Batch Cases log</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#202430] text-gray-400 font-medium">
                        <th className="py-3 pl-5">Case Reference</th>
                        <th className="py-3 text-right">Risk Amount</th>
                        <th className="py-3 text-center">Risk Level</th>
                        <th className="py-3">Sentinel Strategy</th>
                        <th className="py-3 text-right">Net Recovery</th>
                        <th className="py-3 text-right pr-5">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#202430]">
                      {latestResult.cases.map((c: any) => {
                        const isInspected = inspectedCaseId === c.case_id
                        return (
                          <tr
                            key={c.case_id}
                            onClick={() => setInspectedCaseId(c.case_id)}
                            className={`hover:bg-[#1a1c24]/50 cursor-pointer transition ${
                              isInspected ? 'bg-purple-950/10' : ''
                            }`}
                          >
                            <td className="py-3 pl-5 font-mono text-purple-300 font-medium">
                              #{c.case_id.substring(0, 8)}...
                            </td>
                            <td className="py-3 text-right font-mono text-gray-300">
                              {formatCurrency(c.amount_at_risk)}
                            </td>
                            <td className="py-3 text-center">
                              <span className="text-[10px] font-semibold text-gray-400 bg-gray-900 border border-gray-800 px-1.5 py-0.5 rounded uppercase">
                                {c.risk_level}
                              </span>
                            </td>
                            <td className="py-3 font-semibold text-gray-200 text-[10px] uppercase">
                              {c.sentinel_strategy.replace(/_/g, ' ')}
                            </td>
                            <td className="py-3 text-right font-mono text-emerald-400 font-bold">
                              {formatCurrency(c.sentinel_net_recovered)}
                            </td>
                            <td className="py-3 text-right pr-5 text-purple-400">
                              <ChevronRight className="w-4 h-4 ml-auto" />
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

        {/* Right Column (1/3 width) - Case diagnostics detail inspector */}
        <div className="space-y-6">
          <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 space-y-4 text-left">
            <div className="border-b border-[#202430] pb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-200">Simulation Inspector</h3>
              </div>
            </div>

            {inspectedCaseDetail ? (
              <div className="space-y-4 text-xs">
                <div className="bg-[#1b1e28] rounded border border-[#2e3445] p-3 font-mono space-y-2 text-gray-300">
                  <div className="border-b border-[#2e3445]/60 pb-1.5 text-[10px] text-gray-500">
                    Case UUID: {inspectedCaseDetail.case_id}
                  </div>
                  <div className="flex justify-between">
                    <span>Amount at Risk:</span>
                    <span className="font-bold text-gray-200">{formatCurrency(inspectedCaseDetail.amount_at_risk)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Risk Severity:</span>
                    <span className="font-bold text-gray-200">{inspectedCaseDetail.risk_level}</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Policy Comparison</span>
                  
                  <div className="space-y-2 font-mono">
                    <div className="bg-[#1b1e28]/40 border border-[#202430] p-2.5 rounded flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-gray-500 block uppercase">No Intervention</span>
                        <span className="text-xs font-bold text-gray-300">{formatCurrency(inspectedCaseDetail.no_intervention_recovered)}</span>
                      </div>
                      <span className="text-[9px] text-gray-500">Rate: 0%</span>
                    </div>

                    <div className="bg-[#1b1e28]/40 border border-[#202430] p-2.5 rounded flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-gray-500 block uppercase">Basic Retry Strategy</span>
                        <span className="text-xs font-bold text-gray-300">{formatCurrency(inspectedCaseDetail.basic_retry_recovered)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-gray-400 block uppercase">{inspectedCaseDetail.basic_retry_strategy.replace(/_/g, ' ')}</span>
                        <span className="text-[9px] text-gray-500">Cost: {formatCurrency(inspectedCaseDetail.basic_retry_cost)}</span>
                      </div>
                    </div>

                    <div className="bg-purple-950/10 border border-purple-500/20 p-2.5 rounded flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-purple-400 block uppercase">Sentinel Optimized</span>
                        <span className="text-xs font-bold text-emerald-400">{formatCurrency(inspectedCaseDetail.sentinel_recovered)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-purple-300 block uppercase">{inspectedCaseDetail.sentinel_strategy.replace(/_/g, ' ')}</span>
                        <span className="text-[9px] text-purple-400 font-bold">Prob: {inspectedCaseDetail.sentinel_probability}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-950/15 border border-purple-500/20 rounded p-3 font-mono space-y-1.5 text-[10px] text-purple-300">
                  <div className="flex justify-between">
                    <span>Sentinel Net Recovery:</span>
                    <span>{formatCurrency(inspectedCaseDetail.sentinel_net_recovered)}</span>
                  </div>
                  <div className="flex justify-between border-t border-purple-500/10 pt-1">
                    <span>Lift vs Basic Retry:</span>
                    <span className="font-bold text-emerald-400">+{formatCurrency(inspectedCaseDetail.incremental_vs_basic_retry)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outcome:</span>
                    <span className={`px-1 rounded border text-[9px] uppercase font-bold ${getOutcomeBadge(inspectedCaseDetail.final_outcome)}`}>
                      {inspectedCaseDetail.final_outcome}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500 italic text-xs">
                Select a simulated case from the batch list to inspect baseline vs Sentinel recovery lifts.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
