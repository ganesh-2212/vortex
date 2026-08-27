import { API_BASE_URL } from '../config'

export async function getIntelligenceSummary() {
  const res = await fetch(`${API_BASE_URL}/api/v1/intelligence/summary`)
  if (!res.ok) throw new Error('Failed to fetch intelligence summary')
  return res.json()
}

export async function getLeakage() {
  const res = await fetch(`${API_BASE_URL}/api/v1/intelligence/leakage`)
  if (!res.ok) throw new Error('Failed to fetch leakage details')
  return res.json()
}

export async function getPriorities() {
  const res = await fetch(`${API_BASE_URL}/api/v1/intelligence/priorities`)
  if (!res.ok) throw new Error('Failed to fetch priority cases')
  return res.json()
}

export async function getRecoveryCases() {
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-cases`)
  if (!res.ok) throw new Error('Failed to fetch recovery cases')
  return res.json()
}

export async function getCaseDetail(caseId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-cases/${caseId}`)
  if (!res.ok) throw new Error('Failed to fetch case detail')
  return res.json()
}

export async function getCaseLifecycle(caseId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-cases/${caseId}/lifecycle`)
  if (!res.ok) throw new Error('Failed to fetch case lifecycle metrics')
  return res.json()
}

export async function getCaseAttempts(caseId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-cases/${caseId}/attempts`)
  if (!res.ok) throw new Error('Failed to fetch case execution attempts')
  return res.json()
}

export async function getRecoveryStatistics() {
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-statistics`)
  if (!res.ok) throw new Error('Failed to fetch recovery outcome statistics')
  return res.json()
}

export async function getRecommendations() {
  const res = await fetch(`${API_BASE_URL}/api/v1/recommendations`)
  if (!res.ok) throw new Error('Failed to fetch active recommendations')
  return res.json()
}

export async function getRecommendation(caseId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-cases/${caseId}/recommendation`)
  if (!res.ok) throw new Error('Failed to fetch case recommendation details')
  return res.json()
}

export async function getRevenueEvents() {
  const res = await fetch(`${API_BASE_URL}/api/v1/revenue-events`)
  if (!res.ok) throw new Error('Failed to fetch revenue events')
  return res.json()
}

export async function getAuditLogs() {
  const res = await fetch(`${API_BASE_URL}/api/v1/audit-logs`)
  if (!res.ok) throw new Error('Failed to fetch system audit logs')
  return res.json()
}

export async function proposeRecoveryAction(caseId: string, actionType: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-cases/${caseId}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action_type: actionType })
  })
  if (!res.ok) throw new Error('Failed to propose action under guardrails')
  return res.json()
}

export async function executeRecoveryAction(caseId: string, actionId: string, simulateFailure: boolean) {
  const payload: Record<string, any> = {}
  if (simulateFailure) {
    payload.simulate_failure = true
    payload.error_code = 'INSUFFICIENT_FUNDS'
  }
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-cases/${caseId}/actions/${actionId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload })
  })
  if (!res.ok) {
    const errData = await res.json()
    throw new Error(errData.detail || 'Execution rejected by guardrails')
  }
  return res.json()
}

export async function getMerchantConfig(merchantId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/merchants/${merchantId}/config`)
  if (!res.ok) throw new Error('Failed to fetch merchant configuration')
  return res.json()
}

export async function updateMerchantConfig(merchantId: string, config: any) {
  const res = await fetch(`${API_BASE_URL}/api/v1/merchants/${merchantId}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
  if (!res.ok) {
    const errData = await res.json()
    throw new Error(errData.detail || 'Failed to update merchant configuration')
  }
  return res.json()
}

export async function getProviderInfo() {
  const res = await fetch(`${API_BASE_URL}/api/v1/provider-info`)
  if (!res.ok) throw new Error('Failed to fetch payment provider details')
  return res.json()
}

export interface SimulatePaymentEventRequest {
  event: 'payment.failed' | 'payment.captured'
  amount: number
  currency?: string
  payment_id: string
  email?: string
  contact?: string
}

export interface SimulatePaymentEventResponse {
  webhook_accepted: boolean
  event: string
  payment_id: string
  amount: number
  currency: string
  result_status: string
  event_id?: string
  case_id?: string
  message?: string
}

export async function simulatePaymentEvent(payload: SimulatePaymentEventRequest) {
  const res = await fetch(`${API_BASE_URL}/api/v1/webhooks/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Failed to simulate payment webhook event')
  }
  return res.json() as Promise<SimulatePaymentEventResponse>
}

export async function getCaseStrategy(caseId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-cases/${caseId}/strategy`)
  if (!res.ok) throw new Error('Failed to fetch case recovery strategy')
  return res.json()
}

export async function getStrategyOptimization() {
  const res = await fetch(`${API_BASE_URL}/api/v1/strategy-optimization`)
  if (!res.ok) throw new Error('Failed to fetch strategy optimizations')
  return res.json()
}

export async function getStrategyStatistics() {
  const res = await fetch(`${API_BASE_URL}/api/v1/strategy-statistics`)
  if (!res.ok) throw new Error('Failed to fetch strategy statistics')
  return res.json()
}

export async function runRecoverySimulation(payload: { case_ids: string[] }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-simulation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to run recovery simulation')
  return res.json()
}

export async function getLatestSimulation() {
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-simulation/latest`)
  if (!res.ok) throw new Error('Failed to fetch latest simulation')
  return res.json()
}

export async function getSimulationStatistics() {
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-simulation/statistics`)
  if (!res.ok) throw new Error('Failed to fetch simulation statistics')
  return res.json()
}

export async function evaluateOrchestration(caseId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-cases/${caseId}/orchestration/evaluate`, {
    method: 'POST'
  })
  if (!res.ok) throw new Error('Failed to evaluate recovery orchestration')
  return res.json()
}

export async function getOrchestrationState(caseId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-cases/${caseId}/orchestration`)
  if (!res.ok) throw new Error('Failed to fetch orchestration state')
  return res.json()
}

export async function getStrategyPerformance() {
  const res = await fetch(`${API_BASE_URL}/api/v1/strategy-performance`)
  if (!res.ok) throw new Error('Failed to fetch strategy performance')
  return res.json()
}

export async function getStrategyPerformanceByType(strategyType: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/strategy-performance/${strategyType}`)
  if (!res.ok) throw new Error('Failed to fetch detailed strategy performance')
  return res.json()
}

export async function getStrategyPerformanceByEventType() {
  const res = await fetch(`${API_BASE_URL}/api/v1/strategy-performance/by-event-type`)
  if (!res.ok) throw new Error('Failed to fetch strategy performance by event type')
  return res.json()
}

export async function getStrategyPerformanceRecommendation(caseId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/strategy-performance/recommendation/${caseId}`)
  if (!res.ok) throw new Error('Failed to fetch historical strategy recommendation')
  return res.json()
}

export async function getDecisionExplanation(caseId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-cases/${caseId}/explanation`)
  if (!res.ok) throw new Error('Failed to fetch decision explanation')
  return res.json()
}

export async function getDecisionTimeline(caseId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-cases/${caseId}/explanation/timeline`)
  if (!res.ok) throw new Error('Failed to fetch decision timeline')
  return res.json()
}

export async function getDecisionGuardrails(caseId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/recovery-cases/${caseId}/explanation/guardrails`)
  if (!res.ok) throw new Error('Failed to fetch decision guardrails')
  return res.json()
}

export async function getMerchantCommandCenter(merchantId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/merchant-command-center?merchant_id=${merchantId}`)
  if (!res.ok) throw new Error('Failed to fetch merchant command center data')
  return res.json()
}
