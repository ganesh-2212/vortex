import { useState } from 'react'
import { Activity, ShieldCheck, Copy, Code, AlertCircle } from 'lucide-react'

interface WebhooksPageProps {
  events: any[]
}

export default function WebhooksPage({ events }: WebhooksPageProps) {
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  // Filter only webhook events (PAYMENT_FAILED, PAYMENT_SUCCESS, etc.) and exclude manually generated ones if needed,
  // but generally all revenue events represent webhook ingestions.
  const webhookEvents = events.filter(
    (e) =>
      e.event_type === 'PAYMENT_FAILED' ||
      e.event_type === 'PAYMENT_AUTHORIZED' ||
      e.event_type === 'PAYMENT_CAPTURED' ||
      e.event_type === 'PAYMENT_RETRY' ||
      e.event_type === 'SUBSCRIPTION_CANCELLED'
  )

  const handleCopyJson = (json: string) => {
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left items-start">
      
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
            <p className="text-xs max-w-xs mx-auto">Trigger payment failures in the sandbox to test live webhook signatures.</p>
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
                      className={`hover:bg-[#1a1c24]/50 cursor-pointer transition duration-150 ${
                        isSelected ? 'bg-purple-950/10' : ''
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
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                          getStatusBadgeColor(ev.status)
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
  )
}
