import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  InstallationCost,
  OpenAiOrgCostDay,
  OpenAiOrgModelUsage,
} from '../api'

const COLORS = {
  green: '#174c3a',
  greenLight: '#2d7a5f',
  vision: '#345f8f',
  realtime: '#226448',
  muted: '#718078',
  grid: '#dfe3dc',
  pie: ['#174c3a', '#345f8f'],
} as const

type ChartShellProps = {
  title: string
  subtitle?: string
  emptyMessage: string
  hasData: boolean
  height?: number
  children: ReactNode
}

function ChartShell({
  title,
  subtitle,
  emptyMessage,
  hasData,
  height = 280,
  children,
}: ChartShellProps) {
  return (
    <div className="chart-panel" aria-label={title}>
      <div className="chart-heading">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {!hasData ? (
        <div className="chart-empty">{emptyMessage}</div>
      ) : (
        <div className="chart-canvas" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      )}
    </div>
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

function compactId(value: string) {
  return value.length > 17 ? `${value.slice(0, 9)}…${value.slice(-5)}` : value
}

function shortDate(value: string) {
  const [, month, day] = value.split('-')
  return `${month}/${day}`
}

export function DailySpendChart({ data }: { data: OpenAiOrgCostDay[] }) {
  const chartData = data.map((day) => ({
    ...day,
    label: shortDate(day.date),
  }))

  return (
    <ChartShell
      title="Daily spend trend"
      subtitle="OpenAI invoice totals by UTC day"
      emptyMessage="No spend recorded in this window."
      hasData={chartData.length > 0}
      height={300}
    >
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} strokeDasharray="4 4" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: COLORS.muted, fontSize: 11 }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: COLORS.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => formatUsd(value)}
          width={72}
        />
        <Tooltip
          formatter={(value) => formatUsd(Number(value))}
          labelFormatter={(_, payload) => {
            const row = payload?.[0]?.payload as OpenAiOrgCostDay | undefined
            return row?.date ?? ''
          }}
          contentStyle={{
            borderRadius: 10,
            border: `1px solid ${COLORS.grid}`,
            fontSize: 12,
          }}
        />
        <Bar dataKey="costUsd" fill={COLORS.green} radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ChartShell>
  )
}

export function ModelUsageChart({ data }: { data: OpenAiOrgModelUsage[] }) {
  const chartData = [...data]
    .sort((left, right) => right.totalTokens - left.totalTokens)
    .slice(0, 8)
    .map((row) => ({
      model: row.model.length > 22 ? `${row.model.slice(0, 20)}…` : row.model,
      tokens: row.totalTokens,
      requests: row.requests,
    }))

  return (
    <ChartShell
      title="Usage by model"
      subtitle="Completions tokens from OpenAI admin API"
      emptyMessage="No completions usage in this window."
      hasData={chartData.length > 0}
    >
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
      >
        <CartesianGrid stroke={COLORS.grid} strokeDasharray="4 4" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: COLORS.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => formatCompact(value)}
        />
        <YAxis
          type="category"
          dataKey="model"
          width={108}
          tick={{ fill: COLORS.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value, name) =>
            name === 'tokens' ? formatCompact(Number(value)) : Number(value)
          }
          contentStyle={{
            borderRadius: 10,
            border: `1px solid ${COLORS.grid}`,
            fontSize: 12,
          }}
        />
        <Bar dataKey="tokens" fill={COLORS.vision} radius={[0, 6, 6, 0]} maxBarSize={22} />
      </BarChart>
    </ChartShell>
  )
}

export function TopInstallationsChart({
  data,
}: {
  data: InstallationCost[]
}) {
  const chartData = [...data]
    .sort((left, right) => right.estimatedCostUsd - left.estimatedCostUsd)
    .slice(0, 10)
    .map((row) => ({
      installationId: compactId(row.installationId),
      costUsd: row.estimatedCostUsd,
      platform: row.platform,
    }))

  return (
    <ChartShell
      title="Top installations by cost"
      subtitle="App-tracked estimated spend"
      emptyMessage="No installation costs yet."
      hasData={chartData.length > 0}
    >
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
      >
        <CartesianGrid stroke={COLORS.grid} strokeDasharray="4 4" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: COLORS.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => formatUsd(value)}
        />
        <YAxis
          type="category"
          dataKey="installationId"
          width={96}
          tick={{ fill: COLORS.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => formatUsd(Number(value))}
          contentStyle={{
            borderRadius: 10,
            border: `1px solid ${COLORS.grid}`,
            fontSize: 12,
          }}
        />
        <Bar dataKey="costUsd" fill={COLORS.green} radius={[0, 6, 6, 0]} maxBarSize={22} />
      </BarChart>
    </ChartShell>
  )
}

export function SourceSplitChart({
  realtimeRequests,
  visionRequests,
}: {
  realtimeRequests: number
  visionRequests: number
}) {
  const chartData = [
    { name: 'Realtime', value: realtimeRequests, color: COLORS.realtime },
    { name: 'Vision', value: visionRequests, color: COLORS.vision },
  ].filter((row) => row.value > 0)

  return (
    <ChartShell
      title="Request mix"
      subtitle="Realtime turns vs vision checks"
      emptyMessage="No tracked requests yet."
      hasData={chartData.length > 0}
      height={280}
    >
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={92}
          paddingAngle={3}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatCompact(Number(value))}
          contentStyle={{
            borderRadius: 10,
            border: `1px solid ${COLORS.grid}`,
            fontSize: 12,
          }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(value) => (
            <span style={{ color: COLORS.muted, fontSize: 12 }}>{value}</span>
          )}
        />
      </PieChart>
    </ChartShell>
  )
}
