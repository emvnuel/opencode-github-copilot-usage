# opencode-copilot-usage

OpenCode plugin to track GitHub Copilot premium request usage, persist monthly state, and warn when usage approaches configured limits.

## What it does

- Fetches Copilot premium usage from GitHub internal endpoint `GET /copilot_internal/user` (primary source)
- Falls back to GitHub billing summary endpoint when internal endpoint is unavailable
- Falls back to local estimate from OpenCode events when API data is unavailable
- Shows a per-request info toast for each user message (enabled by default)
- Persists state at `.opencode/state/copilot-usage.json`
- Emits warn toasts at configured thresholds (`75%`, `90%`, `100%` by default)
- Provides custom tool `copilot_usage_status` for on-demand usage status

## Sidebar note

OpenCode plugin hooks currently do not expose custom sidebar widget injection. This plugin surfaces usage through warning toasts and tool output.

## Installation

Add plugin package to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-copilot-usage"]
}
```

## Configuration

This plugin reads environment variables:

- `GITHUB_TOKEN`: GitHub token used for Copilot usage API
- `GH_TOKEN`: Alternate token env var
- `COPILOT_API_GITHUB_TOKEN`: Alternate token env var
- If no env token is set, plugin also reads OpenCode auth storage at `~/.local/share/opencode/auth.json` (`github-copilot.access`)
- `GITHUB_USERNAME`: Optional GitHub username override
- `OPENCODE_COPILOT_USAGE_MONTHLY_LIMIT`: Default `300`
- `OPENCODE_COPILOT_USAGE_WARN_THRESHOLDS`: Comma-separated ratios (example: `0.75,0.9,1`)
- `OPENCODE_COPILOT_USAGE_WARN_COOLDOWN_MINUTES`: Default `360`
- `OPENCODE_COPILOT_USAGE_REPEAT_OVER_LIMIT_EVERY`: Default `25`
- `OPENCODE_COPILOT_USAGE_BILLING_START_DAY`: Default `1` (supports `1-28`)
- `OPENCODE_COPILOT_USAGE_BILLING_TIMEZONE`: `utc` (default) or `local`
- `OPENCODE_COPILOT_USAGE_TOAST_EVERY_PREMIUM_REQUEST`: `true/false` (default `true`)
- `OPENCODE_COPILOT_USAGE_REQUEST_TOAST_DURATION_MS`: toast duration (default `3000`)
- `OPENCODE_COPILOT_USAGE_STATE_FILE`: Optional custom state path
- `OPENCODE_COPILOT_USAGE_DEBUG`: `true/false`

## Usage

After plugin loads, ask OpenCode to run tool `copilot_usage_status` to see current status snapshot.

## Local development

```bash
npm install
npm run build
```

Then point OpenCode to your built plugin package (or publish to npm).

## Publish to npm

1. Create the npm package (first time):

```bash
npm login
npm run build
npm publish --access public
```

2. Release updates:

```bash
npm version patch
git push --follow-tags
```

If GitHub Actions is configured with `NPM_TOKEN`, pushing tags like `v0.1.1` will auto-publish.
