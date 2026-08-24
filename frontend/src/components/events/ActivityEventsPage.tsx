import { useState } from 'react'
import { Activity, AlertCircle } from 'lucide-react'

interface ActivityEventsPageProps {
  events: any[]
  auditLogs: any[]
}

type FeedFilter = 'ALL' | 'REVENUE' | 'AUDIT'

export default function ActivityEventsPage({
  events,
  auditLogs
}: ActivityEventsPageProps) {
  const [filterType, setFilterType] = useState<FeedFilter>('ALL')

  const formatCurrency = (val: string | number) => {
    return `₹${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Combine lists into a unified feed sorted chronologically descending
  const feedItems: any[] = []

  if (filterType === 'ALL' || filterType === 'REVENUE') {
    events.forEach((ev) => {
      feedItems.push({
        id: ev.id,
        timestamp: new Date(ev.occurred_at),
        type: 'REVENUE',
        label: ev.event_type.replace(/_/g, ' '),
        description: `Customer ${ev.customer_id.substring(0, 8)}... triggered event with value ${formatCurrency(ev.amount)}`,
        actor: 'WEBHOOK',
        status: ev.status
      })
    })
  }

  if (filterType === 'ALL' || filterType === 'AUDIT') {
    auditLogs.forEach((log) => {
      let desc = ''
      if (log.details) {
        desc = typeof log.details === 'string' ? log.details : JSON.stringify(log.details)
      }
      feedItems.push({
        id: log.id,
        timestamp: new Date(log.created_at),
        type: 'AUDIT',
        label: log.action.replace(/_/g, ' '),
        description: desc || `Audit event recorded for case ${log.recovery_case_id?.substring(0, 8)}...`,
        actor: log.actor_type,
        status: log.details?.status || 'LOGGED'
      })
    })
  }

  feedItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  return (
    <div className="space-y-6 text-left">
      
      {/* Filters */}
      <div className="bg-[#13151c] border border-[#202430] rounded-xl p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-200">Real-Time Operations Feed</h3>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2">
          {['ALL', 'REVENUE', 'AUDIT'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t as FeedFilter)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
                filterType === t
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/30'
                  : 'bg-[#1b1e28] text-gray-400 border-[#2e3445] hover:text-gray-200'
              }`}
            >
              {t === 'ALL' ? 'All Operations' : t === 'REVENUE' ? 'Revenue Webhooks' : 'System Audit Logs'}
            </button>
          ))}
        </div>
      </div>

      {/* Feed Table */}
      <div className="bg-[#13151c] border border-[#202430] rounded-xl overflow-hidden">
        {feedItems.length === 0 ? (
          <div className="py-20 text-center text-gray-500 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-gray-600" />
            <h4 className="text-sm font-semibold text-gray-400">No events matched</h4>
            <p className="text-xs max-w-xs mx-auto">There are currently no events registered in the sandbox logs.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#202430] text-gray-400 font-medium">
                  <th className="py-3.5 pl-4">Timestamp</th>
                  <th className="py-3.5">Feed Category</th>
                  <th className="py-3.5">Action / Event</th>
                  <th className="py-3.5">Activity Details</th>
                  <th className="py-3.5 pr-4 text-right">Origin Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202430]">
                {feedItems.map((item, idx) => {
                  const isRev = item.type === 'REVENUE'
                  return (
                    <tr key={idx} className="hover:bg-[#1a1c24]/50 transition duration-150">
                      <td className="py-3.5 pl-4 font-mono text-gray-400">
                        {item.timestamp.toLocaleString()}
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${
                          isRev
                            ? 'text-purple-400 bg-purple-950/20 border-purple-500/20'
                            : 'text-blue-400 bg-blue-950/20 border-blue-500/20'
                        }`}>
                          {isRev ? 'Webhook Event' : 'System Audit'}
                        </span>
                      </td>
                      <td className="py-3.5 font-semibold text-gray-200">
                        {item.label}
                      </td>
                      <td className="py-3.5 text-gray-300 leading-relaxed max-w-md truncate">
                        {item.description}
                      </td>
                      <td className="py-3.5 pr-4 text-right font-mono text-gray-400">
                        {item.actor}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
