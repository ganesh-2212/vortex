import { AlertCircle, CheckCircle2 } from 'lucide-react'

export function LoadingState({ message = 'Loading operations console...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-16 space-y-5">
      <div className="w-10 h-10 border-2 border-slate-100 border-t-slate-800 rounded-full animate-spin"></div>
      <p className="text-sm font-medium text-slate-500 animate-pulse tracking-wide">{message}</p>
    </div>
  )
}

export function ErrorState({
  title = 'Service Connection Error',
  message,
  onRetry
}: {
  title?: string
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-5 rounded-lg flex items-start gap-4 shadow-sm">
      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-rose-700 leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded-md transition-colors shadow-sm"
          >
            Retry Connection
          </button>
        )}
      </div>
    </div>
  )
}

export function EmptyState({
  title = 'No Active Recovery Cases',
  description = 'Your revenue stream is secure. Currently there are no failed payments, unpaid invoices, or anomalies triggering open recovery cases.'
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="bg-white p-16 text-center space-y-5">
      <div className="inline-flex bg-slate-50 p-6 rounded-full text-slate-300 mb-2">
        <CheckCircle2 className="w-12 h-12" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>
      <p className="text-[15px] text-slate-500 max-w-md mx-auto leading-relaxed">{description}</p>
    </div>
  )
}

export function RiskBadge({ level }: { level: string }) {
  let text = 'text-emerald-700'
  let bg = 'bg-emerald-50'
  let border = 'border-emerald-200'
  let indicator = 'bg-emerald-500'

  const normalized = level.toUpperCase()
  if (normalized === 'CRITICAL') {
    text = 'text-rose-700'
    bg = 'bg-rose-50'
    border = 'border-rose-200'
    indicator = 'bg-rose-500'
  } else if (normalized === 'HIGH') {
    text = 'text-orange-700'
    bg = 'bg-orange-50'
    border = 'border-orange-200'
    indicator = 'bg-orange-500'
  } else if (normalized === 'MEDIUM') {
    text = 'text-yellow-700'
    bg = 'bg-yellow-50'
    border = 'border-yellow-200'
    indicator = 'bg-yellow-500'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold tracking-wider uppercase ${bg} ${text} ${border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${indicator}`}></span>
      {level}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  let color = 'text-purple-700 bg-purple-50 border-purple-200'
  const norm = status.toUpperCase()
  
  if (norm === 'RECOVERED') {
    color = 'text-emerald-700 bg-emerald-50 border-emerald-200'
  } else if (norm === 'STOPPED') {
    color = 'text-rose-700 bg-rose-50 border-rose-200'
  } else if (norm === 'ESCALATED') {
    color = 'text-yellow-700 bg-yellow-50 border-yellow-200'
  } else if (norm === 'OPEN') {
    color = 'text-purple-700 bg-purple-50 border-purple-200'
  } else if (norm === 'IN_PROGRESS') {
    color = 'text-blue-700 bg-blue-50 border-blue-200'
  }

  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded border uppercase tracking-wider ${color}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
