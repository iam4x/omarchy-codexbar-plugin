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

console.log('usage-model tests passed')
