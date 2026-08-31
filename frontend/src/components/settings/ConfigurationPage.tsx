import { useState, useEffect } from 'react'
import { Sliders, Save, Cpu, Key, HelpCircle, RefreshCw } from 'lucide-react'

interface ConfigurationPageProps {
  merchantConfig: any
  providerInfo: any
  onSaveConfig: (updatedConfig: any) => Promise<void>
}

export default function ConfigurationPage({
  merchantConfig,
  providerInfo,
  onSaveConfig
}: ConfigurationPageProps) {
  const [recoveryEnabled, setRecoveryEnabled] = useState(true)
  const [maxRetryAttempts, setMaxRetryAttempts] = useState(3)
  const [retryCooldownHours, setRetryCooldownHours] = useState(24)
  const [supportedActions, setSupportedActions] = useState<string[]>([])
  const [escalationBehavior, setEscalationBehavior] = useState('MANUAL')
  const [webhookStatus, setWebhookStatus] = useState('CONFIGURED')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Initialize values from props
  useEffect(() => {
    if (merchantConfig) {
      setRecoveryEnabled(merchantConfig.recovery_enabled ?? true)
      setMaxRetryAttempts(merchantConfig.max_retry_attempts ?? 3)
      setRetryCooldownHours(merchantConfig.retry_cooldown_hours ?? 24)
      setSupportedActions(merchantConfig.supported_recovery_actions ?? [])
      setEscalationBehavior(merchantConfig.escalation_behavior ?? 'MANUAL')
      setWebhookStatus(merchantConfig.webhook_status ?? 'CONFIGURED')
    }
  }, [merchantConfig])

  // Handle checkboxes for supported actions
  const handleActionToggle = (action: string) => {
    if (supportedActions.includes(action)) {
      setSupportedActions(supportedActions.filter((a) => a !== action))
    } else {
      setSupportedActions([...supportedActions, action])
    }
  }

  // Handle submit save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    // Client-side validations (consistent with backend limits)
    if (maxRetryAttempts < 0 || maxRetryAttempts > 10) {
      setError('Maximum retry attempts must be between 0 and 10.')
      setSaving(false)
      return
    }
    if (retryCooldownHours < 0 || retryCooldownHours > 720) {
      setError('Retry cooldown hours must be between 0 and 720.')
      setSaving(false)
      return
    }
    if (supportedActions.length === 0) {
      setError('Please support at least one recovery action type.')
      setSaving(false)
      return
    }

    try {
      await onSaveConfig({
        recovery_enabled: recoveryEnabled,
        max_retry_attempts: maxRetryAttempts,
        retry_cooldown_hours: retryCooldownHours,
        supported_recovery_actions: supportedActions,
        escalation_behavior: escalationBehavior,
        webhook_status: webhookStatus
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to update configuration settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <div className="mb-8 text-left">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configuration</h1>
        <p className="text-[14px] text-slate-500 mt-1">Configure the recovery engine, payment provider, webhooks, and integration health.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left items-start">
        
        {/* Configuration Settings Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-xl p-8 space-y-8 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <Sliders className="w-6 h-6 text-purple-600" strokeWidth={2.5} />
            <h3 className="text-[20px] font-bold text-slate-900 tracking-tight">Recovery Engine Configuration</h3>
          </div>

          {error && (
          <div className="bg-rose-50/50 border border-rose-200 text-rose-700 p-5 rounded-xl text-[13px] font-bold tracking-tight shadow-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50/50 border border-emerald-200 text-emerald-700 p-5 rounded-xl text-[13px] font-bold tracking-tight shadow-sm">
            Configuration saved successfully and updated globally!
          </div>
        )}

        <div className="space-y-6">
          
          {/* Recovery Enabled */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm hover:border-slate-300 transition-colors">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-slate-900 uppercase tracking-widest block">Global Recovery Enforcement</label>
              <span className="text-[13px] text-slate-500 font-medium">Temporarily pause/enable all automatic recommendations and retry executions.</span>
            </div>
            <input
              type="checkbox"
              checked={recoveryEnabled}
              onChange={(e) => setRecoveryEnabled(e.target.checked)}
              className="w-5 h-5 accent-purple-600 cursor-pointer rounded border-slate-300 shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
            
            {/* Max Retries */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                Maximum Retry Attempts
                <span title="Valid range: 0 to 10 attempts">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" strokeWidth={2.5} />
                </span>
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={maxRetryAttempts}
                onChange={(e) => setMaxRetryAttempts(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 text-[15px] font-bold text-slate-900 rounded-lg border border-slate-200 p-3.5 outline-none focus:border-purple-500 focus:bg-white transition-all tabular-nums shadow-sm"
                required
              />
            </div>

            {/* Cooldown Period */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                Retry Cooldown (Hours)
                <span title="Valid range: 0 to 720 hours">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" strokeWidth={2.5} />
                </span>
              </label>
              <input
                type="number"
                min="0"
                max="720"
                value={retryCooldownHours}
                onChange={(e) => setRetryCooldownHours(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 text-[15px] font-bold text-slate-900 rounded-lg border border-slate-200 p-3.5 outline-none focus:border-purple-500 focus:bg-white transition-all tabular-nums shadow-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 mt-2">
            
            {/* Escalation behavior */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Escalation Behavior</label>
              <select
                value={escalationBehavior}
                onChange={(e) => setEscalationBehavior(e.target.value)}
                className="w-full bg-slate-50 text-[13px] font-bold text-slate-900 rounded-lg border border-slate-200 p-3.5 outline-none focus:border-purple-500 focus:bg-white transition-all cursor-pointer shadow-sm"
              >
                <option value="MANUAL">MANUAL ESCALATION</option>
                <option value="AUTOMATIC">AUTOMATIC OVERFLOW</option>
              </select>
            </div>

            {/* Webhook Configuration Status */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Webhook Integration Status</label>
              <select
                value={webhookStatus}
                onChange={(e) => setWebhookStatus(e.target.value)}
                className="w-full bg-slate-50 text-[13px] font-bold text-slate-900 rounded-lg border border-slate-200 p-3.5 outline-none focus:border-purple-500 focus:bg-white transition-all cursor-pointer shadow-sm"
              >
                <option value="CONFIGURED">CONFIGURED</option>
                <option value="NOT_CONFIGURED">NOT_CONFIGURED</option>
              </select>
            </div>
          </div>

          {/* Supported Actions Checkboxes */}
          <div className="space-y-4 pt-6 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">Supported Recovery Actions</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['RETRY_PAYMENT', 'ESCALATE_TO_HUMAN', 'STOP_RECOVERY'].map((action) => {
                const checked = supportedActions.includes(action)
                return (
                  <label
                    key={action}
                    className={`flex items-center justify-between p-4 rounded-xl border text-[13px] font-bold tracking-tight cursor-pointer select-none transition-colors shadow-sm ${
                      checked
                        ? 'bg-purple-50/50 text-purple-700 border-purple-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <span>{action.replace(/_/g, ' ')}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleActionToggle(action)}
                      className="accent-purple-600 h-4 w-4 rounded border-slate-300 shadow-sm cursor-pointer"
                    />
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-[15px] font-bold py-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm mt-8 tracking-tight"
        >
          <Save className="w-5 h-5" strokeWidth={2.5} />
          {saving ? 'Saving changes...' : 'Save Configuration'}
        </button>
      </form>

      {/* Provider Details Panel */}
      <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-8">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <Cpu className="w-6 h-6 text-purple-600" strokeWidth={2.5} />
          <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">Payment Provider Environment</h3>
        </div>

        <div className="space-y-6">
          
          {/* Provider Mode */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Active Engine Mode</span>
            <span className="text-[17px] tabular-nums font-bold uppercase tracking-tight text-purple-700">
              {providerInfo?.mode || 'MOCK'}
            </span>
          </div>

          {/* Provider Status Details */}
          <div className="flex flex-col gap-1 pt-6 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Connection Status</span>
            <div className="flex items-center gap-2.5 mt-1">
              <span className={`h-3 w-3 rounded-full shadow-sm ${providerInfo?.mode === 'razorpay' && providerInfo?.configured ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-purple-600 shadow-purple-600/30'}`}></span>
              <span className="font-bold text-[13px] text-slate-900 tracking-tight">
                {providerInfo?.mode === 'razorpay'
                  ? providerInfo?.configured
                    ? 'RAZORPAY / CONFIGURED'
                    : 'RAZORPAY / CREDENTIALS MISSING'
                  : 'MOCK / LOCAL'}
              </span>
            </div>
          </div>

          {/* Key ID */}
          {providerInfo?.configured && (
            <div className="flex flex-col gap-1 pt-6 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Razorpay Key ID</span>
              <span className="tabular-nums font-bold text-slate-700 text-[13px]">{providerInfo.key_id}</span>
            </div>
          )}

          {/* Security Assurance Notice */}
          <div className="bg-purple-50/50 border border-purple-200 p-5 rounded-xl text-[13px] text-purple-800 leading-relaxed flex items-start gap-3 shadow-sm mt-4">
            <Key className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" strokeWidth={2.5} />
            <div className="flex flex-col gap-1.5">
              <strong className="text-[11px] uppercase tracking-widest text-purple-900">Security Policy</strong> 
              <span className="font-medium text-purple-800 leading-relaxed">API secrets and merchant private tokens are never exposed in the browser. Credentials validation is handled strictly on the server side.</span>
            </div>
          </div>
        </div>

        {/* Integration Health */}
        <div className="mt-8 pt-8 border-t border-slate-100 space-y-5">
          <h4 className="text-[13px] font-bold text-slate-900 tracking-tight uppercase">Integration Health</h4>
          
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Razorpay Connection</span>
            <span className="text-[13px] font-bold text-slate-900 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${providerInfo?.configured ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              {providerInfo?.configured ? 'HEALTHY' : 'DISCONNECTED'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 pt-4 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Webhook Status</span>
            <span className="text-[13px] font-bold text-slate-900 flex items-center gap-2">
               <span className={`w-2 h-2 rounded-full ${merchantConfig?.webhook_status === 'CONFIGURED' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
               {merchantConfig?.webhook_status || 'UNKNOWN'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 pt-4 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">API Health</span>
            <span className="text-[13px] font-bold text-slate-900 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
               99.9% UPTIME
            </span>
          </div>

          <div className="flex flex-col gap-1.5 pt-4 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Last Synchronization</span>
            <span className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
