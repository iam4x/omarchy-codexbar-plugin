#!/usr/bin/env bash

set -euo pipefail

plugin_id="iam4x.codexbar"
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
config_root="${XDG_CONFIG_HOME:-$HOME/.config}"
plugins_root="$config_root/omarchy/plugins"
link_path="$plugins_root/$plugin_id"
watch=false

if [[ ${1:-} == "--watch" ]]; then
  watch=true
  shift
fi

if (( $# > 0 )); then
  printf 'Usage: %s [--watch]\n' "${BASH_SOURCE[0]}" >&2
  exit 2
fi

omarchy plugin validate "$repo_root"
mkdir -p "$plugins_root"

if [[ -L "$link_path" ]]; then
  current_target="$(readlink -f -- "$link_path" || true)"
  if [[ "$current_target" != "$repo_root" ]]; then
    printf 'Refusing to replace %s. It points to %s.\n' "$link_path" "${current_target:-an unresolved target}" >&2
    exit 1
  fi
  printf 'Development link already points to %s.\n' "$repo_root"
elif [[ -e "$link_path" ]]; then
  printf 'Refusing to replace existing path %s.\n' "$link_path" >&2
  exit 1
else
  ln -s -- "$repo_root" "$link_path"
  printf 'Linked %s to %s.\n' "$link_path" "$repo_root"
fi

omarchy-shell shell rescanPlugins

if [[ "$watch" != true ]]; then
  exit 0
fi

command -v inotifywait >/dev/null 2>&1 || {
  printf 'inotifywait is required for --watch.\n' >&2
  exit 1
}

printf 'Watching %s. Press Ctrl-C to stop.\n' "$repo_root"

while IFS= read -r changed_path; do
  case "$changed_path" in
    "$repo_root/.git/"*) continue ;;
  esac
  omarchy-shell shell rescanPlugins
done < <(
  inotifywait \
    --monitor \
    --recursive \
    --quiet \
    --event close_write,create,delete,move \
    --exclude '(^|/)\.git(/|$)' \
    --format '%w%f' \
    "$repo_root"
)
