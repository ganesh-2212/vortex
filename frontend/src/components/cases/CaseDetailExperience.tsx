import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Check,
  XCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Activity,
  Loader2,
  CheckCircle,
  Lock
} from 'lucide-react'
import { FinancialValue } from '../common/FinancialValue'
import { formatCurrency } from '../../utils/formatters'
import { createPaymentOrder, verifyPayment, getCaseDiagnosis } from '../../api'

interface CaseDetailExperienceProps {
  caseId: string
  detailLoading: boolean
  selectedCaseDetail: any
  caseActions: any[]
  caseStatus: string | null
  caseLifecycle: any
  caseAttempts: any[]
  caseRecommendation: any
  caseStrategy?: any
  orchestrationState?: any
  historicalEvidence?: any
  decisionExplanation?: any
  auditHistory?: any[]
  detailError: string | null
  detailSuccess: string | null
  proposing: boolean
  proposedActionType: string
  setProposedActionType: (action: string) => void
  handleProposeAction: () => void
  executingActionId: string | null
  simulateFailure: boolean
  setSimulateFailure: (sim: boolean) => void
  handleExecuteAction: (actionId: string) => void
  onBack: () => void
  onRefreshData?: () => void
}

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function CaseDetailExperience({
  caseId,
  detailLoading,
  selectedCaseDetail,
  caseStatus,
  caseStrategy,
  decisionExplanation,
  auditHistory = [],
  detailError,
  detailSuccess,
  proposing,
  proposedActionType,
  setProposedActionType,
  handleProposeAction,
  onBack,
  onRefreshData
}: CaseDetailExperienceProps) {
  const [paymentState, setPaymentState] = useState<'idle' | 'processing' | 'verifying' | 'success' | 'failure' | 'cancelled'>('idle')
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null)

  // AI Diagnosis State
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false)
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDiagnosis() {
      if (!caseId) return
      setLoadingDiagnosis(true)
      setDiagnosisError(null)
      try {
        const result = await getCaseDiagnosis(caseId)
        setDiagnosis(result)
      } catch (err: any) {
        setDiagnosisError(err.message || 'Diagnosis unavailable')
      } finally {
        setLoadingDiagnosis(false)
      }
    }
    fetchDiagnosis()
  }, [caseId])

  // Force 'success' state if case is already recovered
  useEffect(() => {
    if (caseStatus === 'RECOVERED' && paymentState !== 'success') {
      setPaymentState('success')
    }
  }, [caseStatus, paymentState])

  if (detailLoading || (!selectedCaseDetail && !detailError)) {
    return (
      <div className="bg-white dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-dark rounded-xl p-8 shadow-sm flex items-center justify-center min-h-[400px] transition-colors duration-200">
        <div className="flex flex-col items-center text-slate-500 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400 mb-4" />
          <p className="text-[13px] font-bold uppercase tracking-widest">Fetching case operational telemetry logs...</p>
        </div>
      </div>
    )
  }

  if (detailError && !selectedCaseDetail) {
    return (
      <div className="bg-white dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-dark rounded-xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[400px] transition-colors duration-200">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{detailError}</span>
        </div>
        <button onClick={onBack} className="mt-6 text-purple-600 hover:text-purple-700 font-bold text-sm">Return to Queues</button>
      </div>
    )
  }

  // Risk Level Badge Generator
  const getRiskColor = (level: string) => {
    switch(level) {
      case 'CRITICAL': return 'bg-rose-100 text-rose-800 border-rose-200'
      case 'HIGH': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'MEDIUM': return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'LOW': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  // Status Badge Generator
  const getStatusColor = (status: string | null) => {
    switch(status) {
      case 'OPEN': return 'bg-slate-100 text-slate-700 border-slate-200'
      case 'RECOVERING': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'RECOVERED': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  // Execute Payment Flow
  const executePayment = async () => {
    setPaymentState('processing');
    setPaymentErrorMessage(null);
    try {
      const isLoaded = await new Promise((resolve) => {
        if (window.Razorpay) {
          resolve(true);
          return;
        }
        
        const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve(!!window.Razorpay));
          existingScript.addEventListener('error', () => resolve(false));
          
          // If document is complete and it was the initial script, it already failed or loaded without Razorpay
          if (document.readyState === 'complete' && !existingScript.hasAttribute('data-loading')) {
            resolve(false);
          }
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.setAttribute('data-loading', 'true');
        script.onload = () => {
          script.removeAttribute('data-loading');
          resolve(!!window.Razorpay);
        };
        script.onerror = () => {
          script.removeAttribute('data-loading');
          resolve(false);
        };
        document.body.appendChild(script);
      });

      if (!isLoaded || !window.Razorpay) {
        throw new Error("Razorpay Checkout failed to load. Please check your connection and try again.");
      }

      const order = await createPaymentOrder(caseId);
      const options = {
        key: order.key_id,
        amount: order.amount_paise,
        currency: order.currency,
        name: 'VORTEX',
        description: 'Revenue Recovery',
        order_id: order.order_id,
        handler: async function (response: any) {
          setPaymentState('verifying');
          try {
            await verifyPayment(caseId, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });
            setPaymentState('success');
            if (onRefreshData) onRefreshData();
          } catch (e: any) {
            console.error("Payment verification failed", e);
            setPaymentState('failure');
            setPaymentErrorMessage(e.message || 'Payment verification failed.');
          }
        },
        prefill: {
          name: selectedCaseDetail?.customer?.name || '',
          email: selectedCaseDetail?.customer?.email || '',
          contact: selectedCaseDetail?.customer?.phone || ''
        },
        theme: { color: '#7e22ce' },
        modal: { 
          ondismiss: function() { 
            setPaymentState('cancelled'); 
            setPaymentErrorMessage('Payment cancelled.');
          } 
        }
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error('Payment failed', response.error);
        setPaymentState('failure');
        setPaymentErrorMessage('Payment failed. Please try again.');
      });
      rzp.open();
    } catch (err: any) {
      console.error('Failed to init Razorpay checkout', err);
      setPaymentState('failure');
      let errMsg = err.message || 'Failed to initialize payment.';
      if (errMsg.toLowerCase().includes('authentication failed') || errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('bad request')) {
        errMsg = 'Razorpay test payment was declined. Please retry with a valid Test Mode payment method.';
      }
      setPaymentErrorMessage(errMsg);
    }
  }

  // Build the Why This Case Matters text
  let whyMatters = `Payment failure created ${formatCurrency(selectedCaseDetail.amount_at_risk)} of recoverable exposure.`
  if (selectedCaseDetail.reasons && selectedCaseDetail.reasons.length > 0) {
    whyMatters += ` ${selectedCaseDetail.reasons[0].message}`
  }

  // Button text logic
  let btnText = "Recover Revenue"
  if (paymentState === 'processing') btnText = "Preparing secure payment..."
  if (paymentState === 'verifying') btnText = "Verifying payment..."
  if (paymentState === 'success') btnText = "Recovery Confirmed"

  const orchDecision = decisionExplanation?.orchestration_decision
  const orchReason = decisionExplanation?.orchestration_reason
  const strategySelected = decisionExplanation?.strategy_selected
  const guardrailStatus = decisionExplanation?.guardrail_status

  // Recommendation logic
  let recTitle = 'RETRY PAYMENT'
  let recExplanation = 'A payment retry is permitted by the recovery policy and is the fastest bounded intervention available for recovering this revenue.'

  if (orchDecision === 'ESCALATE_TO_HUMAN' || caseStatus === 'ESCALATED') {
    recTitle = 'ESCALATE TO HUMAN'
    recExplanation = orchReason || 'Automated recovery is not appropriate or has reached a policy boundary and human intervention is required.'
  } else if (orchDecision === 'STOP_RECOVERY' || caseStatus === 'STOPPED') {
    recTitle = 'STOP RECOVERY'
    recExplanation = orchReason || 'Policy/guardrails require recovery to stop.'
  } else {
    recTitle = 'RETRY PAYMENT'
    if (orchReason) {
      recExplanation = `A payment retry is permitted by the recovery policy and is the fastest bounded intervention available for recovering this revenue. Context: ${orchReason}`
    }
  }

  const isRecoverableState = caseStatus !== 'RECOVERED' && caseStatus !== 'STOPPED' && caseStatus !== 'ESCALATED'
  const isAutomatedRetry = strategySelected === 'IMMEDIATE_RETRY' || strategySelected === 'DELAYED_RETRY'
  const isActionExecute = orchDecision === 'EXECUTE_NOW' || orchDecision === 'SCHEDULE_RETRY'
  const isGuardrailAllowed = guardrailStatus === 'ALLOWED'
  
  const isRecoveryReady = isRecoverableState && isAutomatedRetry && isActionExecute && isGuardrailAllowed

  return (
    <div className="space-y-6 text-left pb-12 max-w-[900px] mx-auto w-full">
      {/* Back controls */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-xs font-semibold text-purple-600 hover:text-purple-800 transition cursor-pointer uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4" /> Back to Queues
        </button>
      </div>

      {detailError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{detailError}</span>
        </div>
      )}

      {/* ========================================== */}
      {/* HERO SECTION */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-brand-surface-dark rounded-xl border border-slate-200 dark:border-brand-border-dark shadow-sm overflow-hidden transition-colors duration-200">
        
        {/* CASE HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-brand-border-dark bg-slate-50 dark:bg-brand-card-dark transition-colors duration-200">
          <div>
            <h2 className="text-[14px] font-bold text-slate-900 dark:text-white tracking-tight uppercase">Case Reference: {caseId}</h2>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">{selectedCaseDetail.customer?.name || 'Acme Corp'}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusColor(caseStatus)}`}>
            {caseStatus || 'OPEN'}
          </span>
        </div>

        <div className="p-8 space-y-10">
          
          {/* REVENUE AT RISK & RISK LEVEL */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Recoverable Revenue At Risk</span>
              <FinancialValue value={formatCurrency(selectedCaseDetail.amount_at_risk)} size="hero" className="text-slate-900 dark:text-white" />
            </div>
            
            <div className="flex flex-col gap-1 md:items-end">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Risk Level</span>
              <span className={`px-3 py-1 rounded text-[11px] font-bold uppercase tracking-widest border ${getRiskColor(selectedCaseDetail.risk_level)}`}>
                {selectedCaseDetail.risk_level}
              </span>
            </div>
          </div>

          {/* WHY THIS CASE MATTERS */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Why This Case Matters
            </span>
            <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-brand-card-dark p-4 rounded-lg border border-slate-100 dark:border-brand-border-dark transition-colors duration-200">
              {whyMatters}
            </p>
          </div>

          {/* VORTEX RECOMMENDATION */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" /> VORTEX Recommendation
            </span>
            <div className={`p-5 rounded-lg border transition-colors duration-200 ${recTitle === 'RETRY PAYMENT' ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'} dark:bg-brand-card-dark dark:border-brand-border-dark`}>
              <span className={`text-[16px] font-bold uppercase tracking-tight block mb-2 ${recTitle === 'RETRY PAYMENT' ? 'text-purple-900 dark:text-purple-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {recTitle}
              </span>
              <div className={`text-[13px] font-medium space-y-1 ${recTitle === 'RETRY PAYMENT' ? 'text-purple-800' : 'text-slate-700'} dark:text-slate-300`}>
                <span className={`block font-bold text-[11px] uppercase tracking-wider mb-1 ${recTitle === 'RETRY PAYMENT' ? 'text-purple-600 dark:text-purple-500' : 'text-slate-500 dark:text-slate-400'}`}>Why VORTEX recommends this</span>
                <p>{recExplanation}</p>
              </div>
            </div>
          </div>

          {/* DECISION INTELLIGENCE */}
          {caseStrategy && (
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" /> Decision Intelligence
              </span>
              <div className="bg-white dark:bg-brand-card-dark border border-slate-200 dark:border-brand-border-dark rounded-lg p-5 transition-colors duration-200">
                <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium mb-4">
                  VORTEX evaluates eligible recovery strategies using expected recovery, intervention cost, retry history, and merchant guardrails.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Recommended Strategy</span>
                    <span className="text-[13px] font-bold text-purple-900 dark:text-purple-400 uppercase tracking-tight">{caseStrategy.recommended_strategy.replace(/_/g, ' ')}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Probability</span>
                    <span className="text-[14px] font-bold text-slate-900 dark:text-white tabular-nums">{caseStrategy.recovery_probability}%</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Expected Recovery</span>
                    <span className="text-[14px] font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(caseStrategy.expected_recovery_amount)}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Expected Net Recovery</span>
                    <span className="text-[14px] font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(caseStrategy.expected_net_recovery)}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Confidence</span>
                    <span className="text-[14px] font-bold text-slate-900 dark:text-white tabular-nums">{caseStrategy.confidence}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI ROOT-CAUSE DIAGNOSIS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" /> AI Root-Cause Diagnosis
              </span>
              {diagnosis && (
                <span className="text-[9px] bg-slate-100 dark:bg-brand-card-dark text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  {diagnosis.analysis_source || 'AI-assisted diagnosis'}
                </span>
              )}
            </div>
            
            <div className="bg-white dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-dark rounded-lg p-5 transition-colors duration-200">
              {loadingDiagnosis ? (
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-600 dark:text-purple-400" />
                  <span className="text-[13px] font-bold uppercase tracking-widest">Analyzing payment failure...</span>
                </div>
              ) : diagnosisError ? (
                <div className="text-amber-700 dark:text-amber-500 text-[13px] font-medium py-2">
                  {diagnosisError}
                </div>
              ) : diagnosis ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Root Cause</span>
                        <span className="text-[14px] font-bold text-slate-900 dark:text-white leading-snug">{diagnosis.root_cause}</span>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Evidence</span>
                        <ul className="list-disc pl-4 text-[13px] text-slate-700 dark:text-slate-300 font-medium space-y-1">
                          {diagnosis.evidence.map((ev: string, idx: number) => (
                            <li key={idx}>{ev}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Risk Explanation</span>
                        <span className="text-[13px] text-slate-700 dark:text-slate-300 font-medium leading-snug">{diagnosis.risk_explanation}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Next-Best Action</span>
                        <span className="text-[14px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-tight">
                          {diagnosis.recommended_action.replace(/_/g, ' ')}
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Why This Action</span>
                        <span className="text-[13px] text-slate-700 dark:text-slate-300 font-medium leading-snug">{diagnosis.action_reason}</span>
                      </div>

                      <div className="flex items-center gap-6 pt-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Confidence</span>
                          <span className="text-[16px] font-bold text-slate-900 dark:text-white tabular-nums">{diagnosis.confidence}%</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Guardrail</span>
                          <span className={`text-[12px] font-bold uppercase tracking-wider ${diagnosis.guardrail_status.includes('SAFE') ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {diagnosis.guardrail_status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* GUARDRAILS */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-600 dark:text-slate-500" /> VORTEX Guardrails
            </span>
            <div className="bg-white dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-dark rounded-lg p-5 transition-colors duration-200">
              <div className="space-y-3">
                {decisionExplanation?.guardrail_checks?.map((g: any, i: number) => {
                  const isAllowed = g.status === 'ALLOWED'
                  return (
                    <div key={i} className="flex items-start gap-3">
                      {isAllowed ? (
                        <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                      )}
                      <div className="flex flex-col">
                        <span className={`text-[13px] font-bold ${isAllowed ? 'text-slate-900 dark:text-slate-100' : 'text-rose-700 dark:text-rose-400'}`}>{g.guardrail}</span>
                        {!isAllowed && <span className="text-[11px] text-rose-600 dark:text-rose-500 font-medium mt-0.5">{g.explanation}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RECOVERY ACTION CENTER */}
          <div className="pt-8 flex flex-col space-y-4">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Recovery Action Center
            </span>
            <div className="w-full flex flex-col bg-white dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-dark rounded-xl p-8 shadow-sm transition-colors duration-200">
              
              {/* Recommended Action */}
                <div className="mb-8">
                  <h3 className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-5">Recommended Action</h3>
                  
                  {isRecoveryReady ? (
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="flex flex-col flex-1">
                        <span className="text-[14px] font-bold text-purple-900 dark:text-purple-300 uppercase tracking-tight mb-1">RETRY PAYMENT</span>
                        <span className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">Ready to recover {formatCurrency(selectedCaseDetail.amount_at_risk)} through the approved retry strategy.</span>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2 w-full md:w-auto">
                        <button
                          onClick={executePayment}
                          disabled={paymentState === 'processing' || paymentState === 'verifying'}
                          className="w-full px-10 py-3.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold text-[14px] uppercase tracking-wider rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          {(paymentState === 'processing' || paymentState === 'verifying') && <Loader2 className="w-5 h-5 animate-spin" />}
                          {btnText}
                        </button>
                        
                        {(paymentState === 'processing' || paymentState === 'verifying') && (
                          <div className="flex flex-col items-center text-center space-y-1">
                            <span className="bg-slate-100 dark:bg-brand-card-dark text-slate-600 dark:text-slate-300 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded">RAZORPAY TEST MODE</span>
                            <span className="text-[10px] text-slate-400 font-medium">Secret credentials remain server-side.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">RECOVER REVENUE UNAVAILABLE</span>
                      <span className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                        {guardrailStatus !== 'ALLOWED' 
                          ? 'Blocked by guardrails.' 
                          : 'Automated retry is not recommended or not executable at this time.'}
                      </span>
                    </div>
                  )}
                  
                  {(paymentState === 'failure' || paymentState === 'cancelled') && (
                    <div className="text-rose-600 text-[12px] font-bold bg-rose-50 px-4 py-2 rounded-lg border border-rose-200 mt-6 text-center">
                      {paymentErrorMessage || 'Payment Failed or Cancelled. Please try again.'}
                    </div>
                  )}
                </div>
                
                {/* Secondary Actions */}
              {isRecoverableState && (
                <div className="border-t border-slate-100 dark:border-brand-border-dark pt-6">
                  <h3 className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Other Available Actions</h3>
                  
                  <div className="flex flex-col md:flex-row gap-4">
                    <button
                      onClick={() => {
                        setProposedActionType('ESCALATE_TO_HUMAN')
                        handleProposeAction()
                      }}
                      disabled={proposing}
                      className="flex-1 px-6 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-[13px] uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      {proposing && proposedActionType === 'ESCALATE_TO_HUMAN' && <Loader2 className="w-4 h-4 animate-spin" />}
                      Escalate to Human
                    </button>
                    
                    <button
                      onClick={() => {
                        setProposedActionType('STOP_RECOVERY')
                        handleProposeAction()
                      }}
                      disabled={proposing}
                      className="flex-1 px-6 py-3 bg-white dark:bg-brand-surface-dark hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-brand-border-dark hover:border-rose-200 dark:hover:border-rose-700 font-bold text-[13px] uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      {proposing && proposedActionType === 'STOP_RECOVERY' && <Loader2 className="w-4 h-4 animate-spin" />}
                      Stop Recovery
                    </button>
                  </div>
                  
                  {detailSuccess && (
                    <div className="text-emerald-700 text-[12px] font-bold bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-200 mt-4 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0" /> {detailSuccess}
                    </div>
                  )}
                </div>
              )}

              {!isRecoverableState && (
                <div className="border-t border-slate-100 dark:border-brand-border-dark pt-6">
                  <div className="bg-slate-50 dark:bg-brand-card-dark border border-slate-200 dark:border-brand-border-dark rounded-lg p-6 flex flex-col items-center text-center transition-colors duration-200">
                    <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight mb-2">
                      CASE {caseStatus}
                    </span>
                    <span className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                      No further automated recovery actions are available for this case.
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* SUCCESS STATE */}
          {paymentState === 'success' && (
            <div className="pt-6 border-t border-slate-100 dark:border-brand-border-dark animate-in fade-in zoom-in duration-500">
              <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-8 flex flex-col items-center text-center shadow-sm">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-800/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-[14px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest mb-2">RECOVERY CONFIRMED</h3>
                <FinancialValue value={formatCurrency(selectedCaseDetail.recovered_amount || selectedCaseDetail.amount_at_risk)} size="hero" className="text-emerald-900 dark:text-emerald-100 mb-2" />
                <span className="text-[12px] font-medium text-emerald-700 dark:text-emerald-400 mb-6">Recovered revenue</span>
                
                <div className="w-full max-w-sm text-left bg-white dark:bg-brand-surface-dark rounded-lg border border-emerald-100 dark:border-emerald-800/30 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-200">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Payment captured
                  </div>
                  <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-200">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Payment verified
                  </div>
                  <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-200">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Recovery confirmed
                  </div>
                  <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-200">
                    <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Audit recorded
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ========================================== */}
      {/* AUDIT / TIMELINE */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-brand-surface-dark border border-slate-200 dark:border-brand-border-dark rounded-xl p-6 shadow-sm overflow-hidden transition-colors duration-200">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-brand-border-dark pb-4">
          <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-[14px] font-bold text-slate-900 dark:text-white uppercase tracking-widest">Case Audit Timeline</h3>
        </div>
        <div className="relative border-l-2 border-slate-100 dark:border-brand-border-dark ml-3 space-y-8 pb-4">
          {auditHistory.map((log, i) => (
            <div key={log.id} className="relative pl-6 animate-in slide-in-from-left-4 fade-in duration-500" style={{animationDelay: `${i * 100}ms`}}>
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-brand-surface-dark bg-slate-300 dark:bg-slate-600"></div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums tracking-widest uppercase">
                  {new Date(log.created_at).toLocaleString()}
                </span>
                <span className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">{log.action.replace(/_/g, ' ')}</span>
                {log.details && (
                  <span className="text-[12px] text-slate-600 dark:text-slate-300 font-medium">
                    {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                  </span>
                )}
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">
                  Actor: {log.actor_type}
                </span>
              </div>
            </div>
          ))}
          {auditHistory.length === 0 && (
             <div className="pl-6 text-[12px] font-medium text-slate-500 dark:text-slate-400 italic">No events recorded yet.</div>
          )}
        </div>
      </div>

    </div>
  )
}
