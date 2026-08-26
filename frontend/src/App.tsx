import { useState, useEffect, useCallback } from 'react'
import AppShell from './components/layout/AppShell'
import type { Tab } from './components/layout/AppShell'
import OverviewPage from './components/dashboard/OverviewPage'
import RecoveryCasesPage from './components/cases/RecoveryCasesPage'
import CaseDetailExperience from './components/cases/CaseDetailExperience'
import RecommendationsPage from './components/recommendations/RecommendationsPage'
import ActivityEventsPage from './components/events/ActivityEventsPage'
import WebhooksPage from './components/webhooks/WebhooksPage'
import GuardrailsPage from './components/guardrails/GuardrailsPage'
import ConfigurationPage from './components/config/ConfigurationPage'
import SimulationPage from './components/simulation/SimulationPage'
import { LoadingState, ErrorState } from './components/common/LoaderAndStates'

import {
  getIntelligenceSummary,
  getLeakage,
  getPriorities,
  getRecoveryCases,
  getCaseDetail,
  getCaseLifecycle,
  getCaseAttempts,
  getRecoveryStatistics,
  getRecommendations,
  getRecommendation,
  getRevenueEvents,
  getAuditLogs,
  proposeRecoveryAction,
  executeRecoveryAction,
  getMerchantConfig,
  updateMerchantConfig,
  getProviderInfo,
  getCaseStrategy,
  getOrchestrationState
} from './api'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)

  // Global Sync States
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [apiConnected, setApiConnected] = useState(true)

  // Data Store States
  const [summary, setSummary] = useState<any>(null)
  const [leakage, setLeakage] = useState<any[]>([])
  const [priorities, setPriorities] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [merchantConfig, setMerchantConfig] = useState<any>(null)
  const [providerInfo, setProviderInfo] = useState<any>(null)

  // Selected Case Telemetry Detail States
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailSuccess, setDetailSuccess] = useState<string | null>(null)
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<any>(null)
  const [caseActions, setCaseActions] = useState<any[]>([])
  const [caseStatus, setCaseStatus] = useState<string | null>(null)
  const [caseLifecycle, setCaseLifecycle] = useState<any>(null)
  const [caseAttempts, setCaseAttempts] = useState<any[]>([])
  const [caseRecommendation, setCaseRecommendation] = useState<any>(null)
  const [caseStrategy, setCaseStrategy] = useState<any>(null)
  const [orchestrationState, setOrchestrationState] = useState<any>(null)
  const [auditHistory, setAuditHistory] = useState<any[]>([])

  // Action proposing / executing states
  const [proposing, setProposing] = useState(false)
  const [proposedActionType, setProposedActionType] = useState('RETRY_PAYMENT')
  const [executingActionId, setExecutingActionId] = useState<string | null>(null)
  const [simulateFailure, setSimulateFailure] = useState(false)

  // Fetch all global data for the Operations Console
  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        summaryData,
        leakageData,
        prioritiesData,
        casesData,
        statsData,
        recsData,
        eventsData,
        logsData,
        configData,
        providerData
      ] = await Promise.all([
        getIntelligenceSummary(),
        getLeakage(),
        getPriorities(),
        getRecoveryCases(),
        getRecoveryStatistics(),
        getRecommendations(),
        getRevenueEvents(),
        getAuditLogs(),
        getMerchantConfig("11111111-1111-1111-1111-111111111111"),
        getProviderInfo()
      ])

      setSummary(summaryData)
      setLeakage(leakageData)
      setPriorities(prioritiesData)
      setCases(casesData)
      setStats(statsData)
      setRecommendations(recsData)
      setEvents(eventsData)
      setAuditLogs(logsData)
      setMerchantConfig(configData)
      setProviderInfo(providerData)
      setLastRefreshed(new Date())
      setApiConnected(true)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Could not fetch sentinel operations data.')
      setApiConnected(false)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch telemetry details for a single selected recovery case
  const fetchCaseDetailData = useCallback(async (caseId: string) => {
    setDetailLoading(true)
    setDetailError(null)
    try {
      const [
        intelData,
        detailRes,
        lifecycleData,
        attemptsData
      ] = await Promise.all([
        getCaseDetail(caseId), // RecoveryCaseDetailResponse contains case, actions, audit_history
        getCaseDetail(caseId),
        getCaseLifecycle(caseId),
        getCaseAttempts(caseId)
      ])

      // Load advisory recommendation (recovers 404/400 for resolved cases gracefully)
      let recData = null
      try {
        const recResponse = await getRecommendation(caseId)
        recData = recResponse.recommendation
      } catch (e) {
        // Suppress errors for resolved cases since they don't have recommendations
      }

      // Load optimized strategy (F11)
      let strategyData = null
      try {
        strategyData = await getCaseStrategy(caseId)
      } catch (e) {
        // Suppress errors for resolved cases
      }

      // Load orchestration state (F13)
      let orchestrationData = null
      try {
        orchestrationData = await getOrchestrationState(caseId)
      } catch (e) {
        // Suppress errors
      }

      setSelectedCaseDetail(intelData.case ? {
        case_id: intelData.case.id,
        amount_at_risk: intelData.case.amount_at_risk,
        risk_level: intelData.case.risk_level,
        // Mock driver scores or read values if available, otherwise read from Priorities
        priority_score: priorities.find(p => p.case_id === caseId)?.priority_score || 0,
        priority_breakdown: priorities.find(p => p.case_id === caseId)?.priority_breakdown || {
          risk_severity_score: intelData.case.risk_level === 'CRITICAL' ? 100 : intelData.case.risk_level === 'HIGH' ? 75 : 50,
          amount_score: 50,
          age_score: 50,
          failure_count_score: 50,
          recovery_opportunity_score: 100
        },
        reasons: priorities.find(p => p.case_id === caseId)?.reasons || [
          { message: `Case risk categorized as ${intelData.case.risk_level}`, type: 'risk' }
        ],
        time_sensitivity: priorities.find(p => p.case_id === caseId)?.time_sensitivity || { category: 'N/A' },
        estimated_recoverable: priorities.find(p => p.case_id === caseId)?.estimated_recoverable || intelData.case.amount_at_risk
      } : null)

      setCaseActions(detailRes.actions || [])
      setCaseStatus(detailRes.case?.status || null)
      setCaseLifecycle(lifecycleData)
      setCaseAttempts(attemptsData || [])
      setCaseRecommendation(recData)
      setCaseStrategy(strategyData)
      setOrchestrationState(orchestrationData)
      setAuditHistory(detailRes.audit_history || [])
      setApiConnected(true)
    } catch (err: any) {
      console.error(err)
      setDetailError(err.message || 'Failed to fetch case telemetry logs.')
    } finally {
      setDetailLoading(false)
    }
  }, [priorities])

  // Propose action controls
  const handleProposeAction = async () => {
    if (!selectedCaseId) return
    setProposing(true)
    setDetailError(null)
    setDetailSuccess(null)
    try {
      await proposeRecoveryAction(selectedCaseId, proposedActionType)
      setDetailSuccess(`Action proposed successfully and evaluated against guardrails.`)
      setTimeout(() => setDetailSuccess(null), 5000)
      await Promise.all([
        fetchCaseDetailData(selectedCaseId),
        fetchDashboardData()
      ])
    } catch (err: any) {
      console.error(err)
      setDetailError(err.message || 'Failed to propose action under guardrails.')
    } finally {
      setProposing(false)
    }
  }

  // Execute action controls
  const handleExecuteAction = async (actionId: string) => {
    if (!selectedCaseId) return
    setExecutingActionId(actionId)
    setDetailError(null)
    setDetailSuccess(null)
    try {
      const res = await executeRecoveryAction(selectedCaseId, actionId, simulateFailure)
      setDetailSuccess(`Execution succeeded! Outcome: ${res.status || 'EXECUTED'}. Reference ID: ${res.transaction_id || 'N/A'}`)
      setTimeout(() => setDetailSuccess(null), 6000)
      await Promise.all([
        fetchCaseDetailData(selectedCaseId),
        fetchDashboardData()
      ])
      setSimulateFailure(false)
    } catch (err: any) {
      console.error(err)
      setDetailError(err.message || 'Execution failed under guardrail check.')
    } finally {
      setExecutingActionId(null)
    }
  }

  // Save merchant config settings
  const handleSaveConfig = async (updatedConfig: any) => {
    setError(null)
    try {
      const saved = await updateMerchantConfig("11111111-1111-1111-1111-111111111111", updatedConfig)
      setMerchantConfig(saved)
      await fetchDashboardData()
    } catch (err: any) {
      console.error(err)
      throw err
    }
  }

  // Handle case inspection selections
  const handleInspectCase = (caseId: string) => {
    setSelectedCaseId(caseId)
    setActiveTab('cases')
  }

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  useEffect(() => {
    if (selectedCaseId) {
      fetchCaseDetailData(selectedCaseId)
    } else {
      setSelectedCaseDetail(null)
      setCaseActions([])
      setCaseStatus(null)
      setCaseLifecycle(null)
      setCaseAttempts([])
      setCaseRecommendation(null)
      setCaseStrategy(null)
      setOrchestrationState(null)
      setAuditHistory([])
    }
  }, [selectedCaseId, fetchCaseDetailData])

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={(t) => {
        setActiveTab(t)
        if (t !== 'cases') {
          setSelectedCaseId(null)
        }
      }}
      loading={loading}
      onRefresh={fetchDashboardData}
      lastRefreshed={lastRefreshed}
      apiConnected={apiConnected}
    >
      {error && (
        <ErrorState
          message={error}
          onRetry={fetchDashboardData}
        />
      )}

      {loading ? (
        <LoadingState />
      ) : selectedCaseId ? (
        <CaseDetailExperience
          caseId={selectedCaseId}
          detailLoading={detailLoading}
          selectedCaseDetail={selectedCaseDetail}
          caseActions={caseActions}
          caseStatus={caseStatus}
          caseLifecycle={caseLifecycle}
          caseAttempts={caseAttempts}
          caseRecommendation={caseRecommendation}
          caseStrategy={caseStrategy}
          orchestrationState={orchestrationState}
          auditHistory={auditHistory}
          detailError={detailError}
          detailSuccess={detailSuccess}
          proposing={proposing}
          proposedActionType={proposedActionType}
          setProposedActionType={setProposedActionType}
          handleProposeAction={handleProposeAction}
          executingActionId={executingActionId}
          simulateFailure={simulateFailure}
          setSimulateFailure={setSimulateFailure}
          handleExecuteAction={handleExecuteAction}
          onBack={() => setSelectedCaseId(null)}
        />
      ) : activeTab === 'overview' ? (
        <OverviewPage
          summary={summary}
          leakage={leakage}
          priorities={priorities}
          stats={stats}
          onSelectCase={handleInspectCase}
        />
      ) : activeTab === 'cases' ? (
        <RecoveryCasesPage
          cases={cases}
          priorities={priorities}
          onSelectCase={setSelectedCaseId}
        />
      ) : activeTab === 'recommendations' ? (
        <RecommendationsPage
          recommendations={recommendations}
          onSelectCase={handleInspectCase}
        />
      ) : activeTab === 'events' ? (
        <ActivityEventsPage
          events={events}
          auditLogs={auditLogs}
        />
      ) : activeTab === 'webhooks' ? (
        <WebhooksPage
          events={events}
          providerInfo={providerInfo}
          onRefresh={fetchDashboardData}
        />
      ) : activeTab === 'guardrails' ? (
        <GuardrailsPage
          merchantConfig={merchantConfig}
          auditLogs={auditLogs}
          onSelectCase={handleInspectCase}
        />
      ) : activeTab === 'simulation' ? (
        <SimulationPage
          cases={cases}
        />
      ) : (
        <ConfigurationPage
          merchantConfig={merchantConfig}
          providerInfo={providerInfo}
          onSaveConfig={handleSaveConfig}
        />
      )}
    </AppShell>
  )
}

export default App
