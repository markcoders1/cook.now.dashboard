import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchInstallationConversations,
  fetchInstallationDetail,
  type ConversationTurn,
  type InstallationDetail,
  type InstallationSessionSummary,
} from '../api'
import { Brand } from '../components/Brand'

type DeviceDetailPageProps = {
  adminKey: string
  onLock: () => void
}

export default function DeviceDetailPage({
  adminKey,
  onLock,
}: DeviceDetailPageProps) {
  const { installationId = '' } = useParams()
  const [detail, setDetail] = useState<InstallationDetail>()
  const [turns, setTurns] = useState<ConversationTurn[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [turnsLoading, setTurnsLoading] = useState(false)

  useEffect(() => {
    if (!installationId) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetchInstallationDetail(adminKey, installationId, controller.signal)
      .then((result) => {
        setDetail(result.data)
        setSelectedSessionId((current) => current ?? result.data.sessions[0]?.sessionId)
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            failure instanceof Error
              ? failure.message
              : 'Unable to load installation detail',
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [adminKey, installationId])

  useEffect(() => {
    if (!installationId || !selectedSessionId) {
      setTurns([])
      return
    }
    const controller = new AbortController()
    setTurnsLoading(true)
    fetchInstallationConversations(
      adminKey,
      installationId,
      { sessionId: selectedSessionId, page: 1, pageSize: 100 },
      controller.signal,
    )
      .then((result) => setTurns(result.data.items))
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            failure instanceof Error
              ? failure.message
              : 'Unable to load conversations',
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setTurnsLoading(false)
      })
    return () => controller.abort()
  }, [adminKey, installationId, selectedSessionId])

  const selectedSession = useMemo(
    () => detail?.sessions.find((session) => session.sessionId === selectedSessionId),
    [detail?.sessions, selectedSessionId],
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Dashboard navigation">
          <Link className="nav-item" to="/">
            <span aria-hidden="true">▦</span> AI usage
          </Link>
        </nav>
        <div className="sidebar-foot">
          <button className="text-button" onClick={onLock}>
            Lock dashboard
          </button>
        </div>
      </aside>

      <main className="dashboard device-detail">
        <header className="topbar">
          <div>
            <Link className="back-link" to="/">
              ← Back to dashboard
            </Link>
            <span className="eyebrow">Device conversations</span>
            <h1>{compactId(installationId)}</h1>
            {detail && (
              <p>
                {titleCase(detail.platform)} · {detail.locale} · v
                {detail.appVersion} · {detail.turnCount} turns across{' '}
                {detail.sessionCount} sessions
              </p>
            )}
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}
        {loading && !detail && (
          <div className="loading-state">Loading device detail…</div>
        )}

        {detail && (
          <div className="device-detail-grid">
            <section className="table-card org-panel device-sessions">
              <h3>Sessions</h3>
              {detail.sessions.length === 0 ? (
                <div className="empty-state compact">
                  <p>No conversation sessions yet.</p>
                </div>
              ) : (
                <ul className="session-list">
                  {detail.sessions.map((session) => (
                    <SessionListItem
                      key={session.sessionId}
                      session={session}
                      selected={session.sessionId === selectedSessionId}
                      onSelect={() => setSelectedSessionId(session.sessionId)}
                    />
                  ))}
                </ul>
              )}
            </section>

            <section className="table-card device-conversation">
              <div className="table-heading">
                <div>
                  <h2>Conversation</h2>
                  <p>
                    {selectedSession
                      ? `${selectedSession.recipeName} · ${titleCase(selectedSession.status)}`
                      : 'Select a session to view turns'}
                  </p>
                </div>
              </div>

              <div className="conversation-thread">
                {turnsLoading && turns.length === 0 && (
                  <div className="loading-state compact">Loading turns…</div>
                )}
                {!turnsLoading && selectedSessionId && turns.length === 0 && (
                  <div className="empty-state compact">
                    <p>No conversation turns recorded for this session.</p>
                  </div>
                )}
                {turns.map((turn) => (
                  <article
                    key={turn.id}
                    className={`conversation-bubble conversation-${turn.role}`}
                  >
                    <header>
                      <strong>{turn.role === 'user' ? 'You' : 'Coach'}</strong>
                      <time dateTime={turn.occurredAt}>
                        {formatDate(turn.occurredAt)}
                      </time>
                    </header>
                    <p>{turn.text}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

function SessionListItem({
  session,
  selected,
  onSelect,
}: {
  session: InstallationSessionSummary
  selected: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        className={selected ? 'session-item selected' : 'session-item'}
        onClick={onSelect}
      >
        <strong>{session.recipeName}</strong>
        <span>{session.turnCount} turns</span>
        <small>
          {session.lastActivityAt
            ? formatDate(session.lastActivityAt)
            : formatDate(session.startedAt)}
        </small>
      </button>
    </li>
  )
}

function compactId(value: string) {
  return value.length > 17 ? `${value.slice(0, 9)}…${value.slice(-5)}` : value
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
