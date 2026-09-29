var MINUTE_MS = 60000
var HOUR_MS = 3600000

var ICONS = {
  codex: "codex",
  openai: "openai",
  azureopenai: "azureopenai",
  "azure-openai": "azureopenai",
  chatgpt: "openai",
  grok: "grok",
  "grok-bot": "grok-bot",
  claude: "claude",
  anthropic: "claude",
  gemini: "gemini",
  google: "gemini",
  copilot: "copilot",
  cursor: "cursor",
  opencode: "opencode",
  opencodego: "opencodego",
  alibaba: "alibaba",
  "alibaba-coding-plan": "alibaba",
  alibabatokenplan: "alibabatokenplan",
  "alibaba-token-plan": "alibabatokenplan",
  antigravity: "antigravity",
  devin: "devin",
  kimi: "kimi",
  kimik2: "kimik2",
  kilo: "kilo",
  kiro: "kiro",
  minimax: "minimax",
  manus: "manus",
  vertexai: "vertexai",
  moonshot: "moonshot",
  ollama: "ollama",
  openrouter: "openrouter",
  elevenlabs: "elevenlabs",
  windsurf: "windsurf",
  perplexity: "perplexity",
  mimo: "mimo",
  doubao: "doubao",
  mistral: "mistral",
  deepseek: "deepseek",
  venice: "venice",
  qoder: "qoder",
  stepfun: "stepfun",
  bedrock: "bedrock",
  groq: "groq",
  groqcloud: "groq",
  poe: "poe",
  zai: "zai"
}

var DERIVED_WINDOW_PROVIDERS = {
  cursor: {
    "cursor-grok-bot": "grok-bot"
  }
}

var FALLBACK_ICON = ""

var DISPLAY_NAMES = {
  codex: "Codex",
  openai: "OpenAI",
  azureopenai: "Azure OpenAI",
  chatgpt: "ChatGPT",
  claude: "Claude",
  anthropic: "Claude",
  copilot: "Copilot",
  opencode: "OpenCode",
  opencodego: "OpenCode Go",
  "grok-bot": "Grok Bot",
  kimik2: "Kimi K2",
  minimax: "MiniMax",
  vertexai: "Vertex AI",
  openrouter: "OpenRouter",
  elevenlabs: "ElevenLabs",
  deepseek: "DeepSeek",
  stepfun: "StepFun",
  groqcloud: "GroqCloud",
  zai: "Z.ai"
}

var WINDOW_TITLES = {
  300: "5h",
  1440: "Daily",
  10080: "Weekly",
  43200: "Monthly"
}

// CodexBar names the 300-minute Claude/Codex window "Session". That is the
// rolling 5-hour limit; keep a provider label when it is more specific.
var GENERIC_WINDOW_LABELS = {
  Session: true,
  Primary: true,
  Secondary: true,
  Tertiary: true
}

function emptySnapshot(message) {
  return {
    state: "unavailable",
    providers: [],
    observedAtMs: null,
    attemptedAtMs: null,
    message: message || "CodexBar has not returned usage yet."
  }
}

function loadingSnapshot(previous, nowMs) {
  var providers = previous && Array.isArray(previous.providers) ? previous.providers : []
  return {
    state: "loading",
    providers: providers,
    observedAtMs: previous && previous.observedAtMs !== undefined ? previous.observedAtMs : null,
    attemptedAtMs: nowMs,
    message: "Updating CodexBar usage."
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function providerIcon(provider) {
  var key = String(provider || "").toLowerCase()
  if (ICONS[key]) return ICONS[key]
  return FALLBACK_ICON
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value))
}

function resetDuration(resetsAtMs, nowMs) {
  var totalHours = Math.floor(Math.max(0, resetsAtMs - nowMs) / HOUR_MS)
  return {
    days: Math.floor(totalHours / 24),
    hours: totalHours % 24
  }
}

function formatResetDuration(duration) {
  return duration.days + "d " + duration.hours + "h"
}

function formatResetIn(resetsAtMs, nowMs) {
  var totalMinutes = Math.floor(Math.max(0, resetsAtMs - nowMs) / MINUTE_MS)
  if (totalMinutes <= 0) return "Resets now"
  var days = Math.floor(totalMinutes / 1440)
  var hours = Math.floor((totalMinutes % 1440) / 60)
  var minutes = totalMinutes % 60
  if (days > 0) return "Resets in " + days + "d " + hours + "h"
  if (hours > 0) return "Resets in " + hours + "h " + minutes + "m"
  return "Resets in " + minutes + "m"
}

function displayName(provider) {
  var key = String(provider || "").toLowerCase()
  if (DISPLAY_NAMES[key]) return DISPLAY_NAMES[key]
  return key.split(/[-_\s]+/).filter(function(part) { return part !== "" }).map(function(part) {
    return part.charAt(0).toUpperCase() + part.slice(1)
  }).join(" ")
}

function windowTitle(windowMinutes, label, fallback) {
  if (windowMinutes === 300 && (!label || GENERIC_WINDOW_LABELS[label])) return "5h"
  if (label) return label
  return WINDOW_TITLES[windowMinutes] || fallback
}

function normalizePace(rawPace) {
  if (!isObject(rawPace) || typeof rawPace.expectedUsedPercent !== "number" || !isFinite(rawPace.expectedUsedPercent)) return null
  return { expectedUsedPercent: clamp(rawPace.expectedUsedPercent, 0, 100) }
}

function normalizeWindow(rawWindow, kind, id, title, nowMs, rawPace) {
  if (!isObject(rawWindow)) return null
  if (typeof rawWindow.usedPercent !== "number" || !isFinite(rawWindow.usedPercent)) return null
  if (typeof rawWindow.resetsAt !== "string") return null

  var resetsAtMs = Date.parse(rawWindow.resetsAt)
  if (!isFinite(resetsAtMs)) return null

  var usedPercent = rawWindow.usedPercent
  var remainingPercent = clamp(100 - usedPercent, 0, 100)
  var duration = resetDuration(resetsAtMs, nowMs)
  var windowMinutes = typeof rawWindow.windowMinutes === "number" && isFinite(rawWindow.windowMinutes)
    ? rawWindow.windowMinutes
    : null
  return {
    kind: kind,
    id: id,
    title: title,
    windowMinutes: windowMinutes,
    pace: normalizePace(rawPace),
    usedPercent: usedPercent,
    remainingPercent: remainingPercent,
    resetsAtMs: resetsAtMs,
    resetDays: duration.days,
    resetLabel: formatResetDuration(duration)
  }
}

function collectWindows(rawUsage, nowMs, rawLabels, rawPace) {
  if (!isObject(rawUsage)) return []

  var labels = isObject(rawLabels) ? rawLabels : {}
  var pace = isObject(rawPace) ? rawPace : {}

  var windows = []
  var fixed = [
    { key: "primary", title: "Primary" },
    { key: "secondary", title: "Secondary" },
    { key: "tertiary", title: "Tertiary" }
  ]

  for (var i = 0; i < fixed.length; i++) {
    var definition = fixed[i]
    var rawWindow = rawUsage[definition.key]
    var windowMinutes = isObject(rawWindow) && typeof rawWindow.windowMinutes === "number" && isFinite(rawWindow.windowMinutes)
      ? rawWindow.windowMinutes
      : null
    var label = typeof labels[definition.key] === "string" ? labels[definition.key] : ""
    var title = windowTitle(windowMinutes, label, definition.title)
    var fixedWindow = normalizeWindow(rawWindow, definition.key, definition.key, title, nowMs, pace[definition.key])
    if (fixedWindow) windows.push(fixedWindow)
  }

  var extras = Array.isArray(rawUsage.extraRateWindows) ? rawUsage.extraRateWindows : []
  for (var j = 0; j < extras.length; j++) {
    var extra = extras[j]
    if (!isObject(extra) || !isObject(extra.window)) continue
    var extraId = typeof extra.id === "string" && extra.id ? extra.id : "extra-" + j
    var extraTitle = typeof extra.title === "string" && extra.title ? extra.title : extraId
    var extraWindow = normalizeWindow(extra.window, "extra", extraId, extraTitle, nowMs, pace[extraId])
    if (extraWindow) windows.push(extraWindow)
  }

  return windows
}

function derivedProviderForWindow(provider, window) {
  if (!window || window.kind !== "extra") return ""
  var providerWindows = DERIVED_WINDOW_PROVIDERS[provider.toLowerCase()]
  return providerWindows ? providerWindows[window.id] || "" : ""
}

function splitWindows(provider, windows) {
  var ordinaryWindows = []
  var derivedWindows = {}
  for (var i = 0; i < windows.length; i++) {
    var window = windows[i]
    var derivedProvider = derivedProviderForWindow(provider, window)
    if (!derivedProvider) {
      ordinaryWindows.push(window)
      continue
    }

    if (!derivedWindows[derivedProvider]) derivedWindows[derivedProvider] = []
    derivedWindows[derivedProvider].push(window)
  }
  return {
    ordinary: ordinaryWindows,
    derived: derivedWindows
  }
}

function selectWindow(windows) {
  if (!Array.isArray(windows) || windows.length === 0) return null
  var selected = windows[0]
  for (var i = 1; i < windows.length; i++) {
    var candidate = windows[i]
    if (candidate.remainingPercent < selected.remainingPercent ||
        (candidate.remainingPercent === selected.remainingPercent && candidate.resetsAtMs < selected.resetsAtMs)) {
      selected = candidate
    }
  }
  return selected
}

function usageRow(provider, source, icon, windows, info) {
  var selectedWindow = selectWindow(windows)
  var remainingPercent = selectedWindow.remainingPercent
  var remainingLabel = String(Math.round(remainingPercent)) + "%"
  var resetLabel = selectedWindow.resetLabel
  return {
    kind: "usage",
    provider: provider,
    source: source,
    icon: icon,
    windows: windows,
    selectedWindow: selectedWindow,
    remainingPercent: remainingPercent,
    remainingLabel: remainingLabel,
    resetDays: selectedWindow.resetDays,
    resetLabel: resetLabel,
    info: info || providerInfo(provider, null, null),
    error: null
  }
}

function errorRow(provider, source, icon, message, info) {
  var text = message || "No usable usage window was returned."
  return {
    kind: "error",
    provider: provider,
    source: source,
    icon: icon,
    windows: [],
    selectedWindow: null,
    remainingPercent: null,
    remainingLabel: "--%",
    resetDays: null,
    resetLabel: "--",
    info: info || providerInfo(provider, null, null),
    error: text
  }
}

function formatAmount(value) {
  if (Math.round(value) === value) return String(value)
  return value.toFixed(2)
}

function finiteNumber(value) {
  return typeof value === "number" && isFinite(value)
}

function creditRows(record, usage) {
  var rows = []
  var credits = record.credits
  if (isObject(credits) && credits.balanceReadSucceeded !== false && finiteNumber(credits.remaining) &&
      (credits.creditsAvailable === true || credits.remaining > 0)) {
    rows.push({ label: "Credits balance", value: formatAmount(credits.remaining) })
  }

  var cost = usage.providerCost
  if (isObject(cost) && finiteNumber(cost.used) && (cost.used > 0 || (finiteNumber(cost.limit) && cost.limit > 0))) {
    var currency = typeof cost.currencyCode === "string" ? cost.currencyCode : ""
    var value = formatAmount(cost.used)
    if (finiteNumber(cost.limit) && cost.limit > 0) value += " / " + formatAmount(cost.limit)
    if (currency) value += " " + currency
    rows.push({ label: typeof cost.period === "string" && cost.period ? cost.period : "Spend", value: value })
  }

  var resets = usage.codexResetCredits
  if (isObject(resets) && finiteNumber(resets.availableCount) && resets.availableCount > 0) {
    rows.push({ label: "Limit resets available", value: String(resets.availableCount) })
  }
  return rows
}

function detailSections(usage) {
  var sections = []
  var details = Array.isArray(usage.details) ? usage.details : []
  for (var i = 0; i < details.length; i++) {
    var detail = details[i]
    if (!isObject(detail) || !Array.isArray(detail.rows)) continue
    var rows = []
    for (var j = 0; j < detail.rows.length; j++) {
      var row = detail.rows[j]
      if (!isObject(row) || typeof row.label !== "string" || row.value === undefined || row.value === null) continue
      rows.push({ label: row.label, value: String(row.value) })
    }
    if (rows.length > 0) sections.push({ title: typeof detail.title === "string" && detail.title ? detail.title : "Details", rows: rows })
  }
  return sections
}

function providerInfo(provider, record, usage) {
  var rawRecord = isObject(record) ? record : {}
  var rawUsage = isObject(usage) ? usage : {}
  var sections = []
  var credits = creditRows(rawRecord, rawUsage)
  if (credits.length > 0) sections.push({ title: "Credits", rows: credits })
  return {
    displayName: displayName(provider),
    sections: sections.concat(detailSections(rawUsage))
  }
}

function errorMessage(value) {
  if (typeof value === "string") return value.trim()
  if (isObject(value) && typeof value.message === "string") return value.message.trim()
  return String(value || "").trim()
}

function normalizeProviderRows(record, nowMs) {
  if (!isObject(record) || typeof record.provider !== "string" || !record.provider.trim()) return null

  var provider = record.provider.trim()
  var source = typeof record.source === "string" ? record.source : ""
  var icon = providerIcon(provider)
  var info = providerInfo(provider, record, record.usage)
  if (record.error !== undefined && record.error !== null && errorMessage(record.error)) {
    return [errorRow(provider, source, icon, errorMessage(record.error), info)]
  }

  var windows = collectWindows(record.usage, nowMs, record.rateWindowLabels, record.pace)
  if (windows.length === 0) return [errorRow(provider, source, icon, "No usable usage window was returned.", info)]

  var split = splitWindows(provider, windows)
  var rows = []
  if (split.ordinary.length > 0) rows.push(usageRow(provider, source, icon, split.ordinary, info))

  var derivedProviders = Object.keys(split.derived)
  for (var i = 0; i < derivedProviders.length; i++) {
    var derivedProvider = derivedProviders[i]
    rows.push(usageRow(derivedProvider, source, providerIcon(derivedProvider), split.derived[derivedProvider]))
  }

  return rows
}

function mergeProviderRows(existing, incoming) {
  if (existing.kind === "usage" && incoming.kind === "usage") {
    return usageRow(existing.provider, existing.source || incoming.source, existing.icon, existing.windows.concat(incoming.windows), existing.info)
  }
  if (existing.kind === "usage") return existing
  if (incoming.kind === "usage") return incoming
  return existing
}

function parsePayload(rawJson, nowMs) {
  var payload
  try {
    payload = JSON.parse(String(rawJson || ""))
  } catch (error) {
    return { ok: false, error: "CodexBar returned invalid JSON." }
  }

  if (!Array.isArray(payload)) return { ok: false, error: "CodexBar returned an unexpected payload." }

  var providers = []
  var indexes = {}
  for (var i = 0; i < payload.length; i++) {
    var rows = normalizeProviderRows(payload[i], nowMs)
    if (!rows) return { ok: false, error: "CodexBar returned an invalid provider record." }
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      var row = rows[rowIndex]
      if (indexes[row.provider] !== undefined) {
        providers[indexes[row.provider]] = mergeProviderRows(providers[indexes[row.provider]], row)
      } else {
        indexes[row.provider] = providers.length
        providers.push(row)
      }
    }
  }

  return {
    ok: true,
    state: providers.length > 0 ? "ready" : "empty",
    providers: providers,
    message: providers.length > 0 ? "" : "No enabled CodexBar providers."
  }
}

function fromProcessResult(previous, exitCode, stdout, stderr, nowMs) {
  var attemptedAtMs = nowMs
  if (exitCode === 0) {
    var parsed = parsePayload(stdout, nowMs)
    if (parsed.ok) {
      return {
        state: parsed.state,
        providers: parsed.providers,
        observedAtMs: nowMs,
        attemptedAtMs: attemptedAtMs,
        message: parsed.message
      }
    }
    stderr = parsed.error
  }

  var providers = previous && Array.isArray(previous.providers) ? previous.providers : []
  var failure = String(stderr || "CodexBar could not return usage.").trim()
  if (!failure) failure = "CodexBar could not return usage."
  return {
    state: providers.length > 0 ? "stale" : "unavailable",
    providers: providers,
    observedAtMs: previous && previous.observedAtMs !== undefined ? previous.observedAtMs : null,
    attemptedAtMs: attemptedAtMs,
    message: failure
  }
}

var api = {
  emptySnapshot: emptySnapshot,
  loadingSnapshot: loadingSnapshot,
  providerIcon: providerIcon,
  displayName: displayName,
  formatResetIn: formatResetIn,
  collectWindows: collectWindows,
  selectWindow: selectWindow,
  parsePayload: parsePayload,
  fromProcessResult: fromProcessResult
}

if (typeof module !== "undefined" && module.exports) module.exports = api
