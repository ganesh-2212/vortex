import React from 'react';
import type { ReactNode } from 'react';
import { Shield, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

/* Typography */

export const PageHeader: React.FC<{ title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
    <div>
      <h1 className="text-[26px] md:text-[30px] font-bold tracking-[-0.02em] text-text-primary leading-tight">{title}</h1>
      {subtitle && <p className="text-[14px] text-text-secondary mt-1.5 font-medium">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </div>
);

export const SectionHeader: React.FC<{ title: string; subtitle?: string; actions?: ReactNode }> = ({ title, subtitle, actions }) => (
  <div className="flex items-center justify-between mb-5">
    <div>
      <h2 className="text-[17px] md:text-[19px] font-[650] tracking-[-0.01em] text-text-primary leading-snug">{title}</h2>
      {subtitle && <p className="text-[14px] text-text-secondary mt-1 font-medium">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

/* Buttons */

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', ...props }) => (
  <button
    className={`inline-flex items-center justify-center gap-2 px-4 h-10 bg-brand hover:bg-brand-hover text-white text-[14px] font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  >
    {children}
  </button>
);

export const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', ...props }) => (
  <button
    className={`inline-flex items-center justify-center gap-2 px-4 h-10 bg-surface hover:bg-surface-hover text-text-primary text-[14px] font-medium border border-border rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  >
    {children}
  </button>
);

/* Badges */

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const norm = status.toUpperCase();
  let colors = 'bg-surface border-border text-text-secondary';
  
  if (['RECOVERED', 'SUCCESS', 'COMPLETED', 'EXECUTED'].includes(norm)) colors = 'bg-success/10 border-success/30 text-success';
  else if (['PENDING', 'WAITING', 'OPEN', 'IN_PROGRESS', 'COOLDOWN'].includes(norm)) colors = 'bg-warning/10 border-warning/30 text-warning';
  else if (['FAILED', 'BLOCKED', 'STOPPED', 'ESCALATED', 'ERROR'].includes(norm)) colors = 'bg-danger/10 border-danger/30 text-danger';
  else if (['INFO', 'ALLOWED'].includes(norm)) colors = 'bg-info/10 border-info/30 text-info';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-[600] tracking-[0.04em] uppercase border ${colors}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export const RiskBadge: React.FC<{ level: string }> = ({ level }) => {
  const norm = level.toUpperCase();
  let colors = 'bg-surface border-border text-text-secondary';
  
  if (norm === 'LOW') colors = 'bg-success/10 border-success/30 text-success';
  else if (norm === 'MEDIUM') colors = 'bg-warning/10 border-warning/30 text-warning';
  else if (norm === 'HIGH') colors = 'bg-danger/10 border-danger/30 text-danger';
  else if (norm === 'CRITICAL') colors = 'bg-danger/20 border-danger text-danger font-bold';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-[600] tracking-[0.04em] uppercase border ${colors}`}>
      {level} RISK
    </span>
  );
};

export const SimulatedBadge: React.FC<{ type?: 'projected' | 'simulated' }> = ({ type = 'projected' }) => (
  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-[600] tracking-[0.04em] uppercase bg-brand/5 border border-brand/20 text-brand">
    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></span>
    {type}
  </span>
);

export const ActualBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-[600] tracking-[0.04em] uppercase text-text-secondary border border-border bg-surface">
    ACTUAL
  </span>
);

/* Data Display */

export const MoneyValue: React.FC<{ amount: number | string; currency?: string; className?: string }> = ({ amount, currency = '₹', className = '' }) => {
  const val = typeof amount === 'string' ? parseFloat(amount) : amount;
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      {currency}{val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
};

export const MetricCard: React.FC<{
  title: string;
  value: ReactNode;
  subtitle?: string;
  trend?: { direction: 'up' | 'down' | 'neutral'; value: string; text?: string };
  isSimulated?: boolean;
}> = ({ title, value, subtitle, trend, isSimulated }) => (
  <div className="flex flex-col">
    <div className="flex items-start justify-between mb-1.5">
      <span className="text-[13px] font-medium text-text-secondary">{title}</span>
      {isSimulated && <SimulatedBadge type="projected" />}
    </div>
    <div className="text-[28px] lg:text-[32px] font-bold text-text-primary tracking-tight leading-none mb-2">
      {value}
    </div>
    <div className="flex items-center justify-between mt-auto">
      <span className="text-[12px] text-text-muted">{subtitle}</span>
      {trend && (
        <span className={`text-[12px] font-medium flex items-center gap-1 ${
          trend.direction === 'up' ? 'text-success' : trend.direction === 'down' ? 'text-danger' : 'text-text-secondary'
        }`}>
          {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
          {trend.text && <span className="text-text-muted ml-1 font-normal">{trend.text}</span>}
        </span>
      )}
    </div>
  </div>
);

export const DataTable: React.FC<{
  columns: { header: string; accessor: (row: any) => ReactNode; align?: 'left' | 'right' | 'center'; className?: string; onClick?: () => void }[];
  data: any[];
  keyExtractor: (row: any) => string;
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
}> = ({ columns, data, keyExtractor, onRowClick, emptyMessage = 'No data available' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="border border-border rounded-lg p-8 text-center text-text-secondary text-sm bg-surface">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border rounded-lg bg-surface">
      <table className="w-full text-sm text-left">
        <thead className="bg-surface-hover border-b border-border text-xs uppercase text-text-secondary">
          <tr>
            {columns.map((col, i) => {
              const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
              return (
                <th 
                  key={i} 
                  onClick={col.onClick}
                  className={`px-4 py-3 font-medium whitespace-nowrap ${alignClass} ${col.className || ''} ${col.onClick ? 'cursor-pointer hover:text-text-primary' : ''}`}
                >
                  {col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              className={`group transition-colors ${onRowClick ? 'cursor-pointer hover:bg-surface-hover' : ''}`}
            >
              {columns.map((col, i) => {
                const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                return (
                  <td key={i} className={`px-4 py-3 whitespace-nowrap ${alignClass} ${col.className || ''}`}>
                    {col.accessor(row)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* Alerts and Information */

export const Alert: React.FC<{ type: 'info' | 'warning' | 'error' | 'success'; title?: ReactNode; children?: ReactNode }> = ({ type, title, children }) => {
  const configs = {
    info: { icon: Info, colors: 'bg-info/10 border-info/20 text-info' },
    warning: { icon: AlertTriangle, colors: 'bg-warning/10 border-warning/20 text-warning' },
    error: { icon: XCircle, colors: 'bg-danger/10 border-danger/20 text-danger' },
    success: { icon: CheckCircle, colors: 'bg-success/10 border-success/20 text-success' }
  };
  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg border flex gap-3 ${config.colors}`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="text-sm">
        {title && <div className="font-semibold mb-1">{title}</div>}
        <div className="opacity-90 leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

/* Workflow Timelines */

export const DecisionStep: React.FC<{
  title: string;
  status: 'passed' | 'failed' | 'warning' | 'pending' | 'info';
  children: ReactNode;
  isLast?: boolean;
}> = ({ title, status, children, isLast }) => {
  let dotColor = 'bg-surface border-border';
  if (status === 'passed') dotColor = 'bg-success border-success';
  else if (status === 'failed') dotColor = 'bg-danger border-danger';
  else if (status === 'warning') dotColor = 'bg-warning border-warning';
  else if (status === 'info') dotColor = 'bg-info border-info';

  return (
    <div className="flex gap-4 relative">
      {!isLast && <div className="absolute left-2.5 top-6 bottom-0 w-px bg-border -ml-px"></div>}
      <div className="shrink-0 mt-1.5 relative z-10">
        <div className={`w-5 h-5 rounded-full border-2 ${dotColor} flex items-center justify-center`}>
          {status === 'passed' && <CheckCircle className="w-3 h-3 text-white" />}
          {status === 'failed' && <XCircle className="w-3 h-3 text-white" />}
          {status === 'warning' && <AlertTriangle className="w-3 h-3 text-white" />}
        </div>
      </div>
      <div className="pb-8 flex-1">
        <h4 className="text-sm font-medium text-text-primary">{title}</h4>
        <div className="mt-2 text-sm text-text-secondary bg-surface border border-border rounded-md p-3">
          {children}
        </div>
      </div>
    </div>
  );
};
