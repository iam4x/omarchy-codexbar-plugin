const assert = require('node:assert/strict')
const UsageModel = require('../UsageModel.js')

const now = Date.parse('2026-08-25T00:00:00Z')

function record(provider, usage, source) {
  return JSON.stringify([{ provider, source: source || provider + '-source', usage }])
}

function parse(json) {
  const result = UsageModel.parsePayload(json, now)
  assert.equal(result.ok, true)
  return result
}

function grokBotExtra(usedPercent, resetsAt, title) {
  return {
    id: 'cursor-grok-bot',
    title: title || 'Grok Bot',
    window: { usedPercent, resetsAt }
  }
}

{
  const result = parse(record('codex', {
    secondary: { usedPercent: 65, resetsAt: '2026-08-31T00:00:00Z' }
  }))
  const row = result.providers[0]
  assert.equal(row.kind, 'usage')
  assert.equal(row.remainingPercent, 35)
  assert.equal(row.remainingLabel, '35%')
  assert.equal(row.resetLabel, '6d 0h')
  assert.equal(row.tooltip, undefined)
  assert.equal(row.selectedWindow.kind, 'secondary')
}

{
  const result = parse(record('codex', {
    primary: { usedPercent: 65, resetsAt: '2026-08-30T16:00:00Z' }
  }))
  assert.equal(result.providers[0].resetLabel, '5d 16h')
}

{
  const result = parse(record('claude', {
    primary: { usedPercent: 20, resetsAt: '2026-08-26T00:00:00Z' },
    secondary: { usedPercent: 80, resetsAt: '2026-08-30T00:00:00Z' }
  }))
  assert.equal(result.providers[0].selectedWindow.kind, 'secondary')
  assert.equal(result.providers[0].remainingPercent, 20)
}

{
  const result = parse(record('codex', {
    primary: { usedPercent: 10, resetsAt: '2026-08-26T00:00:00Z' },
    extraRateWindows: [
      {
        id: 'spark',
        title: 'Spark five-hour',
        window: { usedPercent: 90, resetsAt: '2026-08-25T12:00:00Z' }
      }
    ]
  }))
  const row = result.providers[0]
  assert.equal(row.selectedWindow.kind, 'extra')
  assert.equal(row.selectedWindow.id, 'spark')
  assert.equal(row.remainingPercent, 10)
}

{
  const result = parse(record('cursor', {
    primary: { usedPercent: 10, resetsAt: '2026-08-26T00:00:00Z' },
    secondary: { usedPercent: 20, resetsAt: '2026-08-27T00:00:00Z' },
    tertiary: { usedPercent: 30, resetsAt: '2026-08-28T00:00:00Z' },
    extraRateWindows: [
      {
        id: 'cursor-generic',
        title: 'Cursor generic',
        window: { usedPercent: 80, resetsAt: '2026-08-29T00:00:00Z' }
      },
      grokBotExtra(95, '2026-08-30T00:00:00Z', 'Grok Bot allowance')
    ]
  }))
  assert.deepEqual(result.providers.map(row => row.provider), ['cursor', 'grok'])

  const cursor = result.providers[0]
  assert.deepEqual(cursor.windows.map(window => window.id), [
    'primary',
    'secondary',
    'tertiary',
    'cursor-generic'
  ])
  assert.equal(cursor.selectedWindow.id, 'cursor-generic')
  assert.equal(cursor.remainingPercent, 20)

  const grokBot = result.providers[1]
  assert.equal(grokBot.icon, 'grok')
  assert.equal(grokBot.source, 'cursor-source')
  assert.equal(grokBot.windows.length, 1)
  assert.equal(grokBot.windows[0].title, 'Grok bot')
  assert.equal(grokBot.windows[0].remainingPercent, 5)
  assert.equal(grokBot.windows[0].resetLabel, '5d 0h')
  assert.equal(grokBot.selectedWindow.kind, 'extra')
  assert.equal(grokBot.selectedWindow.id, 'cursor-grok-bot')
  assert.equal(grokBot.selectedWindow.title, 'Grok bot')
  assert.equal(grokBot.selectedWindow.usedPercent, 95)
  assert.equal(grokBot.selectedWindow.remainingPercent, 5)
  assert.equal(grokBot.selectedWindow.resetsAtMs, Date.parse('2026-08-30T00:00:00Z'))
}

{
  const result = parse(record('cursor', {
    primary: { usedPercent: 25, resetsAt: '2026-08-26T00:00:00Z' }
  }))
  assert.deepEqual(result.providers.map(row => row.provider), ['cursor'])
  assert.equal(result.providers[0].windows.some(window => window.id === 'cursor-grok-bot'), false)
}

{
  const result = parse(record('cursor', {
    primary: { usedPercent: 20, resetsAt: '2026-08-26T00:00:00Z' },
    extraRateWindows: [
      {
        id: 'cursor-grok-bot-preview',
        title: 'Grok Bot preview',
        window: { usedPercent: 90, resetsAt: '2026-08-27T00:00:00Z' }
      }
    ]
  }))
  assert.deepEqual(result.providers.map(row => row.provider), ['cursor'])
  assert.equal(result.providers[0].selectedWindow.id, 'cursor-grok-bot-preview')
  assert.equal(result.providers[0].selectedWindow.kind, 'extra')
}

{
  const result = parse(record('cursor', {
    primary: { usedPercent: 25, resetsAt: '2026-08-26T00:00:00Z' },
    extraRateWindows: [
      {
        id: 'cursor-grok-bot',
        title: 'Malformed Grok Bot',
        window: { usedPercent: '95', resetsAt: '2026-08-30T00:00:00Z' }
      }
    ]
  }))
  assert.deepEqual(result.providers.map(row => row.provider), ['cursor'])
  assert.deepEqual(result.providers[0].windows.map(window => window.id), ['primary'])
}

{
  const result = parse(record('cursor', {
    extraRateWindows: [grokBotExtra(70, '2026-08-30T00:00:00Z')]
  }))
  assert.deepEqual(result.providers.map(row => row.provider), ['grok'])
  assert.equal(result.providers[0].selectedWindow.id, 'cursor-grok-bot')
  assert.equal(result.providers[0].icon, 'grok')
  assert.equal(result.providers[0].windows[0].title, 'Grok bot')
  assert.equal(result.providers[0].windows[0].remainingPercent, 30)
  assert.equal(result.providers[0].windows[0].resetLabel, '5d 0h')
}

{
  const result = parse(JSON.stringify([
    {
      provider: 'cursor',
      source: 'account-1',
      usage: {
        primary: { usedPercent: 20, resetsAt: '2026-08-26T00:00:00Z' },
        extraRateWindows: [grokBotExtra(60, '2026-08-28T00:00:00Z')]
      }
    },
    {
      provider: 'cursor',
      source: 'account-2',
      usage: {
        secondary: { usedPercent: 90, resetsAt: '2026-08-27T00:00:00Z' },
        extraRateWindows: [grokBotExtra(95, '2026-08-29T00:00:00Z')]
      }
    }
  ]))
  assert.deepEqual(result.providers.map(row => row.provider), ['cursor', 'grok'])
  assert.equal(result.providers[0].windows.length, 2)
  assert.deepEqual(result.providers[1].windows.map(window => window.title), ['Grok bot', 'Grok bot'])
  assert.deepEqual(result.providers[1].windows.map(window => window.remainingPercent), [40, 5])
  assert.deepEqual(result.providers[1].windows.map(window => window.resetLabel), ['3d 0h', '4d 0h'])
  assert.equal(result.providers[1].source, 'account-1')
  assert.equal(result.providers[1].selectedWindow.usedPercent, 95)
}

{
  const result = parse(record('codex', {
    primary: { usedPercent: 25, resetsAt: '2026-08-26T00:00:00Z' },
    extraRateWindows: [grokBotExtra(95, '2026-08-30T00:00:00Z')]
  }))
  assert.deepEqual(result.providers.map(row => row.provider), ['codex'])
  assert.equal(result.providers[0].selectedWindow.id, 'cursor-grok-bot')
}

{
  const result = UsageModel.parsePayload(JSON.stringify([{
    provider: 'grok',
    source: 'grok-cli-proxy',
    error: 'Login expired'
  }]), now)
  const row = result.providers[0]
  assert.equal(result.ok, true)
  assert.equal(row.kind, 'error')
  assert.equal(row.icon, 'grok')
  assert.equal(row.remainingLabel, '--%')
  assert.equal(row.resetLabel, '--')
  assert.equal(row.tooltip, undefined)
}

{
  const parsed = parse(record('codex', {
    secondary: { usedPercent: 30, resetsAt: '2026-08-31T00:00:00Z' }
  }))
  const previous = {
    state: 'ready',
    providers: parsed.providers,
    observedAtMs: now,
    attemptedAtMs: now,
    message: ''
  }
  const stale = UsageModel.fromProcessResult(previous, 0, '{broken', '', now + 1000)
  assert.equal(stale.state, 'stale')
  assert.equal(stale.providers[0].remainingLabel, '70%')
  assert.match(stale.message, /invalid JSON/)
}

{
  const result = UsageModel.parsePayload('[]', now)
  assert.equal(result.ok, true)
  assert.equal(result.state, 'empty')
  assert.equal(result.providers.length, 0)
}

{
  assert.equal(UsageModel.providerIcon('codex'), 'codex')
  assert.equal(UsageModel.providerIcon('openai'), 'openai')
  assert.equal(UsageModel.providerIcon('grok'), 'grok')
  assert.equal(UsageModel.providerIcon('grok-bot'), 'grok-bot')
  assert.equal(UsageModel.providerIcon('new-provider'), '')
  assert.equal(UsageModel.providerIcon(''), '')
}

{
  const result = UsageModel.parsePayload(JSON.stringify([
    { provider: 'codex', source: 'account-1', usage: { primary: { usedPercent: 25, resetsAt: '2026-08-26T00:00:00Z' } } },
    { provider: 'codex', source: 'account-2', usage: { secondary: { usedPercent: 90, resetsAt: '2026-08-27T00:00:00Z' } } }
  ]), now)
  assert.equal(result.ok, true)
  assert.equal(result.providers.length, 1)
  assert.equal(result.providers[0].selectedWindow.kind, 'secondary')
  assert.equal(result.providers[0].remainingPercent, 10)
}

{
  const result = parse(JSON.stringify([{
    provider: 'codex',
    source: 'oauth',
    rateWindowLabels: { secondary: 'Weekly' },
    pace: {
      primary: { deltaPercent: 19, expectedUsedPercent: 15 },
      secondary: { deltaPercent: 1, expectedUsedPercent: 120 },
      tertiary: { deltaPercent: -3 },
      spark: { deltaPercent: -13, expectedUsedPercent: 95 }
    },
    credits: { remaining: 24.5, creditsAvailable: true, balanceReadSucceeded: true },
    usage: {
      loginMethod: 'plus',
      accountEmail: 'me@example.com',
      primary: { usedPercent: 34, windowMinutes: 300, resetsAt: '2026-08-25T04:14:00Z' },
      secondary: { usedPercent: 68, windowMinutes: 10080, resetsAt: '2026-08-27T05:00:00Z' },
      tertiary: { usedPercent: 5, windowMinutes: 77, resetsAt: '2026-08-27T05:00:00Z' },
      extraRateWindows: [
        { id: 'spark', title: 'Spark', window: { usedPercent: 82, resetsAt: '2026-08-25T00:30:00Z' } }
      ],
      providerCost: { period: 'Extra usage', currencyCode: 'Credits', limit: 50, used: 12.25 },
      codexResetCredits: { availableCount: 1 },
      details: [
        { title: 'Usage breakdown', rows: [{ label: 'Build', value: '9%' }, { label: 7 }] },
        { title: 'Empty', rows: [] }
      ]
    }
  }]))
  const row = result.providers[0]
  assert.deepEqual(row.windows.map(window => window.title), ['5h', 'Weekly', 'Tertiary', 'Spark'])
  assert.deepEqual(row.windows.map(window => window.windowMinutes), [300, 10080, 77, null])

  assert.deepEqual(row.windows.map(window => window.pace), [
    { expectedUsedPercent: 15 },
    { expectedUsedPercent: 100 },
    null,
    { expectedUsedPercent: 95 }
  ])

  assert.equal(row.info.displayName, 'Codex')
  assert.deepEqual(row.info.sections, [
    {
      title: 'Credits',
      rows: [
        { label: 'Credits balance', value: '24.50' },
        { label: 'Extra usage', value: '12.25 / 50 Credits' },
        { label: 'Limit resets available', value: '1' }
      ]
    },
    { title: 'Usage breakdown', rows: [{ label: 'Build', value: '9%' }] }
  ])
}

{
  const result = parse(JSON.stringify([{
    provider: 'codex',
    credits: { remaining: 0, creditsAvailable: false },
    usage: {
      primary: { usedPercent: 10, resetsAt: '2026-08-26T00:00:00Z' },
      providerCost: { period: 'Extra usage', limit: 0, used: 0 }
    }
  }]))
  assert.deepEqual(result.providers[0].info.sections, [])
  assert.equal(result.providers[0].windows[0].title, 'Primary')
}

{
  const result = parse(JSON.stringify([{
    provider: 'cursor',
    usage: {
      loginMethod: 'Cursor Ultra',
      primary: { usedPercent: 10, resetsAt: '2026-08-26T00:00:00Z' },
      extraRateWindows: [grokBotExtra(20, '2026-08-30T00:00:00Z')]
    }
  }]))
  assert.equal(result.providers[0].info.displayName, 'Cursor')
  assert.equal(result.providers[1].info.displayName, 'Grok')
  assert.deepEqual(result.providers[1].info.sections, [])
  assert.equal(result.providers[1].windows[0].title, 'Grok bot')
  assert.equal(result.providers[1].windows[0].remainingPercent, 80)
}

function grokRecord(source) {
  return {
    provider: 'grok',
    source: source,
    rateWindowLabels: { primary: 'Weekly' },
    usage: {
      primary: { usedPercent: 26, windowMinutes: 10080, resetsAt: '2026-09-04T00:00:00Z' },
      details: [{ title: 'Usage breakdown', rows: [{ label: 'Grok Build', value: '26%' }] }]
    }
  }
}

function cursorWithGrokBot(source) {
  return {
    provider: 'cursor',
    source: source,
    usage: {
      primary: { usedPercent: 16, resetsAt: '2026-08-26T00:00:00Z' },
      extraRateWindows: [grokBotExtra(6, '2026-09-05T03:00:00Z')]
    }
  }
}

function assertMergedGrok(result) {
  const grok = result.providers.find(row => row.provider === 'grok')
  const cursor = result.providers.find(row => row.provider === 'cursor')
  assert.equal(result.providers.filter(row => row.provider === 'grok').length, 1)
  assert.equal(grok.icon, 'grok')
  assert.equal(grok.source, 'grok-cli-proxy')
  assert.deepEqual(grok.windows.map(window => window.title), ['Weekly', 'Grok bot'])
  assert.equal(grok.windows[0].remainingPercent, 74)
  assert.equal(grok.windows[1].remainingPercent, 94)
  assert.equal(grok.windows[1].resetLabel, '11d 3h')
  assert.equal(grok.selectedWindow.kind, 'primary')
  assert.equal(grok.remainingPercent, 74)
  assert.deepEqual(grok.info.sections, [
    { title: 'Usage breakdown', rows: [{ label: 'Grok Build', value: '26%' }] }
  ])
  assert.equal(cursor.windows.some(window => window.id === 'cursor-grok-bot'), false)
}

{
  const cursorFirst = parse(JSON.stringify([
    cursorWithGrokBot('cursor-source'),
    grokRecord('grok-cli-proxy')
  ]))
  assertMergedGrok(cursorFirst)

  const grokFirst = parse(JSON.stringify([
    grokRecord('grok-cli-proxy'),
    cursorWithGrokBot('cursor-source')
  ]))
  assertMergedGrok(grokFirst)
}

{
  const result = UsageModel.parsePayload(JSON.stringify([{
    provider: 'claude',
    error: 'Login expired',
    usage: { loginMethod: 'max' }
  }]), now)
  assert.equal(result.providers[0].info.displayName, 'Claude')
}

{
  const result = parse(JSON.stringify([{
    provider: 'claude',
    rateWindowLabels: { primary: 'Session', secondary: 'Weekly' },
    usage: {
      primary: { usedPercent: 2, windowMinutes: 300, resetsAt: '2026-08-25T05:00:00Z' },
      secondary: { usedPercent: 18, windowMinutes: 10080, resetsAt: '2026-08-31T00:00:00Z' },
      extraRateWindows: [{
        id: 'claude-weekly-scoped-fable',
        title: 'Fable only',
        window: { usedPercent: 10, windowMinutes: 10080, resetsAt: '2026-08-31T00:00:00Z' }
      }]
    }
  }]))
  assert.deepEqual(result.providers[0].windows.map(window => window.title), ['5h', 'Weekly', 'Fable only'])
  assert.equal(result.providers[0].windows[0].windowMinutes, 300)
}

{
  const result = parse(JSON.stringify([{
    provider: 'claude',
    rateWindowLabels: { primary: 'Burst' },
    usage: {
      primary: { usedPercent: 2, windowMinutes: 300, resetsAt: '2026-08-25T05:00:00Z' }
    }
  }]))
  assert.equal(result.providers[0].windows[0].title, 'Burst')
}

{
  assert.equal(UsageModel.displayName('zai'), 'Z.ai')
  assert.equal(UsageModel.displayName('new-provider_name'), 'New Provider Name')
  assert.equal(UsageModel.formatResetIn(now - 1000, now), 'Resets now')
  assert.equal(UsageModel.formatResetIn(now + 59 * 60000, now), 'Resets in 59m')
  assert.equal(UsageModel.formatResetIn(now + (4 * 60 + 14) * 60000, now), 'Resets in 4h 14m')
  assert.equal(UsageModel.formatResetIn(now + (2 * 24 + 5) * 3600000 + 30 * 60000, now), 'Resets in 2d 5h')
}

console.log('usage-model tests passed')
