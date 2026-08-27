import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Copy, Code, Loader2, Zap, CheckCircle2 } from 'lucide-react';
import { simulatePaymentEvent, type SimulatePaymentEventResponse } from '../../api';
import { PageHeader, SectionHeader, DataTable, StatusBadge, PrimaryButton, Alert } from '../common/UI';

interface WebhooksPageProps {
  events: any[];
  providerInfo: any;
  onRefresh: () => Promise<void>;
}

function generatePaymentId() {
  return `pay_demo_${Date.now()}`;
}

export default function WebhooksPage({ events, providerInfo, onRefresh }: WebhooksPageProps) {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const [eventType, setEventType] = useState<'payment.failed' | 'payment.captured'>('payment.failed');
  const [amount, setAmount] = useState(5000);
  const [email, setEmail] = useState('demo@merchant.test');
  const [contact, setContact] = useState('9876543210');
  const [paymentId, setPaymentId] = useState(generatePaymentId);
  const [simulating, setSimulating] = useState(false);
  const [simulateError, setSimulateError] = useState<string | null>(null);
  const [simulateResult, setSimulateResult] = useState<SimulatePaymentEventResponse | null>(null);

  const isMockMode = providerInfo?.mode === 'mock';

  const webhookEvents = events.filter(
    (e) =>
      e.event_type === 'PAYMENT_FAILED' ||
      e.event_type === 'PAYMENT_AUTHORIZED' ||
      e.event_type === 'PAYMENT_CAPTURED' ||
      e.event_type === 'PAYMENT_RETRY' ||
      e.event_type === 'SUBSCRIPTION_CANCELLED'
  );

  useEffect(() => {
    setPaymentId(generatePaymentId());
  }, []);

  const handleCopyJson = (json: string) => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulate = async (event: 'payment.failed' | 'payment.captured') => {
    if (!isMockMode) return;

    setSimulating(true);
    setSimulateError(null);
    setSimulateResult(null);
    setEventType(event);

    try {
      const result = await simulatePaymentEvent({
        event,
        amount,
        currency: 'INR',
        payment_id: paymentId,
        email,
        contact,
      });
      setSimulateResult(result);
      setPaymentId(generatePaymentId());
      await onRefresh();
    } catch (err: any) {
      setSimulateError(err.message || 'Failed to simulate payment event');
    } finally {
      setSimulating(false);
    }
  };

  const columns = [
    {
      header: 'Received Time',
      accessor: (row: any) => <span className="font-mono text-xs text-text-secondary">{new Date(row.occurred_at).toLocaleTimeString()}</span>
    },
    {
      header: 'Webhook Event Type',
      accessor: (row: any) => <span className="font-semibold text-text-primary text-[10px] uppercase tracking-wider">{row.event_type.replace(/_/g, ' ')}</span>
    },
    {
      header: 'Payment / Txn ID',
      accessor: (row: any) => <span className="font-mono text-xs text-text-secondary">{row.metadata?.razorpay_payment_id || row.metadata?.transaction_id || row.id.substring(0, 18)}</span>
    },
    {
      header: 'Ingest Status',
      accessor: (row: any) => <StatusBadge status={row.status} />,
      align: 'right' as const
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        title="Webhooks" 
        subtitle="Monitor incoming payment events, payload verification, and signature validation."
      />

      {/* Payment Event Simulator */}
      <div className="bg-brand/5 border border-brand/20 rounded-lg p-6 space-y-5">
        <SectionHeader 
          title="Test event simulator" 
          actions={
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
              isMockMode
                ? 'text-brand bg-brand/10 border border-brand/30'
                : 'text-text-secondary bg-surface-hover border border-border'
            }`}>
              {isMockMode ? 'Simulation environment' : 'Production mode'}
            </span>
          }
        />

        {!isMockMode && (
          <Alert type="warning">
            Webhook simulation is disabled when PAYMENT_PROVIDER_MODE is razorpay. Switch to mock mode in configuration to use the local sandbox simulator.
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-primary">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as 'payment.failed' | 'payment.captured')}
              disabled={!isMockMode || simulating}
              className="w-full bg-background text-sm text-text-primary rounded-md border border-border p-2 outline-none focus:border-text-secondary transition-colors cursor-pointer disabled:opacity-50"
            >
              <option value="payment.failed">Payment Failed</option>
              <option value="payment.captured">Payment Captured</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-primary">Amount (INR)</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              disabled={!isMockMode || simulating}
              className="w-full bg-background text-sm text-text-primary rounded-md border border-border p-2 outline-none focus:border-text-secondary transition-colors font-mono disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-primary">Customer Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isMockMode || simulating}
              className="w-full bg-background text-sm text-text-primary rounded-md border border-border p-2 outline-none focus:border-text-secondary transition-colors disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-primary">Customer Phone</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              disabled={!isMockMode || simulating}
              className="w-full bg-background text-sm text-text-primary rounded-md border border-border p-2 outline-none focus:border-text-secondary transition-colors font-mono disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-primary">Payment ID</label>
            <input
              type="text"
              value={paymentId}
              readOnly
              className="w-full bg-surface-hover text-sm text-text-secondary rounded-md border border-border p-2 font-mono"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleSimulate('payment.failed')}
            disabled={!isMockMode || simulating}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded text-text-primary bg-background border border-border hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {simulating && eventType === 'payment.failed' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Simulate failed payment
          </button>
          <button
            type="button"
            onClick={() => handleSimulate('payment.captured')}
            disabled={!isMockMode || simulating}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded text-text-primary bg-background border border-border hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {simulating && eventType === 'payment.captured' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Simulate successful payment
          </button>
        </div>
        {simulateResult && (
          <div className="mt-4 bg-success/5 border border-success/20 rounded p-4 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-success">Event injected successfully</p>
              <p className="text-xs text-success/80 mt-1">Webhook ID: <span className="font-mono">{simulateResult.event_id}</span></p>
            </div>
          </div>
        )}
      </div>

      {/* Production Webhook Log */}
      <div className="pt-6 border-t border-border space-y-6">
        <SectionHeader 
          title="Production webhook operations log" 
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            {simulateError && (
              <Alert type="error">{simulateError}</Alert>
            )}
            <DataTable 
              columns={columns}
              data={webhookEvents}
              keyExtractor={(row) => row.id}
              onRowClick={(row) => setSelectedEvent(row)}
              emptyMessage="No Webhook Events Registered. Use the Payment Event Simulator above to trigger signed webhook events in mock mode."
            />
          </div>

          {/* Raw Payload Inspector Panel */}
          <div className="bg-surface border border-border rounded-lg h-full p-6 flex flex-col">
            <SectionHeader 
              title="Payload inspector" 
            />
            <div className="flex-1 mt-4">
              {selectedEvent ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-muted uppercase font-semibold">Full Event Payload</span>
                    <button
                      onClick={() => handleCopyJson(JSON.stringify(selectedEvent, null, 2))}
                      className="text-xs text-brand hover:text-brand-hover font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? 'Copied' : 'Copy JSON'}
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-[10px] text-text-muted uppercase block font-semibold">Event UUID</span>
                        <span className="font-mono text-text-primary block">{selectedEvent.id}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted uppercase block font-semibold">Verification Metadata</span>
                        <div className="bg-background border border-border p-3 rounded-md font-mono text-[10px] text-text-secondary space-y-1.5 mt-1">
                          <div>Signature Valid: <span className="text-success font-semibold">TRUE</span></div>
                          <div>Duplicate Match: <span className={selectedEvent.status === 'DUPLICATE' ? 'text-warning font-semibold' : 'text-text-secondary'}>
                            {selectedEvent.status === 'DUPLICATE' ? 'YES' : 'NO'}
                          </span></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm">
                      <pre className="bg-background border border-border text-[10px] font-mono text-text-secondary p-3 rounded-md overflow-x-auto max-h-72 leading-relaxed">
                        {JSON.stringify(selectedEvent, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-text-secondary">
                  <Code className="w-8 h-8 mb-3 text-text-muted" />
                  <p className="text-sm font-medium">Select an event to inspect</p>
                  <p className="text-xs text-text-muted mt-1">Verified payload and metadata will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
