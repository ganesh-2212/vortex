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
