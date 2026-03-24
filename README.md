# opencode-copilot-usage

Friendly OpenCode plugin to keep an eye on your GitHub Copilot premium usage.

It gives you lightweight visibility while you work:
- info toast on every user message
- warning toasts as you approach your monthly limit
- `copilot_usage_status` tool for quick status checks

## Why this plugin

If you are on Copilot plans with premium request quotas, this plugin helps you avoid surprises by showing your usage in real time inside OpenCode.

## Features

- Fetches usage from `GET /copilot_internal/user` (primary)
- Falls back to GitHub billing summary if needed
- Falls back to local estimate if API data is unavailable
- Persists monthly state in `.opencode/state/copilot-usage.json`
- Warns at configurable thresholds (`75%`, `90%`, `100%` by default)
- Adds custom tool: `copilot_usage_status`

## Install

Add the plugin to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-copilot-usage"]
}
```

Restart OpenCode after updating config.

## Quick usage

- Send a user message: you will get a short info toast.
- Ask OpenCode to run `copilot_usage_status` for a full snapshot.
- Keep coding; warning toasts appear automatically as thresholds are crossed.

## Configuration

Environment variables:

- `GITHUB_TOKEN`: preferred token for usage API
- `GH_TOKEN`: alternate token variable
- `COPILOT_API_GITHUB_TOKEN`: alternate token variable
- If no token env is set, plugin reads `~/.local/share/opencode/auth.json` (`github-copilot.access`)
- `GITHUB_USERNAME`: optional username override
- `OPENCODE_COPILOT_USAGE_MONTHLY_LIMIT`: default `300`
- `OPENCODE_COPILOT_USAGE_WARN_THRESHOLDS`: default `0.75,0.9,1`
- `OPENCODE_COPILOT_USAGE_WARN_COOLDOWN_MINUTES`: default `360`
- `OPENCODE_COPILOT_USAGE_REPEAT_OVER_LIMIT_EVERY`: default `25`
- `OPENCODE_COPILOT_USAGE_BILLING_START_DAY`: default `1` (range `1-28`)
- `OPENCODE_COPILOT_USAGE_BILLING_TIMEZONE`: `utc` (default) or `local`
- `OPENCODE_COPILOT_USAGE_TOAST_EVERY_PREMIUM_REQUEST`: default `true`
- `OPENCODE_COPILOT_USAGE_REQUEST_TOAST_DURATION_MS`: default `3000`
- `OPENCODE_COPILOT_USAGE_STATE_FILE`: optional custom state path
- `OPENCODE_COPILOT_USAGE_DEBUG`: default `false`

## Notes

- OpenCode plugins currently do not expose custom sidebar widget injection.
- This plugin shows usage via toasts and tool output instead.

## Local development

```bash
npm install
npm run typecheck
npm run build
```

## Release

- Manual publish:

```bash
npm publish --access public
```

- CI publish (recommended): push a `v*` tag with `NPM_TOKEN` configured in repo secrets.
