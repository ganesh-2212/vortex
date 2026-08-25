import { useState, useEffect } from 'react'
import { Sliders, Save, Cpu, Key, HelpCircle } from 'lucide-react'

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left items-start">
      
      {/* Configuration Settings Form */}
      <form onSubmit={handleSubmit} className="lg:col-span-2 bg-[#13151c] border border-[#202430] rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-[#202430] pb-3">
          <Sliders className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-200">Merchant Recovery Settings</h3>
        </div>

        {error && (
          <div className="bg-rose-950/20 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-xs">
            Configuration saved successfully and updated globally!
          </div>
        )}

        <div className="space-y-4">
          
          {/* Recovery Enabled */}
          <div className="flex items-center justify-between bg-[#1b1e28]/30 border border-[#202430] rounded-lg p-3.5">
            <div>
              <label className="text-xs font-semibold text-gray-200 block">Global Recovery Enforcement</label>
              <span className="text-[10px] text-gray-500">Temporarily pause/enable all automatic recommendations and retry executions.</span>
            </div>
            <input
              type="checkbox"
              checked={recoveryEnabled}
              onChange={(e) => setRecoveryEnabled(e.target.checked)}
              className="w-5 h-5 accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Max Retries */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                Maximum Retry Attempts
                <span title="Valid range: 0 to 10 attempts">
                  <HelpCircle className="w-3 h-3 text-gray-500" />
                </span>
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={maxRetryAttempts}
                onChange={(e) => setMaxRetryAttempts(parseInt(e.target.value) || 0)}
                className="w-full bg-[#1b1e28] text-xs text-gray-300 rounded border border-[#2e3445] p-2 outline-none focus:border-purple-500 transition font-mono"
                required
              />
            </div>

            {/* Cooldown Period */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                Retry Cooldown (Hours)
                <span title="Valid range: 0 to 720 hours">
                  <HelpCircle className="w-3 h-3 text-gray-500" />
                </span>
              </label>
              <input
                type="number"
                min="0"
                max="720"
                value={retryCooldownHours}
                onChange={(e) => setRetryCooldownHours(parseInt(e.target.value) || 0)}
                className="w-full bg-[#1b1e28] text-xs text-gray-300 rounded border border-[#2e3445] p-2 outline-none focus:border-purple-500 transition font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Escalation behavior */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Escalation Behavior</label>
              <select
                value={escalationBehavior}
                onChange={(e) => setEscalationBehavior(e.target.value)}
                className="w-full bg-[#1b1e28] text-xs text-gray-300 rounded border border-[#2e3445] p-2 outline-none focus:border-purple-500 transition cursor-pointer"
              >
                <option value="MANUAL">MANUAL ESCALATION</option>
                <option value="AUTOMATIC">AUTOMATIC OVERFLOW</option>
              </select>
            </div>

            {/* Webhook Configuration Status */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Webhook Integration Status</label>
              <select
                value={webhookStatus}
                onChange={(e) => setWebhookStatus(e.target.value)}
                className="w-full bg-[#1b1e28] text-xs text-gray-300 rounded border border-[#2e3445] p-2 outline-none focus:border-purple-500 transition cursor-pointer"
              >
                <option value="CONFIGURED">CONFIGURED</option>
                <option value="NOT_CONFIGURED">NOT_CONFIGURED</option>
              </select>
            </div>
          </div>

          {/* Supported Actions Checkboxes */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-gray-300 block">Supported Recovery Actions</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {['RETRY_PAYMENT', 'ESCALATE_TO_HUMAN', 'STOP_RECOVERY'].map((action) => {
                const checked = supportedActions.includes(action)
                return (
                  <label
                    key={action}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-[11px] font-semibold cursor-pointer select-none transition ${
                      checked
                        ? 'bg-purple-950/20 text-purple-300 border-purple-500/30'
                        : 'bg-[#1b1e28]/20 text-gray-400 border-[#2e3445]'
                    }`}
                  >
                    <span>{action.replace(/_/g, ' ')}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleActionToggle(action)}
                      className="accent-purple-500 h-3.5 w-3.5"
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
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/40 text-white text-xs py-2 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving changes...' : 'Save Configuration'}
        </button>
      </form>

      {/* Provider Details Panel */}
      <div className="bg-[#13151c] border border-[#202430] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#202430] pb-2.5">
          <Cpu className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-200">Payment Provider Environment</h3>
        </div>

        <div className="space-y-3 text-xs">
          
          {/* Provider Mode */}
          <div>
            <span className="text-[10px] text-gray-500 uppercase block font-semibold">Active Engine Mode</span>
            <span className="text-sm font-mono font-bold block mt-0.5 uppercase tracking-wider text-purple-300">
              {providerInfo?.mode || 'MOCK'}
            </span>
          </div>

          {/* Provider Status Details */}
          <div>
            <span className="text-[10px] text-gray-500 uppercase block font-semibold">Connection Status</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`h-2 w-2 rounded-full ${providerInfo?.mode === 'razorpay' && providerInfo?.configured ? 'bg-emerald-400' : 'bg-purple-400'}`}></span>
              <span className="font-semibold text-gray-200">
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
            <div>
              <span className="text-[10px] text-gray-500 uppercase block font-semibold">Razorpay Key ID</span>
              <span className="font-mono text-gray-400 mt-0.5 block">{providerInfo.key_id}</span>
            </div>
          )}

          {/* Security Assurance Notice */}
          <div className="bg-purple-950/10 border border-purple-500/10 p-3 rounded text-[10px] text-purple-300 leading-relaxed flex items-start gap-1.5">
            <Key className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
            <span>
              <strong>Security Policy:</strong> API secrets and merchant private tokens are never exposed in the browser. Credentials validation is handled strictly on the server side.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
