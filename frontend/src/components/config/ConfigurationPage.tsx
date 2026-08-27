import React, { useState, useEffect } from 'react';
import { Sliders, Save, Cpu, Key, HelpCircle } from 'lucide-react';
import { SectionHeader, PrimaryButton, Alert } from '../common/UI';

interface ConfigurationPageProps {
  merchantConfig: any;
  providerInfo: any;
  onSaveConfig: (updatedConfig: any) => Promise<void>;
}

export default function ConfigurationPage({
  merchantConfig,
  providerInfo,
  onSaveConfig
}: ConfigurationPageProps) {
  const [recoveryEnabled, setRecoveryEnabled] = useState(true);
  const [maxRetryAttempts, setMaxRetryAttempts] = useState(3);
  const [retryCooldownHours, setRetryCooldownHours] = useState(24);
  const [supportedActions, setSupportedActions] = useState<string[]>([]);
  const [escalationBehavior, setEscalationBehavior] = useState('MANUAL');
  const [webhookStatus, setWebhookStatus] = useState('CONFIGURED');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize values from props
  useEffect(() => {
    if (merchantConfig) {
      setRecoveryEnabled(merchantConfig.recovery_enabled ?? true);
      setMaxRetryAttempts(merchantConfig.max_retry_attempts ?? 3);
      setRetryCooldownHours(merchantConfig.retry_cooldown_hours ?? 24);
      setSupportedActions(merchantConfig.supported_recovery_actions ?? []);
      setEscalationBehavior(merchantConfig.escalation_behavior ?? 'MANUAL');
      setWebhookStatus(merchantConfig.webhook_status ?? 'CONFIGURED');
    }
  }, [merchantConfig]);

  // Handle checkboxes for supported actions
  const handleActionToggle = (action: string) => {
    if (supportedActions.includes(action)) {
      setSupportedActions(supportedActions.filter((a) => a !== action));
    } else {
      setSupportedActions([...supportedActions, action]);
    }
  };

  // Handle submit save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    // Client-side validations (consistent with backend limits)
    if (maxRetryAttempts < 0 || maxRetryAttempts > 10) {
      setError('Maximum retry attempts must be between 0 and 10.');
      setSaving(false);
      return;
    }
    if (retryCooldownHours < 0 || retryCooldownHours > 720) {
      setError('Retry cooldown hours must be between 0 and 720.');
      setSaving(false);
      return;
    }
    if (supportedActions.length === 0) {
      setError('Please support at least one recovery action type.');
      setSaving(false);
      return;
    }

    try {
      await onSaveConfig({
        recovery_enabled: recoveryEnabled,
        max_retry_attempts: maxRetryAttempts,
        retry_cooldown_hours: retryCooldownHours,
        supported_recovery_actions: supportedActions,
        escalation_behavior: escalationBehavior,
        webhook_status: webhookStatus
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update configuration settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pb-12">
      
      {/* Configuration Settings Form */}
      <form onSubmit={handleSubmit} className="lg:col-span-2 bg-surface border border-border rounded-lg p-6 space-y-6">
        <SectionHeader title="Merchant Recovery Settings" />

        {error && (
          <Alert type="error" title={error} />
        )}

        {success && (
          <Alert type="success" title="Configuration saved successfully and updated globally!" />
        )}

        <div className="space-y-6">
          
          {/* Recovery Enabled */}
          <div className="flex items-center justify-between bg-background border border-border rounded-md p-4">
            <div>
              <label className="text-sm font-semibold text-text-primary block mb-1">Global Recovery Enforcement</label>
              <span className="text-xs text-text-secondary">Temporarily pause/enable all automatic recommendations and retry executions.</span>
            </div>
            <input
              type="checkbox"
              checked={recoveryEnabled}
              onChange={(e) => setRecoveryEnabled(e.target.checked)}
              className="w-5 h-5 accent-brand cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Max Retries */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5 uppercase tracking-wider">
                Maximum Retry Attempts
                <span title="Valid range: 0 to 10 attempts">
                  <HelpCircle className="w-3.5 h-3.5 text-text-muted" />
                </span>
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={maxRetryAttempts}
                onChange={(e) => setMaxRetryAttempts(parseInt(e.target.value) || 0)}
                className="w-full bg-background text-sm text-text-primary rounded-md border border-border px-3 py-2 outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all font-mono"
                required
              />
            </div>

            {/* Cooldown Period */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5 uppercase tracking-wider">
                Retry Cooldown (Hours)
                <span title="Valid range: 0 to 720 hours">
                  <HelpCircle className="w-3.5 h-3.5 text-text-muted" />
                </span>
              </label>
              <input
                type="number"
                min="0"
                max="720"
                value={retryCooldownHours}
                onChange={(e) => setRetryCooldownHours(parseInt(e.target.value) || 0)}
                className="w-full bg-background text-sm text-text-primary rounded-md border border-border px-3 py-2 outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Escalation behavior */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary uppercase tracking-wider">Escalation Behavior</label>
              <select
                value={escalationBehavior}
                onChange={(e) => setEscalationBehavior(e.target.value)}
                className="w-full bg-background text-sm text-text-primary rounded-md border border-border px-3 py-2 outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all cursor-pointer font-sans"
              >
                <option value="MANUAL">MANUAL ESCALATION</option>
                <option value="AUTOMATIC">AUTOMATIC OVERFLOW</option>
              </select>
            </div>

            {/* Webhook Configuration Status */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary uppercase tracking-wider">Webhook Integration Status</label>
              <select
                value={webhookStatus}
                onChange={(e) => setWebhookStatus(e.target.value)}
                className="w-full bg-background text-sm text-text-primary rounded-md border border-border px-3 py-2 outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all cursor-pointer font-sans"
              >
                <option value="CONFIGURED">CONFIGURED</option>
                <option value="NOT_CONFIGURED">NOT_CONFIGURED</option>
              </select>
            </div>
          </div>

          {/* Supported Actions Checkboxes */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-semibold text-text-primary uppercase tracking-wider block">Supported Recovery Actions</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {['RETRY_PAYMENT', 'ESCALATE_TO_HUMAN', 'STOP_RECOVERY'].map((action) => {
                const checked = supportedActions.includes(action);
                return (
                  <label
                    key={action}
                    className={`flex items-center justify-between p-3 rounded-md border text-xs font-semibold cursor-pointer select-none transition-colors ${
                      checked
                        ? 'bg-brand/10 text-brand border-brand/30'
                        : 'bg-background text-text-secondary border-border hover:border-text-muted'
                    }`}
                  >
                    <span className="capitalize">{action.replace(/_/g, ' ')}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleActionToggle(action)}
                      className="accent-brand h-4 w-4 cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <PrimaryButton
          type="submit"
          disabled={saving}
          className="w-full py-3 mt-4"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving changes...' : 'Save Configuration'}
        </PrimaryButton>
      </form>

      {/* Provider Details Panel */}
      <div className="bg-surface border border-border rounded-lg p-6 space-y-5 lg:sticky lg:top-6">
        <SectionHeader title="Payment Provider Environment" />

        <div className="space-y-5">
          
          {/* Provider Mode */}
          <div className="bg-background border border-border p-4 rounded-md">
            <span className="text-[10px] text-text-muted uppercase block font-bold tracking-wider">Active Engine Mode</span>
            <span className="text-base font-mono font-bold block mt-1 uppercase tracking-widest text-brand">
              {providerInfo?.mode || 'MOCK'}
            </span>
          </div>

          {/* Provider Status Details */}
          <div className="bg-background border border-border p-4 rounded-md">
            <span className="text-[10px] text-text-muted uppercase block font-bold tracking-wider">Connection Status</span>
            <div className="flex items-center gap-2.5 mt-2">
              <span className={`h-2.5 w-2.5 rounded-full shadow-sm ${providerInfo?.mode === 'razorpay' && providerInfo?.configured ? 'bg-success shadow-success/20' : 'bg-brand shadow-brand/20'}`}></span>
              <span className="font-semibold text-text-primary text-sm tracking-wide">
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
            <div className="bg-background border border-border p-4 rounded-md overflow-hidden">
              <span className="text-[10px] text-text-muted uppercase block font-bold tracking-wider">Razorpay Key ID</span>
              <span className="font-mono text-text-secondary text-sm mt-1.5 block truncate" title={providerInfo.key_id}>{providerInfo.key_id}</span>
            </div>
          )}

          {/* Security Assurance Notice */}
          <Alert type="info">
            <strong>Security Policy:</strong> API secrets and merchant private tokens are never exposed in the browser. Credentials validation is handled strictly on the server side.
          </Alert>
        </div>
      </div>
    </div>
  );
}
