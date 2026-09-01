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

function normalizeWindow(rawWindow, kind, id, title, nowMs) {
  if (!isObject(rawWindow)) return null
  if (typeof rawWindow.usedPercent !== "number" || !isFinite(rawWindow.usedPercent)) return null
  if (typeof rawWindow.resetsAt !== "string") return null

  var resetsAtMs = Date.parse(rawWindow.resetsAt)
  if (!isFinite(resetsAtMs)) return null

  var usedPercent = rawWindow.usedPercent
  var remainingPercent = clamp(100 - usedPercent, 0, 100)
  var duration = resetDuration(resetsAtMs, nowMs)
  return {
    kind: kind,
    id: id,
    title: title,
    usedPercent: usedPercent,
    remainingPercent: remainingPercent,
    resetsAtMs: resetsAtMs,
    resetDays: duration.days,
    resetLabel: formatResetDuration(duration)
  }
}

function collectWindows(rawUsage, nowMs) {
  if (!isObject(rawUsage)) return []

  var windows = []
  var fixed = [
    { key: "primary", title: "Primary" },
    { key: "secondary", title: "Secondary" },
    { key: "tertiary", title: "Tertiary" }
  ]

  for (var i = 0; i < fixed.length; i++) {
    var definition = fixed[i]
    var fixedWindow = normalizeWindow(rawUsage[definition.key], definition.key, definition.key, definition.title, nowMs)
    if (fixedWindow) windows.push(fixedWindow)
  }

  var extras = Array.isArray(rawUsage.extraRateWindows) ? rawUsage.extraRateWindows : []
  for (var j = 0; j < extras.length; j++) {
    var extra = extras[j]
    if (!isObject(extra) || !isObject(extra.window)) continue
    var extraId = typeof extra.id === "string" && extra.id ? extra.id : "extra-" + j
    var extraTitle = typeof extra.title === "string" && extra.title ? extra.title : extraId
    var extraWindow = normalizeWindow(extra.window, "extra", extraId, extraTitle, nowMs)
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

function usageRow(provider, source, icon, windows) {
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
    error: null
  }
}

function errorRow(provider, source, icon, message) {
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
    error: text
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
  if (record.error !== undefined && record.error !== null && errorMessage(record.error)) {
    return [errorRow(provider, source, icon, errorMessage(record.error))]
  }

  var windows = collectWindows(record.usage, nowMs)
  if (windows.length === 0) return [errorRow(provider, source, icon, "No usable usage window was returned.")]

  var split = splitWindows(provider, windows)
  var rows = []
  if (split.ordinary.length > 0) rows.push(usageRow(provider, source, icon, split.ordinary))

  var derivedProviders = Object.keys(split.derived)
  for (var i = 0; i < derivedProviders.length; i++) {
    var derivedProvider = derivedProviders[i]
    rows.push(usageRow(derivedProvider, source, providerIcon(derivedProvider), split.derived[derivedProvider]))
  }

  return rows
}

function mergeProviderRows(existing, incoming) {
  if (existing.kind === "usage" && incoming.kind === "usage") {
    return usageRow(existing.provider, existing.source || incoming.source, existing.icon, existing.windows.concat(incoming.windows))
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
  collectWindows: collectWindows,
  selectWindow: selectWindow,
  parsePayload: parsePayload,
  fromProcessResult: fromProcessResult
}

if (typeof module !== "undefined" && module.exports) module.exports = api
