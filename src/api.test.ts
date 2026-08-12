import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchInstallationCosts, fetchOpenAiOrgCosts, fetchUsageCosts } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('usage cost API client', () => {
  it('sends the runtime admin key and query filters', async () => {
    const payload = {
      rateCardVersion: 'test-v1',
      data: {
        summary: {
          requests: 0,
          totalTokens: 0,
          estimatedCostUsd: 0,
          pricingComplete: true,
        },
        items: [],
        page: 2,
        pageSize: 20,
        total: 0,
        totalPages: 1,
      },
    }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchUsageCosts('runtime-admin-key', {
        search: 'realtime',
        page: 2,
      }),
    ).resolves.toEqual(payload)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toContain('/v1/admin/ai-cost/usage')
    expect(String(url)).toContain('search=realtime')
    expect(String(url)).toContain('page=2')
    expect(init?.headers).toEqual({ 'X-Admin-Key': 'runtime-admin-key' })
  })

  it('surfaces the API error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: 'Admin API key is invalid' } }),
          { status: 401 },
        ),
      ),
    )

    await expect(fetchUsageCosts('wrong', {})).rejects.toThrow(
      'Admin API key is invalid',
    )
  })
})

describe('installation cost API client', () => {
  it('requests installation aggregates with filters', async () => {
    const payload = {
      rateCardVersion: 'test-v1',
      data: {
        summary: {
          installations: 1,
          requests: 2,
          totalTokens: 300,
          estimatedCostUsd: 0.12,
        },
        items: [
          {
            installationId: 'ins_test',
            platform: 'android',
            appVersion: '0.1.0',
            locale: 'en-PK',
            requests: 2,
            realtimeRequests: 1,
            visionRequests: 1,
            totalTokens: 300,
            estimatedCostUsd: 0.12,
            pricingComplete: true,
            lastActivityAt: '2026-08-07T12:00:00.000Z',
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchInstallationCosts('runtime-admin-key', {
        search: 'ins_test',
        platform: 'android',
      }),
    ).resolves.toEqual(payload)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toContain('/v1/admin/ai-cost/installations')
    expect(String(url)).toContain('search=ins_test')
    expect(String(url)).toContain('platform=android')
    expect(init?.headers).toEqual({ 'X-Admin-Key': 'runtime-admin-key' })
  })
})

describe('OpenAI organization API client', () => {
  it('requests organization usage with the lookback window', async () => {
    const payload = {
      data: {
        configured: true,
        summary: {
          totalCostUsd: 2,
          totalInputTokens: 100,
          totalOutputTokens: 50,
          totalTokens: 150,
          totalRequests: 3,
          days: 14,
          startTime: '2026-08-01T00:00:00.000Z',
          endTime: '2026-08-07T00:00:00.000Z',
        },
        dailyCosts: [],
        usageByModel: [],
      },
    }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchOpenAiOrgCosts('runtime-admin-key', 14)).resolves.toEqual(
      payload,
    )

    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toContain('/v1/admin/ai-cost/openai-org')
    expect(String(url)).toContain('days=14')
    expect(init?.headers).toEqual({ 'X-Admin-Key': 'runtime-admin-key' })
  })
})
