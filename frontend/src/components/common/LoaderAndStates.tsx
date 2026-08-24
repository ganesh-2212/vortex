import { AlertCircle, CheckCircle2 } from 'lucide-react'

export function LoadingState({ message = 'Loading operations console...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
      <p className="text-xs font-mono text-gray-400 animate-pulse">{message}</p>
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
    <div className="bg-rose-950/40 border border-rose-500/30 text-rose-300 p-5 rounded-xl flex items-start gap-4">
      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-rose-300/80 leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded transition-colors"
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
    <div className="bg-[#13151c] border border-[#202430] rounded-2xl p-12 text-center space-y-4">
      <div className="inline-flex bg-purple-900/10 p-5 rounded-full border border-purple-500/20 text-purple-400 mb-2">
        <CheckCircle2 className="w-10 h-10" />
      </div>
      <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
      <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">{description}</p>
    </div>
  )
}

export function RiskBadge({ level }: { level: string }) {
  let text = 'text-emerald-400'
  let bg = 'bg-emerald-950/30'
  let border = 'border-emerald-500/20'
  let indicator = 'bg-emerald-500'

  const normalized = level.toUpperCase()
  if (normalized === 'CRITICAL') {
    text = 'text-rose-400'
    bg = 'bg-rose-950/30'
    border = 'border-rose-500/20'
    indicator = 'bg-rose-500'
  } else if (normalized === 'HIGH') {
    text = 'text-orange-400'
    bg = 'bg-orange-950/30'
    border = 'border-orange-500/20'
    indicator = 'bg-orange-500'
  } else if (normalized === 'MEDIUM') {
    text = 'text-yellow-400'
    bg = 'bg-yellow-950/30'
    border = 'border-yellow-500/20'
    indicator = 'bg-yellow-500'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${bg} ${text} border ${border}`}>
      <span className={`w-1 h-1 rounded-full ${indicator}`}></span>
      {level}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  let color = 'text-purple-400 bg-purple-950/20 border-purple-500/20'
  const norm = status.toUpperCase()
  
  if (norm === 'RECOVERED') {
    color = 'text-emerald-400 bg-emerald-950/20 border-emerald-500/20'
  } else if (norm === 'STOPPED') {
    color = 'text-rose-400 bg-rose-950/20 border-rose-500/20'
  } else if (norm === 'ESCALATED') {
    color = 'text-yellow-400 bg-yellow-950/20 border-yellow-500/20'
  } else if (norm === 'OPEN') {
    color = 'text-purple-400 bg-purple-950/20 border-purple-500/20'
  } else if (norm === 'IN_PROGRESS') {
    color = 'text-blue-400 bg-blue-950/20 border-blue-500/20'
  }

  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${color}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
