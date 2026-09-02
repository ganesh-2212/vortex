import { RiskBadge, StatusBadge } from '../common/LoaderAndStates'
import { FinancialValue } from '../common/FinancialValue'
import { formatNumber, formatPercentage, formatCurrency } from '../../utils/formatters'

interface OverviewPageProps {
  summary: any
  leakage: any[]
  priorities: any[]
  stats: any
  onSelectCase: (caseId: string) => void
}

export default function OverviewPage({
  summary,
  priorities,
  stats,
  onSelectCase
}: OverviewPageProps) {
  
  return (
    <div className="space-y-8">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Confirmed Recovery */}
        <div className="bg-white dark:bg-brand-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-brand-border-dark p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:hover:bg-brand-card-dark">
          <span className="text-[11px] text-emerald-600 dark:text-brand-success font-bold uppercase tracking-widest block mb-2">Confirmed Recovery</span>
          <FinancialValue 
            value={formatCurrency(stats?.actual_recovered_revenue || '0')} 
            size="overview-kpi" 
            className="text-slate-900 dark:text-brand-text-primary"
          />
        </div>

        {/* Revenue at Risk */}
        <div className="bg-white dark:bg-brand-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-brand-border-dark p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:hover:bg-brand-card-dark">
          <span className="text-[11px] text-rose-600 dark:text-brand-danger font-bold uppercase tracking-widest block mb-2">Revenue at Risk</span>
          <FinancialValue 
            value={formatCurrency(summary?.revenue_at_risk || '0')} 
            size="overview-kpi" 
            className="text-slate-900 dark:text-brand-text-primary"
          />
        </div>

        {/* Recovery Rate */}
        <div className="bg-white dark:bg-brand-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-brand-border-dark p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:hover:bg-brand-card-dark">
          <span className="text-[11px] text-purple-600 dark:text-brand-text-muted font-bold uppercase tracking-widest block mb-2">Recovery Rate</span>
          <FinancialValue 
            value={formatPercentage(stats?.recovery_rate)} 
            size="overview-kpi" 
            className="text-slate-900 dark:text-brand-text-primary"
          />
        </div>

        {/* Active Recovery Cases */}
        <div className="bg-white dark:bg-brand-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-brand-border-dark p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:hover:bg-brand-card-dark">
          <span className="text-[11px] text-slate-500 dark:text-brand-text-muted font-bold uppercase tracking-widest block mb-2">Active Recovery Cases</span>
          <FinancialValue 
            value={formatNumber(summary?.open_case_count || 0)} 
            size="overview-kpi" 
            className="text-slate-900 dark:text-brand-text-primary"
          />
        </div>
      </div>

      {/* Active Cases Table Section */}
      <div className="bg-white dark:bg-brand-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-brand-border-dark flex flex-col overflow-hidden transition-colors duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-brand-border-dark flex justify-between items-center bg-slate-50 dark:bg-brand-surface-dark transition-colors duration-200">
          <h3 className="text-[14px] font-bold text-slate-900 dark:text-brand-text-primary uppercase tracking-widest">Active Cases</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white dark:bg-brand-surface-dark border-b border-slate-100 dark:border-brand-border-dark transition-colors duration-200">
              <tr>
                <th className="py-4 pl-6 text-[10px] font-bold text-slate-500 dark:text-brand-text-muted uppercase tracking-widest">Case</th>
                <th className="py-4 px-4 text-[10px] font-bold text-slate-500 dark:text-brand-text-muted uppercase tracking-widest">Customer</th>
                <th className="py-4 px-4 text-[10px] font-bold text-slate-500 dark:text-brand-text-muted uppercase tracking-widest">Risk</th>
                <th className="py-4 px-4 text-[10px] font-bold text-slate-500 dark:text-brand-text-muted uppercase tracking-widest text-right">Amount at Risk</th>
                <th className="py-4 px-4 text-[10px] font-bold text-slate-500 dark:text-brand-text-muted uppercase tracking-widest">Recommended Action</th>
                <th className="py-4 pr-6 text-[10px] font-bold text-slate-500 dark:text-brand-text-muted uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-brand-border-subtle">
              {priorities.slice(0, 10).map((item) => (
                <tr 
                  key={item.case_id} 
                  onClick={() => onSelectCase(item.case_id)}
                  className="hover:bg-slate-50/70 dark:hover:bg-brand-card-dark transition-colors cursor-pointer group"
                >
                  <td className="py-4 pl-6 tabular-nums text-[13px] font-bold text-slate-900 dark:text-brand-text-primary transition-colors">
                    <FinancialValue value={item.case_id.substring(0, 8)} size="table" className="text-inherit" />
                  </td>
                  <td className="py-4 px-4 text-[13px] font-medium text-slate-700 dark:text-brand-text-secondary">
                    Acme Corp
                  </td>
                  <td className="py-4 px-4">
                    <div className="scale-90 origin-left"><RiskBadge level={item.risk_level} /></div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <FinancialValue value={formatCurrency(item.amount_at_risk)} size="table" className="text-slate-900 dark:text-brand-text-primary" />
                  </td>
                  <td className="py-4 px-4 text-[12px] font-bold text-purple-700 dark:text-brand-ai uppercase tracking-wider">
                    {item.recommended_action ? item.recommended_action.replace(/_/g, ' ') : 'RETRY PAYMENT'}
                  </td>
                  <td className="py-4 pr-6 text-right">
                    <div className="scale-90 origin-right inline-block"><StatusBadge status={item.status || 'OPEN'} /></div>
                  </td>
                </tr>
              ))}
              {priorities.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-subtle flex items-center justify-center mb-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-brand-success"></span>
                      </div>
                      <span className="text-[13px] font-bold text-slate-900 dark:text-brand-text-primary">No active recovery cases</span>
                      <span className="text-[12px] text-slate-500 dark:text-brand-text-muted font-medium">All monitored recovery workflows are currently clear.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
