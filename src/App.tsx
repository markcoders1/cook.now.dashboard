import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import {
  fetchInstallationCosts,
  fetchOpenAiOrgCosts,
  fetchUsageCosts,
  type CostQuery,
  type CostUsage,
  type CostUsageResult,
  type InstallationCost,
  type InstallationCostResult,
  type InstallationQuery,
  type OpenAiOrgResult,
} from './api'
import DeviceDetailPage from './pages/DeviceDetailPage'
import {
  DailySpendChart,
  ModelUsageChart,
  SourceSplitChart,
  TopInstallationsChart,
} from './components/CostCharts'
import { Brand } from './components/Brand'
import './App.css'

const KEY_STORAGE = 'cook-now-dashboard-admin-key'
const DAILY_SPEND_PAGE_SIZE = 7

const ORG_LOOKBACK_OPTIONS = [
  { days: 7, label: 'Last 7 days' },
  { days: 14, label: 'Last 14 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 3 months' },
  { days: 180, label: 'Last 6 months' },
  { days: 365, label: 'Last 1 year' },
] as const

function App() {
  const [adminKey, setAdminKey] = useState(
    () => sessionStorage.getItem(KEY_STORAGE) ?? '',
  )
  const [draftKey, setDraftKey] = useState('')

  const lockDashboard = () => {
    sessionStorage.removeItem(KEY_STORAGE)
    setAdminKey('')
    setDraftKey('')
  }

  if (!adminKey) {
    return (
      <main className="auth-shell">
        <section className="auth-card" aria-labelledby="auth-title">
          <Brand variant="auth" />
          <div className="auth-copy">
            <span className="eyebrow">Internal analytics</span>
            <h1 id="auth-title">AI cost control center</h1>
            <p>
              Enter the admin key configured on the cook.now API. It is retained
              only for this browser session.
            </p>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const key = draftKey.trim()
              if (!key) return
              sessionStorage.setItem(KEY_STORAGE, key)
              setAdminKey(key)
            }}
          >
            <label htmlFor="admin-key">Admin API key</label>
            <div className="key-row">
              <input
                id="admin-key"
                type="password"
                autoComplete="off"
                value={draftKey}
                onChange={(event) => setDraftKey(event.target.value)}
                placeholder="Enter your key"
                autoFocus
              />
              <button type="submit">Open dashboard</button>
            </div>
          </form>
          <p className="privacy-note">
            The provider API key is never requested or exposed here.
          </p>
        </section>
      </main>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<DashboardHome adminKey={adminKey} onLock={lockDashboard} />}
      />
      <Route
        path="/devices/:installationId"
        element={
          <DeviceDetailPage adminKey={adminKey} onLock={lockDashboard} />
        }
      />
    </Routes>
  )
}

function DashboardHome({
  adminKey,
  onLock,
}: {
  adminKey: string
  onLock: () => void
}) {
  const [query, setQuery] = useState<CostQuery>({
    page: 1,
    pageSize: 20,
    sortBy: 'occurredAt',
    sortDirection: 'desc',
  })
  const [installationQuery, setInstallationQuery] = useState<InstallationQuery>({
    page: 1,
    pageSize: 20,
    sortBy: 'estimatedCostUsd',
    sortDirection: 'desc',
  })
  const [result, setResult] = useState<CostUsageResult>()
  const [installationResult, setInstallationResult] =
    useState<InstallationCostResult>()
  const [chartInstallations, setChartInstallations] =
    useState<InstallationCostResult>()
  const [orgResult, setOrgResult] = useState<OpenAiOrgResult>()
  const [orgDays, setOrgDays] = useState(7)
  const [dailySpendPage, setDailySpendPage] = useState(1)
  const [error, setError] = useState('')
  const [orgError, setOrgError] = useState('')
  const [loading, setLoading] = useState(false)
  const [installationLoading, setInstallationLoading] = useState(false)
  const [orgLoading, setOrgLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [expandedId, setExpandedId] = useState<string>()

  useEffect(() => {
    if (!adminKey) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetchUsageCosts(adminKey, query, controller.signal)
      .then(setResult)
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            failure instanceof Error ? failure.message : 'Unable to load costs',
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [adminKey, query, refreshKey])

  useEffect(() => {
    if (!adminKey) return
    const controller = new AbortController()
    setInstallationLoading(true)
    fetchInstallationCosts(adminKey, installationQuery, controller.signal)
      .then(setInstallationResult)
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            failure instanceof Error
              ? failure.message
              : 'Unable to load installation costs',
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setInstallationLoading(false)
      })
    return () => controller.abort()
  }, [adminKey, installationQuery, refreshKey])

  useEffect(() => {
    if (!adminKey) return
    const controller = new AbortController()
    fetchInstallationCosts(
      adminKey,
      {
        page: 1,
        pageSize: 100,
        sortBy: 'estimatedCostUsd',
        sortDirection: 'desc',
        search: installationQuery.search,
        platform: installationQuery.platform,
      },
      controller.signal,
    )
      .then(setChartInstallations)
      .catch(() => {
        if (!controller.signal.aborted) setChartInstallations(undefined)
      })
    return () => controller.abort()
  }, [
    adminKey,
    installationQuery.search,
    installationQuery.platform,
    refreshKey,
  ])

  useEffect(() => {
    if (!adminKey) return
    const controller = new AbortController()
    setOrgLoading(true)
    setOrgError('')
    fetchOpenAiOrgCosts(adminKey, orgDays, controller.signal)
      .then(setOrgResult)
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setOrgError(
            failure instanceof Error
              ? failure.message
              : 'Unable to load OpenAI organization usage',
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setOrgLoading(false)
      })
    return () => controller.abort()
  }, [adminKey, orgDays, refreshKey])

  useEffect(() => {
    setDailySpendPage(1)
  }, [orgDays, refreshKey])

  const dailySpendPagination = useMemo(() => {
    const dailyCosts = orgResult?.data.dailyCosts ?? []
    const total = dailyCosts.length
    const totalPages = Math.max(1, Math.ceil(total / DAILY_SPEND_PAGE_SIZE))
    const page = Math.min(dailySpendPage, totalPages)
    const start = (page - 1) * DAILY_SPEND_PAGE_SIZE
    return {
      items: dailyCosts.slice(start, start + DAILY_SPEND_PAGE_SIZE),
      page,
      total,
      totalPages,
    }
  }, [dailySpendPage, orgResult?.data.dailyCosts])

  const sourceSplit = useMemo(() => {
    const items = chartInstallations?.data.items ?? []
    return items.reduce(
      (totals, row) => ({
        realtimeRequests: totals.realtimeRequests + row.realtimeRequests,
        visionRequests: totals.visionRequests + row.visionRequests,
      }),
      { realtimeRequests: 0, visionRequests: 0 },
    )
  }, [chartInstallations?.data.items])

  const lastUpdated = useMemo(
    () =>
      result
        ? new Intl.DateTimeFormat(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }).format(new Date())
        : 'Not synced',
    [result],
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Dashboard navigation">
          <a className="nav-item active" href="#usage">
            <span aria-hidden="true">▦</span> AI usage
          </a>
        </nav>
        <div className="sidebar-foot">
          <div className="environment">
            <i aria-hidden="true" />
            API connected
          </div>
          <button className="text-button" onClick={onLock}>
            Lock dashboard
          </button>
        </div>
      </aside>

      <main className="dashboard" id="usage">
        <header className="topbar">
          <div>
            <span className="eyebrow">Operations</span>
            <h1>AI usage costs</h1>
            <p>
              OpenAI organization spend from the admin API, plus app-tracked
              Realtime and vision calls.
            </p>
          </div>
          <button
            className="refresh-button"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={loading || installationLoading || orgLoading}
          >
            <span aria-hidden="true">↻</span>
            {loading || installationLoading || orgLoading ? 'Syncing…' : 'Refresh'}
          </button>
        </header>

        {orgError && (
          <div className="error-banner" role="alert">
            <strong>Could not load OpenAI organization usage.</strong>{' '}
            {orgError}
          </div>
        )}

        <section className="table-card org-card" aria-label="OpenAI organization">
          <div className="table-heading">
            <div>
              <h2>OpenAI organization</h2>
              <p>
                Actual spend and completions usage from your OpenAI account.
              </p>
            </div>
            <div className="filters">
              <select
                aria-label="Organization lookback"
                value={orgDays}
                onChange={(event) => setOrgDays(Number(event.target.value))}
              >
                {ORG_LOOKBACK_OPTIONS.map((option) => (
                  <option key={option.days} value={option.days}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {orgResult?.data.configured === false && (
            <div className="empty-state compact">
              <span>⌁</span>
              <h3>OpenAI admin key not configured</h3>
              <p>
                Set <code>OPENAI_ADMIN_KEY</code> in <code>cook.now/.env</code>{' '}
                and restart the API.
              </p>
            </div>
          )}

          {orgResult?.data.configured && (
            <>
              <section className="metric-grid org-metrics">
                <Metric
                  label="Org spend"
                  value={formatUsd(orgResult.data.summary?.totalCostUsd ?? 0)}
                  note="OpenAI invoice totals"
                  tone="money"
                />
                <Metric
                  label="Completions requests"
                  value={formatNumber(orgResult.data.summary?.totalRequests ?? 0)}
                  note={formatOrgLookback(orgDays)}
                />
                <Metric
                  label="Input tokens"
                  value={formatCompact(
                    orgResult.data.summary?.totalInputTokens ?? 0,
                  )}
                  note="Completions usage API"
                />
                <Metric
                  label="Output tokens"
                  value={formatCompact(
                    orgResult.data.summary?.totalOutputTokens ?? 0,
                  )}
                  note="Completions usage API"
                />
              </section>

              <div className="chart-stack">
                <DailySpendChart data={orgResult.data.dailyCosts} />
              </div>

              <div className="org-grid">
                <ModelUsageChart data={orgResult.data.usageByModel} />
                <div className="org-panel">
                  <h3>Daily spend</h3>
                  <div className="table-wrap compact-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailySpendPagination.items.map((day) => (
                          <tr key={day.date}>
                            <td>{day.date}</td>
                            <td className="cost-cell">{formatUsd(day.costUsd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!orgLoading && orgResult.data.dailyCosts.length === 0 && (
                      <div className="empty-state compact">
                        <p>No spend recorded in this window.</p>
                      </div>
                    )}
                  </div>
                  {orgResult.data.dailyCosts.length > 0 && (
                    <footer className="pagination org-panel-pagination">
                      <p>
                        Showing {dailySpendPagination.items.length} of{' '}
                        {dailySpendPagination.total} days
                      </p>
                      <div>
                        <button
                          type="button"
                          disabled={
                            dailySpendPagination.page <= 1 || orgLoading
                          }
                          onClick={() =>
                            setDailySpendPage((current) => Math.max(1, current - 1))
                          }
                        >
                          Previous
                        </button>
                        <span>
                          Page {dailySpendPagination.page} of{' '}
                          {dailySpendPagination.totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={
                            dailySpendPagination.page >=
                              dailySpendPagination.totalPages || orgLoading
                          }
                          onClick={() =>
                            setDailySpendPage((current) => current + 1)
                          }
                        >
                          Next
                        </button>
                      </div>
                    </footer>
                  )}
                </div>
              </div>
            </>
          )}

          {orgLoading && !orgResult && (
            <div className="loading-state">Loading organization usage…</div>
          )}
        </section>

        {error && (
          <div className="error-banner" role="alert">
            <strong>Could not load usage.</strong> {error}
          </div>
        )}

        <section className="metric-grid" aria-label="App-tracked cost summary">
          <Metric
            label="App estimated spend"
            value={formatUsd(result?.data.summary.estimatedCostUsd ?? 0)}
            note={
              result?.data.summary.pricingComplete === false
                ? 'Some models need rates'
                : 'Configured rate card'
            }
            tone="money"
          />
          <Metric
            label="Tracked requests"
            value={formatNumber(result?.data.summary.requests ?? 0)}
            note={`${installationResult?.data.summary.installations ?? 0} installations`}
          />
          <Metric
            label="Total tokens"
            value={formatCompact(result?.data.summary.totalTokens ?? 0)}
            note="Cached tokens not double-counted"
          />
          <Metric
            label="Rate card"
            value={result?.rateCardVersion ?? '—'}
            note={`Last synced ${lastUpdated}`}
          />
        </section>

        <section className="chart-grid" aria-label="App cost charts">
          <TopInstallationsChart
            data={chartInstallations?.data.items ?? []}
          />
          <SourceSplitChart
            realtimeRequests={sourceSplit.realtimeRequests}
            visionRequests={sourceSplit.visionRequests}
          />
        </section>

        <section className="table-card">
          <div className="table-heading">
            <div>
              <h2>Cost by installation</h2>
              <p>
                Anonymous app installs (`ins_…`). Open a device to view
                conversations or filter the usage ledger below.
              </p>
            </div>
            <div className="filters">
              <label className="search-field">
                <span aria-hidden="true">⌕</span>
                <span className="sr-only">Search installations</span>
                <input
                  type="search"
                  value={installationQuery.search ?? ''}
                  onChange={(event) =>
                    setInstallationQuery((current) => ({
                      ...current,
                      search: event.target.value,
                      page: 1,
                    }))
                  }
                  placeholder="Search installation ID or locale"
                />
              </label>
              <select
                aria-label="Filter by platform"
                value={installationQuery.platform ?? ''}
                onChange={(event) =>
                  setInstallationQuery((current) => ({
                    ...current,
                    platform: event.target.value
                      ? (event.target.value as 'ios' | 'android')
                      : undefined,
                    page: 1,
                  }))
                }
              >
                <option value="">All platforms</option>
                <option value="android">Android</option>
                <option value="ios">iOS</option>
              </select>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Installation</th>
                  <th>Platform</th>
                  <th>Requests</th>
                  <th>Tokens</th>
                  <th>Est. cost</th>
                  <th>Last activity</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {installationResult?.data.items.map((installation) => (
                  <InstallationRow
                    key={installation.installationId}
                    installation={installation}
                    selected={
                      query.installationId === installation.installationId
                    }
                    onSelect={() =>
                      setQuery((current) => ({
                        ...current,
                        installationId: installation.installationId,
                        page: 1,
                      }))
                    }
                  />
                ))}
              </tbody>
            </table>
            {!installationLoading &&
              installationResult?.data.items.length === 0 && (
                <div className="empty-state">
                  <span>◇</span>
                  <h3>No installations yet</h3>
                  <p>Open the mobile app to register an installation.</p>
                </div>
              )}
            {installationLoading && !installationResult && (
              <div className="loading-state">Loading installations…</div>
            )}
          </div>

          <footer className="pagination">
            <p>
              Showing {installationResult?.data.items.length ?? 0} of{' '}
              {installationResult?.data.total ?? 0} installations
            </p>
            <div>
              <button
                disabled={
                  (installationQuery.page ?? 1) <= 1 || installationLoading
                }
                onClick={() =>
                  setInstallationQuery((current) => ({
                    ...current,
                    page: Math.max(1, (current.page ?? 1) - 1),
                  }))
                }
              >
                Previous
              </button>
              <span>
                Page {installationResult?.data.page ?? installationQuery.page ?? 1}{' '}
                of {installationResult?.data.totalPages ?? 1}
              </span>
              <button
                disabled={
                  (installationQuery.page ?? 1) >=
                    (installationResult?.data.totalPages ?? 1) ||
                  installationLoading
                }
                onClick={() =>
                  setInstallationQuery((current) => ({
                    ...current,
                    page: (current.page ?? 1) + 1,
                  }))
                }
              >
                Next
              </button>
            </div>
          </footer>
        </section>

        <section className="table-card">
          <div className="table-heading">
            <div>
              <h2>App usage ledger</h2>
              <p>Each Realtime turn and vision check tracked by cook.now.</p>
              {query.installationId && (
                <p className="filter-chip">
                  Filtered to{' '}
                  <code>{compactId(query.installationId)}</code>
                  <button
                    className="text-button"
                    onClick={() =>
                      setQuery((current) => ({
                        ...current,
                        installationId: undefined,
                        page: 1,
                      }))
                    }
                  >
                    Clear filter
                  </button>
                </p>
              )}
            </div>
            <div className="filters">
              <label className="search-field">
                <span aria-hidden="true">⌕</span>
                <span className="sr-only">Search usage</span>
                <input
                  type="search"
                  value={query.search ?? ''}
                  onChange={(event) =>
                    setQuery((current) => ({
                      ...current,
                      search: event.target.value,
                      page: 1,
                    }))
                  }
                  placeholder="Search model, response, or installation"
                />
              </label>
              <select
                aria-label="Filter by source"
                value={query.source ?? ''}
                onChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    source: event.target.value
                      ? (event.target.value as 'realtime' | 'vision')
                      : undefined,
                    page: 1,
                  }))
                }
              >
                <option value="">All sources</option>
                <option value="realtime">Realtime</option>
                <option value="vision">Vision</option>
              </select>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortableHeader
                    label="When"
                    field="occurredAt"
                    query={query}
                    setQuery={setQuery}
                  />
                  <th>Installation</th>
                  <th>Source</th>
                  <th>Model</th>
                  <th>Response</th>
                  <SortableHeader
                    label="Tokens"
                    field="totalTokens"
                    query={query}
                    setQuery={setQuery}
                  />
                  <SortableHeader
                    label="Est. cost"
                    field="estimatedCostUsd"
                    query={query}
                    setQuery={setQuery}
                  />
                  <th aria-label="Details" />
                </tr>
              </thead>
              <tbody>
                {result?.data.items.map((usage) => (
                  <UsageRows
                    key={usage.id}
                    usage={usage}
                    expanded={expandedId === usage.id}
                    onToggle={() =>
                      setExpandedId((current) =>
                        current === usage.id ? undefined : usage.id,
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
            {!loading && result?.data.items.length === 0 && (
              <div className="empty-state">
                <span>◇</span>
                <h3>No usage found</h3>
                <p>Use Realtime voice or a camera check to generate records.</p>
              </div>
            )}
            {loading && !result && <div className="loading-state">Loading…</div>}
          </div>

          <footer className="pagination">
            <p>
              Showing {result?.data.items.length ?? 0} of{' '}
              {result?.data.total ?? 0} requests
            </p>
            <div>
              <button
                disabled={(query.page ?? 1) <= 1 || loading}
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    page: Math.max(1, (current.page ?? 1) - 1),
                  }))
                }
              >
                Previous
              </button>
              <span>
                Page {result?.data.page ?? query.page ?? 1} of{' '}
                {result?.data.totalPages ?? 1}
              </span>
              <button
                disabled={
                  (query.page ?? 1) >= (result?.data.totalPages ?? 1) || loading
                }
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    page: (current.page ?? 1) + 1,
                  }))
                }
              >
                Next
              </button>
            </div>
          </footer>
        </section>
      </main>
    </div>
  )
}

function Metric({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: string
  note: string
  tone?: string
}) {
  return (
    <article className={`metric ${tone ?? ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  )
}

function SortableHeader({
  label,
  field,
  query,
  setQuery,
}: {
  label: string
  field: NonNullable<CostQuery['sortBy']>
  query: CostQuery
  setQuery: Dispatch<SetStateAction<CostQuery>>
}) {
  const active = query.sortBy === field
  return (
    <th>
      <button
        className="sort-button"
        onClick={() =>
          setQuery((current) => ({
            ...current,
            sortBy: field,
            sortDirection:
              current.sortBy === field && current.sortDirection === 'desc'
                ? 'asc'
                : 'desc',
            page: 1,
          }))
        }
      >
        {label}
        <span aria-hidden="true">
          {active && query.sortDirection === 'asc' ? '↑' : '↓'}
        </span>
      </button>
    </th>
  )
}

function InstallationRow({
  installation,
  selected,
  onSelect,
}: {
  installation: InstallationCost
  selected: boolean
  onSelect: () => void
}) {
  return (
    <tr className={selected ? 'selected-row' : undefined}>
      <td>
        <div className="id-cell">
          <strong>{compactId(installation.installationId)}</strong>
        </div>
      </td>
      <td>
        <span className={`status status-${installation.platform}`}>
          {titleCase(installation.platform)}
        </span>
      </td>
      <td className="number-cell">
        {formatNumber(installation.requests)}
        <small>
          {installation.realtimeRequests} RT · {installation.visionRequests} vis
        </small>
      </td>
      <td className="number-cell">{formatCompact(installation.totalTokens)}</td>
      <td className="cost-cell">
        {formatUsd(installation.estimatedCostUsd)}
        {!installation.pricingComplete && (
          <span className="warning-dot" title="Rate missing for some models">
            !
          </span>
        )}
      </td>
      <td>
        {installation.lastActivityAt
          ? formatDate(installation.lastActivityAt)
          : '—'}
      </td>
      <td>
        <div className="row-actions">
          <Link
            className="detail-button link-button"
            to={`/devices/${encodeURIComponent(installation.installationId)}`}
          >
            View
          </Link>
          <button className="detail-button" onClick={onSelect}>
            {selected ? 'Filtered' : 'Filter'}
          </button>
        </div>
      </td>
    </tr>
  )
}

function UsageRows({
  usage,
  expanded,
  onToggle,
}: {
  usage: CostUsage
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr>
        <td>{formatDate(usage.occurredAt)}</td>
        <td>
          <div className="id-cell">
            <strong>{compactId(usage.installationId)}</strong>
          </div>
        </td>
        <td>
          <span className={`status status-${usage.source}`}>
            {titleCase(usage.source)}
          </span>
        </td>
        <td>
          <strong className="recipe-name">{usage.model}</strong>
        </td>
        <td>
          <div className="id-cell">
            <strong>{compactId(usage.responseId)}</strong>
          </div>
        </td>
        <td className="number-cell">{formatCompact(usage.totalTokens)}</td>
        <td className="cost-cell">
          {formatUsd(usage.estimatedCostUsd)}
          {!usage.pricingConfigured && (
            <span className="warning-dot" title="Rate missing for this model">
              !
            </span>
          )}
        </td>
        <td>
          <button
            className="detail-button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Hide' : 'Show'} ${usage.responseId} details`}
          >
            {expanded ? '−' : '+'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={8}>
            <dl>
              <div>
                <dt>Installation ID</dt>
                <dd>{usage.installationId}</dd>
              </div>
              <div>
                <dt>Response ID</dt>
                <dd>{usage.responseId}</dd>
              </div>
              <div>
                <dt>Input tokens</dt>
                <dd>{formatNumber(usage.inputTokens)}</dd>
              </div>
              <div>
                <dt>Output tokens</dt>
                <dd>{formatNumber(usage.outputTokens)}</dd>
              </div>
              <div>
                <dt>Total tokens</dt>
                <dd>{formatNumber(usage.totalTokens)}</dd>
              </div>
            </dl>
          </td>
        </tr>
      )}
    </>
  )
}

function compactId(value: string) {
  return value.length > 17 ? `${value.slice(0, 9)}…${value.slice(-5)}` : value
}

function formatOrgLookback(days: number) {
  return (
    ORG_LOOKBACK_OPTIONS.find((option) => option.days === days)?.label ??
    `Last ${days} days`
  )
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value)
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: value >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

export default App
