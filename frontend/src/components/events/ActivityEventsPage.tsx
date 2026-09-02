import { useState, useEffect } from 'react'
import { Activity, AlertCircle, FileJson, X, Globe, FileText, CheckCircle } from 'lucide-react'
import { FinancialValue } from '../common/FinancialValue'
import { formatCurrency } from '../../utils/formatters'

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
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null)

  useEffect(() => {
    if (selectedEvent) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => { document.body.style.overflow = 'auto' }
  }, [selectedEvent])

  const feedItems: any[] = []

  if (filterType === 'ALL' || filterType === 'REVENUE') {
    events.forEach((ev) => {
      feedItems.push({
        id: `rev-${ev.id}`,
        rawId: ev.id,
        timestamp: new Date(ev.occurred_at),
        type: 'REVENUE',
        label: ev.event_type.replace(/_/g, ' '),
        description: `Customer ${ev.customer_id.substring(0, 8)}... triggered event with value ${formatCurrency(ev.amount)}`,
        actor: 'WEBHOOK',
        status: ev.status,
        rawData: ev,
        amount: ev.amount,
        isRecovery: ev.event_type === 'PAYMENT_RECOVERED'
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
        id: `aud-${log.id}`,
        rawId: log.id,
        timestamp: new Date(log.created_at),
        type: 'AUDIT',
        label: log.action.replace(/_/g, ' '),
        description: desc || `Audit event recorded for case ${log.recovery_case_id?.substring(0, 8)}...`,
        actor: log.actor_type,
        status: log.details?.status || 'LOGGED',
        rawData: log,
        isRecovery: log.action === 'PAYMENT_RECOVERED' || log.action === 'RECOVERY_CONFIRMED'
      })
    })
  }

  feedItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
  }
  const formatDate = (d: Date) => {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-6 text-left pb-12 w-full max-w-[1200px] mx-auto">
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 pb-6 border-b border-slate-200 dark:border-brand-border-dark transition-colors duration-200">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-purple-600 dark:text-brand-ai" strokeWidth={2.5} />
            <h3 className="text-2xl font-bold text-slate-900 dark:text-brand-text-primary tracking-tight">Real-Time Operations Feed</h3>
          </div>
          <p className="text-[13px] text-slate-500 dark:text-brand-text-muted font-medium max-w-xl leading-relaxed">
            Monitor payment events, recovery actions, webhook activity, and system decisions in one operational timeline.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 bg-slate-50 dark:bg-brand-card-dark p-1.5 rounded-lg border border-slate-200 dark:border-brand-border-dark shadow-sm shrink-0 transition-colors duration-200">
          {['ALL', 'REVENUE', 'AUDIT'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t as FeedFilter)}
              className={`text-[12px] px-4 py-2 rounded-md font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filterType === t
                  ? 'bg-white dark:bg-brand-surface-dark text-purple-700 dark:text-brand-ai shadow border border-slate-200/50 dark:border-brand-border-subtle'
                  : 'text-slate-500 dark:text-brand-text-muted hover:text-slate-900 dark:hover:text-brand-text-primary hover:bg-slate-100/50 dark:hover:bg-brand-surface-dark/50 transparent border border-transparent'
              }`}
            >
              {t === 'ALL' ? 'All Operations' : t === 'REVENUE' ? 'Webhooks' : 'Audit Logs'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {feedItems.length === 0 ? (
          <div className="py-24 text-center space-y-5 flex flex-col items-center bg-white dark:bg-brand-surface-dark rounded-xl border border-slate-200 dark:border-brand-border-dark shadow-sm transition-colors duration-200">
            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-brand-card-dark flex items-center justify-center border border-slate-100 dark:border-brand-border-dark shadow-sm">
              <AlertCircle className="w-8 h-8 text-slate-400 dark:text-brand-text-muted" strokeWidth={2} />
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-[17px] font-bold text-slate-900 dark:text-brand-text-primary tracking-tight">No operations yet</h4>
              <p className="text-[14px] font-medium text-slate-500 dark:text-brand-text-muted max-w-sm mx-auto leading-relaxed">
                VORTEX has not recorded any recovery, webhook, or system activity matching this filter.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-brand-surface-dark rounded-xl border border-slate-200 dark:border-brand-border-dark shadow-sm overflow-hidden transition-colors duration-200">
            <div className="divide-y divide-slate-100 dark:divide-brand-border-dark">
              {feedItems.map((item) => {
                const isRev = item.type === 'REVENUE'
                const Icon = isRev ? Globe : FileText
                const isRecovery = item.isRecovery
                
                return (
                  <div key={item.id} className={`p-5 md:p-6 transition-colors flex flex-col md:flex-row md:items-start gap-4 md:gap-6 group ${isRecovery ? 'bg-emerald-50/30 dark:bg-brand-success/10 hover:bg-emerald-50 dark:hover:bg-brand-success/20' : 'hover:bg-slate-50/50 dark:hover:bg-brand-card-dark'}`}>
                    
                    <div className="shrink-0 md:w-[150px] flex flex-row md:flex-col gap-2 md:gap-1 items-center md:items-start text-slate-500 dark:text-brand-text-muted">
                      <span className="text-[13px] font-bold tracking-tight text-slate-900 dark:text-brand-text-primary">{formatDate(item.timestamp)}</span>
                      <span className="text-[12px] tabular-nums font-medium tracking-wide">{formatTime(item.timestamp)}</span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-3">
                      {isRecovery ? (
                        <>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-brand-success" />
                            <h4 className="text-[15px] font-bold text-emerald-800 dark:text-brand-success tracking-tight uppercase break-words whitespace-normal">
                              PAYMENT RECOVERED
                            </h4>
                          </div>
                          {item.amount ? (
                            <FinancialValue value={formatCurrency(item.amount)} size="metric" className="text-slate-900 dark:text-brand-text-primary block" />
                          ) : null}
                          <p className="text-[14px] text-slate-700 dark:text-brand-text-secondary font-medium leading-relaxed">
                            Case recovered through Razorpay Test Mode.
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-brand-text-muted tabular-nums mt-1">
                            <span>Ref: {item.rawData.recovery_case_id || item.rawData.id}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold tracking-widest uppercase border transition-colors duration-200 ${
                              isRev
                                ? 'text-purple-700 dark:text-brand-ai bg-purple-50 dark:bg-brand-ai/10 border-purple-200 dark:border-brand-ai/30'
                                : 'text-slate-600 dark:text-brand-text-secondary bg-slate-100 dark:bg-brand-surface-dark border-slate-200 dark:border-brand-border-dark'
                            }`}>
                              <Icon className="w-3 h-3" />
                              {isRev ? 'Webhook Event' : 'System Audit'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-white dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-dark text-slate-500 dark:text-brand-text-muted uppercase tracking-widest shadow-sm">
                              ACTOR: {item.actor}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-[15px] font-bold text-slate-900 dark:text-brand-text-primary tracking-tight uppercase mt-1 mb-1.5 break-words whitespace-normal">
                              {item.label}
                            </h4>
                            <p className="text-[14px] text-slate-600 dark:text-brand-text-secondary font-medium leading-relaxed max-w-3xl line-clamp-2 md:line-clamp-none break-words whitespace-normal">
                              {item.description}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center md:w-[140px] justify-start md:justify-end mt-2 md:mt-0">
                      <button
                        onClick={() => setSelectedEvent(item)}
                        className={`text-[13px] font-bold flex items-center gap-1.5 transition-colors uppercase tracking-wider group-hover:underline ${isRecovery ? 'text-emerald-700 dark:text-brand-success hover:text-emerald-900 dark:hover:text-brand-success/80' : 'text-purple-600 dark:text-brand-ai hover:text-purple-800 dark:hover:text-brand-ai/80'}`}
                      >
                        View details
                        <span className="text-lg leading-none transition-transform group-hover:translate-x-0.5">→</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {selectedEvent && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/30 dark:bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSelectedEvent(null)}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-brand-surface-dark shadow-2xl border-l border-slate-200 dark:border-brand-border-dark z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-brand-border-dark bg-white dark:bg-brand-surface-dark transition-colors duration-200">
              <div className="flex items-center gap-3">
                <FileJson className="w-5 h-5 text-purple-600 dark:text-brand-ai" />
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-brand-text-primary uppercase tracking-tight">Event Details</h3>
              </div>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-lg text-slate-400 dark:text-brand-text-muted hover:bg-slate-100 dark:hover:bg-brand-card-dark hover:text-slate-700 dark:hover:text-brand-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-6">
              
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-brand-text-muted font-bold uppercase tracking-wider block mb-1">Event Action</span>
                  <h4 className="text-[17px] font-bold text-slate-900 dark:text-brand-text-primary uppercase tracking-tight break-words whitespace-normal">{selectedEvent.label}</h4>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-50 dark:bg-brand-card-dark p-3 rounded-lg border border-slate-100 dark:border-brand-border-dark min-w-0 transition-colors duration-200">
                    <span className="text-[10px] text-slate-500 dark:text-brand-text-muted font-bold uppercase tracking-wider block mb-1">Timestamp</span>
                    <span className="text-[13px] tabular-nums font-medium text-slate-900 dark:text-brand-text-primary tracking-tight">
                      {formatDate(selectedEvent.timestamp)} {formatTime(selectedEvent.timestamp)}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-brand-card-dark p-3 rounded-lg border border-slate-100 dark:border-brand-border-dark min-w-0 transition-colors duration-200">
                    <span className="text-[10px] text-slate-500 dark:text-brand-text-muted font-bold uppercase tracking-wider block mb-1">Actor Origin</span>
                    <span className="text-[13px] font-bold text-slate-900 dark:text-brand-text-primary uppercase tracking-tight break-all">
                      {selectedEvent.actor}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-[10px] text-slate-400 dark:text-brand-text-muted font-bold uppercase tracking-wider block">Activity Summary</span>
                <p className="text-[14px] text-slate-700 dark:text-brand-text-secondary font-medium leading-relaxed bg-white dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-dark p-4 rounded-xl shadow-sm break-words whitespace-normal transition-colors duration-200">
                  {selectedEvent.description}
                </p>
              </div>

              <div className="space-y-2 pt-4">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] text-slate-400 dark:text-brand-text-muted font-bold uppercase tracking-wider block">Raw Event Data</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedEvent.rawData, null, 2))}
                    className="text-[11px] font-bold text-purple-600 dark:text-brand-ai hover:text-purple-800 dark:hover:text-brand-ai/80 uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Copy JSON
                  </button>
                </div>
                <div className="bg-slate-900 dark:bg-black/50 rounded-xl overflow-hidden shadow-sm">
                  <pre className="text-[12px] text-slate-300 dark:text-brand-text-muted tabular-nums p-5 overflow-x-auto max-h-[400px] max-w-full overflow-x-auto whitespace-pre-wrap break-words text-[11px]">
                    {JSON.stringify(selectedEvent.rawData, null, 2)}
                  </pre>
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  )
}
