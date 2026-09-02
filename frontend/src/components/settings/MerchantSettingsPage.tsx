import { Building2, User, Activity, RefreshCw } from 'lucide-react'

interface MerchantSettingsPageProps {
  merchantConfig: any
  providerInfo: any
}

export default function MerchantSettingsPage({ merchantConfig, providerInfo }: MerchantSettingsPageProps) {
  // Use existing merchant settings where available, else static demo defaults as requested
  const merchantName = "Sandbox Merchant"
  const merchantId = "merchant_demo_001"
  const accountStatus = "Connected / Active"
  const defaultCurrency = "INR (₹)"
  const timezone = "Asia/Kolkata"

  const automationEnabled = merchantConfig?.recovery_enabled ?? true
  const escalationBehavior = merchantConfig?.escalation_behavior ?? 'MANUAL'

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <div className="mb-8 text-left">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-brand-text-primary tracking-tight transition-colors">Merchant Settings</h1>
        <p className="text-[14px] text-slate-500 dark:text-brand-text-muted mt-1 transition-colors">Manage your merchant profile, recovery preferences, and account behavior.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left items-start">
        {/* Merchant Profile Form/Settings */}
        <div className="lg:col-span-2 bg-white dark:bg-brand-surface-dark rounded-xl p-8 space-y-8 shadow-sm border border-slate-200 dark:border-brand-border-dark transition-colors duration-200">
          <div className="flex flex-col gap-1 border-b border-slate-100 dark:border-brand-border-dark pb-5 transition-colors">
            <h2 className="text-[20px] font-bold text-slate-900 dark:text-brand-text-primary tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-purple-600 dark:text-brand-ai" />
              Merchant Profile
            </h2>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-500 dark:text-brand-text-muted uppercase tracking-wider">Merchant Name</label>
            <div className="w-full bg-slate-50 dark:bg-brand-card-dark text-[15px] font-bold text-slate-900 dark:text-brand-text-primary rounded-lg border border-slate-200 dark:border-brand-border-dark p-3.5 shadow-sm transition-colors">
              {merchantName}
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-500 dark:text-brand-text-muted uppercase tracking-wider">Merchant ID</label>
            <div className="w-full bg-slate-50 dark:bg-brand-card-dark text-[15px] tabular-nums text-slate-700 dark:text-brand-text-secondary rounded-lg border border-slate-200 dark:border-brand-border-dark p-3.5 shadow-sm transition-colors">
              {merchantId}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-500 dark:text-brand-text-muted uppercase tracking-wider">Account Status</label>
            <div className="w-full bg-slate-50 dark:bg-brand-card-dark text-[13px] font-bold text-emerald-700 dark:text-brand-success rounded-lg border border-slate-200 dark:border-brand-border-dark p-3.5 shadow-sm flex items-center gap-2 transition-colors">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              {accountStatus}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-slate-500 dark:text-brand-text-muted uppercase tracking-wider">Default Currency</label>
            <div className="w-full bg-slate-50 dark:bg-brand-card-dark text-[15px] font-bold text-slate-900 dark:text-brand-text-primary rounded-lg border border-slate-200 dark:border-brand-border-dark p-3.5 shadow-sm transition-colors">
              {defaultCurrency}
            </div>
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-500 dark:text-brand-text-muted uppercase tracking-wider">Timezone</label>
            <div className="w-full bg-slate-50 dark:bg-brand-card-dark text-[15px] font-bold text-slate-900 dark:text-brand-text-primary rounded-lg border border-slate-200 dark:border-brand-border-dark p-3.5 shadow-sm transition-colors">
              {timezone}
            </div>
          </div>
        </div>

        {/* Recovery Preferences */}
        <div className="pt-8 border-t border-slate-100 dark:border-brand-border-dark space-y-6 transition-colors">
          <div className="flex items-center gap-3 pb-2">
            <User className="w-5 h-5 text-purple-600 dark:text-brand-ai" />
            <h3 className="text-[17px] font-bold text-slate-900 dark:text-brand-text-primary tracking-tight">Recovery Preferences</h3>
          </div>
          
          <div className="flex items-center justify-between bg-slate-50 dark:bg-brand-card-dark border border-slate-200 dark:border-brand-border-dark rounded-xl p-5 shadow-sm transition-colors">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-bold text-slate-900 dark:text-brand-text-primary tracking-tight">Recovery Automation</span>
              <span className="text-[12px] text-slate-500 dark:text-brand-text-muted font-medium">Global AI automation capabilities.</span>
            </div>
            <div className="text-[13px] font-bold text-purple-700 dark:text-brand-text-primary uppercase tracking-wider">
              {automationEnabled ? 'ENABLED' : 'DISABLED'}
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-50 dark:bg-brand-card-dark border border-slate-200 dark:border-brand-border-dark rounded-xl p-5 shadow-sm transition-colors">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-bold text-slate-900 dark:text-brand-text-primary tracking-tight">Escalation Preference</span>
              <span className="text-[12px] text-slate-500 dark:text-brand-text-muted font-medium">How difficult cases are handled.</span>
            </div>
            <div className="text-[13px] font-bold text-purple-700 dark:text-brand-text-primary uppercase tracking-wider">
              {escalationBehavior}
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-50 dark:bg-brand-card-dark border border-slate-200 dark:border-brand-border-dark rounded-xl p-5 shadow-sm transition-colors">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-bold text-slate-900 dark:text-brand-text-primary tracking-tight">Recovery Notifications</span>
              <span className="text-[12px] text-slate-500 dark:text-brand-text-muted font-medium">Alerts on successful revenue recapture.</span>
            </div>
            <div className="text-[13px] font-bold text-emerald-700 dark:text-brand-success uppercase tracking-wider">
              ACTIVE
            </div>
          </div>
        </div>
      </div>

      {/* Status Panel */}
      <div className="bg-white dark:bg-brand-surface-dark rounded-xl p-8 border border-slate-200 dark:border-brand-border-dark shadow-sm space-y-8 transition-colors duration-200">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-brand-border-dark pb-5 transition-colors">
          <Activity className="w-5 h-5 text-purple-600 dark:text-brand-ai" />
          <h3 className="text-[17px] font-bold text-slate-900 dark:text-brand-text-primary tracking-tight">Account Information</h3>
        </div>

        <div className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-slate-400 dark:text-brand-text-muted uppercase font-bold tracking-wider">Merchant Status</span>
            <span className="text-[13px] font-bold text-slate-900 dark:text-brand-text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              ACTIVE
            </span>
          </div>

          <div className="flex flex-col gap-1.5 pt-4 border-t border-slate-100 dark:border-brand-border-dark transition-colors">
            <span className="text-[11px] text-slate-400 dark:text-brand-text-muted uppercase font-bold tracking-wider">Provider Connection</span>
            <span className="text-[13px] font-bold text-slate-900 dark:text-brand-text-primary">
              {providerInfo?.mode === 'razorpay' ? 'RAZORPAY TEST MODE' : 'MOCK'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 pt-4 border-t border-slate-100 dark:border-brand-border-dark transition-colors">
            <span className="text-[11px] text-slate-400 dark:text-brand-text-muted uppercase font-bold tracking-wider">Recovery Engine</span>
            <span className="text-[13px] font-bold text-slate-900 dark:text-brand-text-primary flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-purple-500"></span>
               {automationEnabled ? 'ONLINE' : 'PAUSED'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 pt-4 border-t border-slate-100 dark:border-brand-border-dark transition-colors">
            <span className="text-[11px] text-slate-400 dark:text-brand-text-muted uppercase font-bold tracking-wider">Last Synchronization</span>
            <span className="text-[13px] font-bold text-slate-900 dark:text-brand-text-primary flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 dark:text-brand-text-muted" />
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
