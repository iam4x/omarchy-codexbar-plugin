# CodexBar usage for Omarchy

Show enabled CodexBar providers on the right side of the Omarchy top bar.

Each provider displays its icon, remaining usage, and time until reset:

```text
[icon] 35% 5d 16h
```

The plugin reads the enabled provider list from CodexBar. It does not keep a
second provider configuration or handle credentials.

## Install

### 1. Install CodexBar

Install the CLI from the Arch User Repository, then confirm it is available:

```bash
yay -S codexbar-cli
codexbar --version
```

### 2. Enable providers

List the available provider settings:

```bash
codexbar config providers
```

Enable providers that use an existing login:

```bash
codexbar config enable --provider codex
codexbar config enable --provider claude
```

For a provider that needs an API key, pass it through standard input:

```bash
PROVIDER_ID=claude
printf '%s' "$PROVIDER_API_KEY" \
  | codexbar config set-api-key --provider "$PROVIDER_ID" --stdin
```

Set `PROVIDER_ID` to the ID shown by `codexbar config providers`. Disable a
provider with:

```bash
codexbar config disable --provider claude
```

Replace `claude` with the provider ID you want to disable.

### 3. Install the plugin

After publishing this repository, install it with:

```bash
omarchy plugin add https://github.com/iam4x/omarchy-codexbar-plugin --enable
```

## Local development

From this checkout, create or verify the Omarchy development link:

```bash
./scripts/link-dev.sh
omarchy plugin enable iam4x.codexbar --section right
```

The script links this repository at:

```text
~/.config/omarchy/plugins/iam4x.codexbar
```

For automatic shell rescans while editing, run:

```bash
./scripts/link-dev.sh --watch
```

The watcher requires `inotifywait`. Stop it with `Ctrl-C`. To rescan once:

```bash
omarchy-shell shell rescanPlugins
```

Validate the repository after changing the manifest or plugin files:

```bash
omarchy plugin validate .
```

## What the bar shows

- Remaining usage is `100 - usedPercent`, clamped between `0%` and `100%`.
- Reset time uses whole days and remaining hours, rounded down, such as
  `5d 16h`.
- When a provider exposes multiple rate windows, the widget shows the window
  with the least remaining capacity.
- Provider errors remain visible with `--` values.
- Providers without a matching icon use a `?` fallback.
- The widget refreshes on startup and every five minutes. A middle click
  starts a manual refresh. Clicks during an active refresh are ignored.
- Visible provider content pulses gently during a refresh.
- There is no hover tooltip.

## Details panel

A left click opens a panel with one column per provider. Each column shows:

- The provider logo and name.
- Every rate window with its remaining percentage, a meter that drains as
  usage grows, and the time until reset. When CodexBar reports pace, a tick
  marks where the meter should be.
- Credits, spend, and any usage breakdown CodexBar returns.

The footer shows the last update time and a refresh button. Press `r` to
refresh or `Esc` to close. The panel also answers IPC:

```bash
qs ipc -p "$OMARCHY_PATH/shell" call iam4x.codexbar toggle
```

The widget hides when CodexBar returns no enabled provider records.

## Troubleshooting

Check the raw CodexBar output first:

```bash
codexbar usage --format json --json-only
```

Check that Omarchy discovered the plugin:

```bash
omarchy plugin list --json
```

Inspect recent shell errors when the plugin is listed but missing from the bar:

```bash
qs log -p "$OMARCHY_PATH/shell" --tail 100
```

For CodexBar provider details, see the
[CodexBar CLI documentation](https://github.com/steipete/CodexBar/blob/main/docs/cli.md).
For the plugin contract, see the
[Omarchy shell plugin documentation](https://github.com/basecamp/omarchy/blob/quattro/docs/omarchy-shell.md).
