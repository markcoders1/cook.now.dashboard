export type CostUsage = {
  id: string
  installationId: string
  responseId: string
  source: 'realtime' | 'vision'
  model: string
  occurredAt: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUsd: number
  pricingConfigured: boolean
}

export type CostUsageData = {
  summary: {
    requests: number
    totalTokens: number
    estimatedCostUsd: number
    pricingComplete: boolean
  }
  items: CostUsage[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type CostUsageResult = {
  data: CostUsageData
  rateCardVersion: string
}

export type CostQuery = {
  search?: string
  installationId?: string
  model?: string
  source?: 'realtime' | 'vision'
  sortBy?: 'occurredAt' | 'totalTokens' | 'estimatedCostUsd'
  sortDirection?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export type InstallationCost = {
  installationId: string
  platform: 'ios' | 'android'
  appVersion: string
  locale: string
  requests: number
  realtimeRequests: number
  visionRequests: number
  totalTokens: number
  estimatedCostUsd: number
  pricingComplete: boolean
  lastActivityAt: string | null
}

export type InstallationCostData = {
  summary: {
    installations: number
    requests: number
    totalTokens: number
    estimatedCostUsd: number
  }
  items: InstallationCost[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type InstallationCostResult = {
  data: InstallationCostData
  rateCardVersion: string
}

export type InstallationQuery = {
  search?: string
  platform?: 'ios' | 'android'
  sortBy?: 'estimatedCostUsd' | 'totalTokens' | 'requests' | 'lastActivityAt'
  sortDirection?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export type ModelCost = {
  model: string
  requests: number
  realtimeRequests: number
  visionRequests: number
  totalTokens: number
  estimatedCostUsd: number
  pricingComplete: boolean
  lastActivityAt: string | null
}

export type ModelCostData = {
  summary: {
    models: number
    requests: number
    totalTokens: number
    estimatedCostUsd: number
  }
  items: ModelCost[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type ModelCostResult = {
  data: ModelCostData
  rateCardVersion: string
}

export type ModelQuery = {
  search?: string
  source?: 'realtime' | 'vision'
  sortBy?: 'estimatedCostUsd' | 'totalTokens' | 'requests' | 'lastActivityAt'
  sortDirection?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export type OpenAiOrgCostDay = {
  date: string
  costUsd: number
}

export type OpenAiOrgModelUsage = {
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  requests: number
}

export type OpenAiOrgSummary = {
  totalCostUsd: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  totalRequests: number
  days: number
  startTime: string
  endTime: string
}

export type OpenAiOrgReport = {
  configured: boolean
  summary: OpenAiOrgSummary | null
  dailyCosts: OpenAiOrgCostDay[]
  usageByModel: OpenAiOrgModelUsage[]
}

export type OpenAiOrgResult = {
  data: OpenAiOrgReport
}

export type ConversationTurn = {
  id: string
  installationId: string
  sessionId: string
  role: 'user' | 'assistant'
  text: string
  occurredAt: string
  responseId?: string
}

export type ConversationTextItem = ConversationTurn & {
  kind: 'text'
}

export type ConversationImageItem = {
  kind: 'image'
  id: string
  installationId: string
  sessionId: string
  occurredAt: string
  stepId: string
  question?: string
  imageUrl: string
}

export type ConversationTimelineItem =
  | ConversationTextItem
  | ConversationImageItem

export type InstallationSessionSummary = {
  sessionId: string
  recipeId: string
  recipeName: string
  status: string
  turnCount: number
  lastActivityAt: string | null
  startedAt: string
}

export type InstallationDetail = {
  installationId: string
  platform: 'ios' | 'android'
  appVersion: string
  locale: string
  createdAt: string
  turnCount: number
  sessionCount: number
  sessions: InstallationSessionSummary[]
}

export type ConversationTurnsData = {
  items: ConversationTimelineItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type InstallationDetailResult = {
  data: InstallationDetail
}

export type ConversationTurnsResult = {
  data: ConversationTurnsData
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
  'http://localhost:4000'

async function fetchAdminJson<T>(
  path: string,
  adminKey: string,
  query: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  const search = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value))
  })
  const suffix = search.size > 0 ? `?${search.toString()}` : ''
  const response = await fetch(`${API_BASE_URL}${path}${suffix}`, {
    headers: { 'X-Admin-Key': adminKey },
    signal,
  })
  if (!response.ok) {
    let message = `API request failed (${response.status})`
    try {
      const body = (await response.json()) as {
        error?: { message?: string }
      }
      message = body.error?.message ?? message
    } catch {
      // Keep the status-based fallback for non-JSON errors.
    }
    throw new Error(message)
  }
  return (await response.json()) as T
}

export async function fetchUsageCosts(
  adminKey: string,
  query: CostQuery,
  signal?: AbortSignal,
): Promise<CostUsageResult> {
  return fetchAdminJson('/v1/admin/ai-cost/usage', adminKey, query, signal)
}

export async function verifyAdminKey(
  adminKey: string,
  signal?: AbortSignal,
): Promise<void> {
  await fetchAdminJson(
    '/v1/admin/ai-cost/usage',
    adminKey,
    { page: 1, pageSize: 1 },
    signal,
  )
}

export async function fetchInstallationCosts(
  adminKey: string,
  query: InstallationQuery,
  signal?: AbortSignal,
): Promise<InstallationCostResult> {
  return fetchAdminJson(
    '/v1/admin/ai-cost/installations',
    adminKey,
    query,
    signal,
  )
}

export async function fetchModelCosts(
  adminKey: string,
  query: ModelQuery,
  signal?: AbortSignal,
): Promise<ModelCostResult> {
  return fetchAdminJson('/v1/admin/ai-cost/models', adminKey, query, signal)
}

export async function fetchOpenAiOrgCosts(
  adminKey: string,
  days = 7,
  signal?: AbortSignal,
): Promise<OpenAiOrgResult> {
  return fetchAdminJson(
    '/v1/admin/ai-cost/openai-org',
    adminKey,
    { days },
    signal,
  )
}

export async function fetchInstallationDetail(
  adminKey: string,
  installationId: string,
  signal?: AbortSignal,
): Promise<InstallationDetailResult> {
  return fetchAdminJson(
    `/v1/admin/installations/${encodeURIComponent(installationId)}`,
    adminKey,
    {},
    signal,
  )
}

export async function fetchInstallationConversations(
  adminKey: string,
  installationId: string,
  query: { sessionId?: string; page?: number; pageSize?: number },
  signal?: AbortSignal,
): Promise<ConversationTurnsResult> {
  return fetchAdminJson(
    `/v1/admin/installations/${encodeURIComponent(installationId)}/conversations`,
    adminKey,
    query,
    signal,
  )
}

export async function fetchSessionCaptureImageBlob(
  adminKey: string,
  imageUrl: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}${imageUrl}`, {
    headers: { 'X-Admin-Key': adminKey },
    signal,
  })
  if (!response.ok) {
    throw new Error(`Capture image request failed (${response.status})`)
  }
  return response.blob()
}
