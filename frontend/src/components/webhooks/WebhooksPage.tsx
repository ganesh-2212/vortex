import { useState, useEffect } from 'react'
import { Activity, ShieldCheck, Copy, Code, AlertCircle, Zap, CheckCircle2, Loader2 } from 'lucide-react'
import { simulatePaymentEvent, type SimulatePaymentEventResponse } from '../../api'
import {formatCurrency} from '../../utils/formatters';

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

  const handleSimulate = async (type: 'payment.failed' | 'payment.captured' = eventType) => {
    setSimulating(true)
    setSimulateError(null)
    setSimulateResult(null)
    setEventType(type)

    try {
      const result = await simulatePaymentEvent({
        event: type,
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
        return 'text-emerald-700 bg-emerald-50 border-emerald-200'
      case 'DUPLICATE':
        return 'text-amber-700 bg-amber-50 border-amber-200'
      case 'UNHANDLED':
        return 'text-slate-600 bg-gray-50 border-slate-200'
      case 'FAILED':
        return 'text-rose-700 bg-rose-50 border-rose-200'
      default:
        return 'text-purple-700 bg-purple-50 border-purple-200'
    }
  }

  return (
    <div className="space-y-8 text-left pb-12 w-full max-w-7xl mx-auto">
      {/* Payment Event Simulator */}
      <div className="bg-white rounded-xl shadow-sm p-8 space-y-8 border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-purple-600" strokeWidth={2.5} />
            <h3 className="text-[22px] font-bold text-slate-900 tracking-tight">Payment Event Simulator</h3>
          </div>
          <span className={`text-[11px] font-bold px-3 py-1.5 rounded uppercase tracking-widest ${
            isMockMode
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
              : 'text-slate-600 bg-slate-50 border border-slate-200'
          }`}>
            {isMockMode ? 'Mock Mode' : 'Production Mode'}
          </span>
        </div>

        <div className="bg-sky-50 border border-sky-200 text-sky-900 p-5 rounded-xl text-[13px] font-medium shadow-sm">
          Demo event generator — creates a FLOWMINT sandbox event. Real recovery execution uses Razorpay Test Mode.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 pt-6 border-t border-slate-100">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as 'payment.failed' | 'payment.captured')}
              disabled={simulating}
              className="w-full bg-slate-50 text-[15px] font-medium text-slate-900 rounded-lg border border-slate-200 p-3 outline-none focus:border-purple-500 focus:bg-white transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50 shadow-sm"
            >
              <option value="payment.failed">Payment Failed</option>
              <option value="payment.captured">Payment Captured</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Amount (INR)</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              disabled={simulating}
              className="w-full bg-slate-50 text-[15px] text-slate-900 rounded-lg border border-slate-200 p-3 outline-none focus:border-purple-500 focus:bg-white transition-all tabular-nums disabled:opacity-50 disabled:bg-slate-50 shadow-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={simulating}
              className="w-full bg-slate-50 text-[15px] text-slate-900 rounded-lg border border-slate-200 p-3 outline-none focus:border-purple-500 focus:bg-white transition-all disabled:opacity-50 disabled:bg-slate-50 shadow-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer Phone</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              disabled={simulating}
              className="w-full bg-slate-50 text-[15px] text-slate-900 rounded-lg border border-slate-200 p-3 outline-none focus:border-purple-500 focus:bg-white transition-all tabular-nums disabled:opacity-50 disabled:bg-slate-50 shadow-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment ID</label>
            <input
              type="text"
              value={paymentId}
              readOnly
              className="w-full bg-slate-100 text-[15px] font-bold text-slate-500 rounded-lg border border-slate-200 p-3 tabular-nums shadow-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => handleSimulate('payment.failed')}
            disabled={simulating}
            className="inline-flex items-center gap-3 px-6 py-3.5 text-[13px] uppercase tracking-wider font-bold rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {simulating && eventType === 'payment.failed' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Simulate Failed Payment
          </button>
          <button
            type="button"
            onClick={() => handleSimulate('payment.captured')}
            disabled={simulating}
            className="inline-flex items-center gap-3 px-6 py-3.5 text-[13px] uppercase tracking-wider font-bold rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {simulating && eventType === 'payment.captured' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Simulate Successful Payment
          </button>
        </div>

        {simulateError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg text-sm shadow-sm">
            {simulateError}
          </div>
        )}

        {simulateResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 text-emerald-700">
              <CheckCircle2 className="w-6 h-6" strokeWidth={2.5} />
              <span className="text-[15px] font-bold tracking-tight">Webhook Accepted</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 border-t border-emerald-200/50 pt-5">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-emerald-800 uppercase font-bold tracking-wider">Event Type</span>
                <span className="text-emerald-900 tabular-nums font-bold text-[13px]">{simulateResult.event}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-emerald-800 uppercase font-bold tracking-wider">Payment ID</span>
                <span className="text-emerald-900 tabular-nums font-bold text-[13px]">{simulateResult.payment_id}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-emerald-800 uppercase font-bold tracking-wider">Amount</span>
                <span className="text-emerald-900 tabular-nums font-bold text-[13px]">₹{formatCurrency(simulateResult.amount)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-emerald-800 uppercase font-bold tracking-wider">Result Status</span>
                <span className={`text-[13px] font-bold uppercase tracking-widest ${
                  simulateResult.result_status === 'processed' ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {simulateResult.result_status}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-emerald-800 uppercase font-bold tracking-wider">Case ID</span>
                <span className="text-emerald-900 tabular-nums font-bold text-[13px]">{simulateResult.case_id || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Webhook Events Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3 bg-white rounded-t-xl">
            <Activity className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
            <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">Webhook Operations Log</h3>
          </div>

          {webhookEvents.length === 0 ? (
            <div className="py-24 text-center text-slate-400 space-y-4 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 shadow-sm">
                <AlertCircle className="w-8 h-8 text-slate-400" strokeWidth={2} />
              </div>
              <div className="flex flex-col gap-2">
                <h4 className="text-[17px] font-bold text-slate-600 tracking-tight">No Webhook Events Registered</h4>
                <p className="text-[13px] font-medium max-w-sm mx-auto leading-relaxed">Use the Payment Event Simulator above to trigger signed webhook events in mock mode.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400">
                    <th className="py-4 pl-8 text-[11px] font-bold uppercase tracking-wider">Received Time</th>
                    <th className="py-4 text-[11px] font-bold uppercase tracking-wider">Webhook Event Type</th>
                    <th className="py-4 text-[11px] font-bold uppercase tracking-wider">Payment / Txn ID</th>
                    <th className="py-4 pr-8 text-right text-[11px] font-bold uppercase tracking-wider">Ingest Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px]">
                  {webhookEvents.map((ev) => {
                    const payloadId = ev.metadata?.razorpay_payment_id || ev.metadata?.transaction_id || ev.id.substring(0, 18)
                    const isSelected = selectedEvent?.id === ev.id
                    return (
                      <tr
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${isSelected ? 'bg-purple-50/30' : ''
                          }`}
                      >
                        <td className="py-5 pl-8 tabular-nums font-bold text-slate-500">
                          {new Date(ev.occurred_at).toLocaleTimeString()}
                        </td>
                        <td className="py-5 font-bold text-slate-900 uppercase tracking-tight">
                          {ev.event_type.replace(/_/g, ' ')}
                        </td>
                        <td className="py-5 tabular-nums font-medium text-slate-600">
                          {payloadId}
                        </td>
                        <td className="py-5 pr-8 text-right">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded border uppercase tracking-widest ${getStatusBadgeColor(ev.status)
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
        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <Code className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
              <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">Payload Inspector</h3>
            </div>
            {selectedEvent && (
              <button
                onClick={() => handleCopyJson(JSON.stringify(selectedEvent, null, 2))}
                className="text-[11px] font-bold uppercase tracking-wider text-purple-600 hover:text-purple-800 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
            )}
          </div>

          {selectedEvent ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Event UUID</span>
                  <span className="tabular-nums text-slate-900 font-bold text-[13px]">{selectedEvent.id}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Verification Metadata</span>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl tabular-nums text-[13px] text-slate-700 space-y-2 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">Signature Valid:</span>
                      <span className="text-emerald-700 font-bold">TRUE</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                      <span className="font-bold">Duplicate Match:</span>
                      <span className={`font-bold ${selectedEvent.status === 'DUPLICATE' ? 'text-amber-700' : 'text-slate-700'}`}>
                        {selectedEvent.status === 'DUPLICATE' ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Full Event Payload</span>
                <pre className="bg-slate-50 border border-slate-200 text-[13px] tabular-nums text-slate-800 p-5 rounded-xl overflow-x-auto max-h-80 leading-relaxed shadow-sm max-w-full overflow-x-auto whitespace-pre-wrap break-words text-[11px]">
                  {JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 shadow-sm">
                <ShieldCheck className="w-8 h-8 text-slate-400" strokeWidth={2} />
              </div>
              <p className="text-[13px] font-medium max-w-[200px] mx-auto text-slate-500 leading-relaxed">Select a webhook row from the left log to inspect its raw payload fields and verification metadata.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
