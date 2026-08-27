import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { StatusBadge, RiskBadge, Alert } from './UI';

export { StatusBadge, RiskBadge, Alert };

export function LoadingState({ message = 'Loading operations console...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <Loader2 className="w-8 h-8 text-text-secondary animate-spin" />
      <p className="text-sm font-medium text-text-secondary">{message}</p>
    </div>
  );
}

export function ErrorState({
  title = 'Service Connection Error',
  message,
  onRetry
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-danger/10 border border-danger/20 text-danger p-5 rounded-lg flex items-start gap-4">
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-danger/90 leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-danger text-white text-xs font-medium rounded-md hover:bg-danger/90 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  title = 'No Data Available',
  description = 'No information is currently available for this view.'
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3">
      <Info className="w-8 h-8 text-text-muted mb-2" />
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm mx-auto leading-relaxed">{description}</p>
    </div>
  );
}
