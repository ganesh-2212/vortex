import { AlertCircle, CheckCircle2 } from 'lucide-react'

export function LoadingState({ message = 'Loading operations console...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-16 space-y-5">
      <div className="w-10 h-10 border-2 border-slate-100 dark:border-brand-border-dark border-t-slate-800 dark:border-t-brand-accent-dark rounded-full animate-spin"></div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse tracking-wide">{message}</p>
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
    <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 text-rose-700 dark:text-rose-400 p-5 rounded-lg flex items-start gap-4 shadow-sm transition-colors">
      <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-500 shrink-0 mt-0.5" />
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-[10px] font-bold text-white bg-rose-600 dark:bg-rose-700 hover:bg-rose-700 dark:hover:bg-rose-600 px-3 py-1 rounded-md transition-colors shadow-sm"
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
    <div className="bg-white dark:bg-brand-surface-dark p-16 text-center space-y-5 transition-colors">
      <div className="inline-flex bg-slate-50 dark:bg-brand-card-dark p-6 rounded-full text-slate-300 dark:text-slate-600 mb-2 transition-colors">
        <CheckCircle2 className="w-12 h-12" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>
      <p className="text-[15px] text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">{description}</p>
    </div>
  )
}

export function RiskBadge({ level }: { level: string }) {
  let text = 'text-emerald-700 dark:text-emerald-400'
  let bg = 'bg-emerald-50 dark:bg-emerald-900/10'
  let border = 'border-emerald-200 dark:border-emerald-800/30'
  let indicator = 'bg-emerald-500 dark:bg-emerald-500'

  const normalized = level.toUpperCase()
  if (normalized === 'CRITICAL') {
    text = 'text-rose-700 dark:text-rose-400'
    bg = 'bg-rose-50 dark:bg-rose-900/10'
    border = 'border-rose-200 dark:border-rose-800/30'
    indicator = 'bg-rose-500 dark:bg-rose-500'
  } else if (normalized === 'HIGH') {
    text = 'text-orange-700 dark:text-orange-400'
    bg = 'bg-orange-50 dark:bg-orange-900/10'
    border = 'border-orange-200 dark:border-orange-800/30'
    indicator = 'bg-orange-500 dark:bg-orange-500'
  } else if (normalized === 'MEDIUM') {
    text = 'text-yellow-700 dark:text-yellow-400'
    bg = 'bg-yellow-50 dark:bg-yellow-900/10'
    border = 'border-yellow-200 dark:border-yellow-800/30'
    indicator = 'bg-yellow-500 dark:bg-yellow-500'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold tracking-wider uppercase transition-colors ${bg} ${text} ${border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${indicator}`}></span>
      {level}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  let color = 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/30'
  const norm = status.toUpperCase()
  
  if (norm === 'RECOVERED') {
    color = 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30'
  } else if (norm === 'STOPPED') {
    color = 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800/30'
  } else if (norm === 'ESCALATED') {
    color = 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/30'
  } else if (norm === 'OPEN') {
    color = 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/30'
  } else if (norm === 'IN_PROGRESS') {
    color = 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30'
  }

  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded border uppercase tracking-wider transition-colors ${color}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
