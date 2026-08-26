import { useState, useEffect } from 'react'
import { Activity, ShieldCheck, Copy, Code, AlertCircle, Zap, CheckCircle2, Loader2 } from 'lucide-react'
import { simulatePaymentEvent, type SimulatePaymentEventResponse } from '../../api'

interface WebhooksPageProps {
  events: any[]
  providerInfo: any
  onRefresh: () => Promise<void>
}

function generatePaymentId() {
  return `pay_demo_${Date.now()}`
}

export default function WebhooksPage({ events, providerInfo, onRefresh }: WebhooksPageProps) {
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  const [eventType, setEventType] = useState<'payment.failed' | 'payment.captured'>('payment.failed')
  const [amount, setAmount] = useState(5000)
  const [email, setEmail] = useState('demo@merchant.test')
  const [contact, setContact] = useState('9876543210')
  const [paymentId, setPaymentId] = useState(generatePaymentId)
  const [simulating, setSimulating] = useState(false)
  const [simulateError, setSimulateError] = useState<string | null>(null)
  const [simulateResult, setSimulateResult] = useState<SimulatePaymentEventResponse | null>(null)

  const isMockMode = providerInfo?.mode === 'mock'

  const webhookEvents = events.filter(
    (e) =>
      e.event_type === 'PAYMENT_FAILED' ||
      e.event_type === 'PAYMENT_AUTHORIZED' ||
      e.event_type === 'PAYMENT_CAPTURED' ||
      e.event_type === 'PAYMENT_RETRY' ||
      e.event_type === 'SUBSCRIPTION_CANCELLED'
  )

  useEffect(() => {
    setPaymentId(generatePaymentId())
  }, [])

  const handleCopyJson = (json: string) => {
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSimulate = async (event: 'payment.failed' | 'payment.captured') => {
    if (!isMockMode) return

    setSimulating(true)
    setSimulateError(null)
    setSimulateResult(null)
    setEventType(event)

    try {
      const result = await simulatePaymentEvent({
        event,
        amount,
        currency: 'INR',
        payment_id: paymentId,
        email,
        contact,
      })
      setSimulateResult(result)
      setPaymentId(generatePaymentId())
      await onRefresh()
    } catch (err: any) {
      setSimulateError(err.message || 'Failed to simulate payment event')
    } finally {
      setSimulating(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'VERIFIED':
      case 'PROCESSED':
      case 'SUCCESS':
        return 'text-emerald-400 bg-emerald-950/20 border-emerald-500/20'
      case 'DUPLICATE':
        return 'text-yellow-400 bg-yellow-950/20 border-yellow-500/20'
      case 'UNHANDLED':
        return 'text-gray-400 bg-gray-950/20 border-gray-500/20'
      case 'FAILED':
        return 'text-rose-400 bg-rose-950/20 border-rose-500/20'
      default:
        return 'text-purple-400 bg-purple-950/20 border-purple-500/20'
    }
  }

  return (
    <div className="space-y-6 text-left">
      {/* Payment Event Simulator */}
      <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#202430] pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-gray-200">Payment Event Simulator</h3>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
            isMockMode
              ? 'text-emerald-400 bg-emerald-950/20 border-emerald-500/20'
              : 'text-gray-400 bg-gray-950/20 border-gray-500/20'
          }`}>
            {isMockMode ? 'Mock Mode' : 'Production Mode'}
          </span>
        </div>

        {!isMockMode && (
          <div className="bg-yellow-950/20 border border-yellow-500/20 text-yellow-400 p-3 rounded-lg text-xs">
            Webhook simulation is disabled when PAYMENT_PROVIDER_MODE is razorpay. Switch to mock mode in configuration to use the local sandbox simulator.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-300">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as 'payment.failed' | 'payment.captured')}
              disabled={!isMockMode || simulating}
              className="w-full bg-[#1b1e28] text-xs text-gray-300 rounded border border-[#2e3445] p-2 outline-none focus:border-purple-500 transition cursor-pointer disabled:opacity-50"
            >
              <option value="payment.failed">Payment Failed</option>
              <option value="payment.captured">Payment Captured</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-300">Amount (INR)</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              disabled={!isMockMode || simulating}
              className="w-full bg-[#1b1e28] text-xs text-gray-300 rounded border border-[#2e3445] p-2 outline-none focus:border-purple-500 transition font-mono disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-300">Customer Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isMockMode || simulating}
              className="w-full bg-[#1b1e28] text-xs text-gray-300 rounded border border-[#2e3445] p-2 outline-none focus:border-purple-500 transition disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-300">Customer Phone</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              disabled={!isMockMode || simulating}
              className="w-full bg-[#1b1e28] text-xs text-gray-300 rounded border border-[#2e3445] p-2 outline-none focus:border-purple-500 transition font-mono disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-300">Payment ID</label>
            <input
              type="text"
              value={paymentId}
              readOnly
              className="w-full bg-[#1b1e28]/50 text-xs text-gray-400 rounded border border-[#2e3445] p-2 font-mono"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleSimulate('payment.failed')}
            disabled={!isMockMode || simulating}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 hover:bg-rose-950/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {simulating && eventType === 'payment.failed' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            Simulate Failed Payment
          </button>
          <button
            type="button"
            onClick={() => handleSimulate('payment.captured')}
            disabled={!isMockMode || simulating}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {simulating && eventType === 'payment.captured' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            Simulate Successful Payment
          </button>
        </div>

        {simulateError && (
          <div className="bg-rose-950/20 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs">
            {simulateError}
          </div>
        )}

        {simulateResult && (
          <div className="bg-emerald-950/10 border border-emerald-500/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-semibold">Webhook Accepted</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Event Type</span>
                <span className="text-gray-200 font-mono">{simulateResult.event}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Payment ID</span>
                <span className="text-gray-200 font-mono">{simulateResult.payment_id}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Amount</span>
                <span className="text-gray-200 font-mono">₹{Number(simulateResult.amount).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Result Status</span>
                <span className={`font-semibold uppercase ${
                  simulateResult.result_status === 'processed' ? 'text-emerald-400' : 'text-yellow-400'
                }`}>
                  {simulateResult.result_status}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Case ID</span>
                <span className="text-gray-400 font-mono text-[10px]">{simulateResult.case_id || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Webhook Events Table */}
        <div className="lg:col-span-2 bg-[#13151c] border border-[#202430] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#202430] flex items-center gap-2 bg-[#171922]">
            <Activity className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-gray-200">Webhook Operations Log</h3>
          </div>

          {webhookEvents.length === 0 ? (
            <div className="py-20 text-center text-gray-500 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-gray-600" />
              <h4 className="text-sm font-semibold text-gray-400">No Webhook Events Registered</h4>
              <p className="text-xs max-w-xs mx-auto">Use the Payment Event Simulator above to trigger signed webhook events in mock mode.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#202430] text-gray-400 font-medium">
                    <th className="py-3 pl-4">Received Time</th>
                    <th className="py-3">Webhook Event Type</th>
                    <th className="py-3">Payment / Txn ID</th>
                    <th className="py-3 pr-4 text-right">Ingest Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202430]">
                  {webhookEvents.map((ev) => {
                    const payloadId = ev.metadata?.razorpay_payment_id || ev.metadata?.transaction_id || ev.id.substring(0, 18)
                    const isSelected = selectedEvent?.id === ev.id
                    return (
                      <tr
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={`hover:bg-[#1a1c24]/50 cursor-pointer transition duration-150 ${isSelected ? 'bg-purple-950/10' : ''
                          }`}
                      >
                        <td className="py-3 pl-4 font-mono text-gray-400">
                          {new Date(ev.occurred_at).toLocaleTimeString()}
                        </td>
                        <td className="py-3 font-semibold text-gray-200 uppercase tracking-wider text-[10px]">
                          {ev.event_type.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 font-mono text-gray-400">
                          {payloadId}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getStatusBadgeColor(ev.status)
                            }`}>
                            {ev.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Raw Payload Inspector Panel */}
        <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#202430] pb-2.5">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-gray-200">Payload Inspector</h3>
            </div>
            {selectedEvent && (
              <button
                onClick={() => handleCopyJson(JSON.stringify(selectedEvent, null, 2))}
                className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
            )}
          </div>

          {selectedEvent ? (
            <div className="space-y-4">
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">Event UUID</span>
                  <span className="font-mono text-gray-300 block">{selectedEvent.id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">Verification Metadata</span>
                  <div className="bg-[#1b1e28]/30 border border-[#2e3445] p-2 rounded font-mono text-[10px] text-gray-400 space-y-1 mt-1">
                    <div>Signature Valid: <span className="text-emerald-400 font-semibold">TRUE</span></div>
                    <div>Duplicate Match: <span className={selectedEvent.status === 'DUPLICATE' ? 'text-yellow-400' : 'text-gray-400'}>
                      {selectedEvent.status === 'DUPLICATE' ? 'YES' : 'NO'}
                    </span></div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Full Event Payload</span>
                <pre className="bg-[#0b0c10] border border-[#1e222d] text-[10px] font-mono text-purple-200 p-3 rounded-lg overflow-x-auto max-h-72 leading-relaxed">
                  {JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-gray-500 space-y-2">
              <ShieldCheck className="w-8 h-8 mx-auto text-gray-600" />
              <p className="text-xs max-w-xs mx-auto">Select a webhook row from the left log to inspect its raw payload fields and verification metadata.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
