# Design Tokens — Color MVP (Phase 1)

Canonical Token Layer scaffold from [docs/skill.md](docs/skill.md).

**Current token data:** dummy import from [Atlassian Design System](https://atlassian.design/) via `@atlaskit/tokens` (Apache-2.0). Replace with your Figma export when available.

## Quick start

```bash
npm install
npm run import:atlassian  # refresh dummy tokens from @atlaskit/tokens
npm run validate   # Validation Engine (§23)
npm run contrast   # WCAG AA on contrast-pairs.json
npm run build      # registry + css/scss/ts/json/storybook docs
```

## Figma extract (needs your credentials)

```bash
cp .env.example .env
# fill FIGMA_ACCESS_TOKEN + FIGMA_FILE_KEY
npm run extract
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run validate` | Naming, duplicates, circular aliases, docs |
| `npm run contrast` | WCAG AA on declared text/background pairs |
| `npm run build` | Emit `generated/` + `canonical-registry.json` |
| `npm run import:atlassian` | Refresh dummy tokens from Atlassian ADS |
| `npm run extract` | Pull Figma Variables → snapshot (Enterprise API only) |
| `npm run writeback` | Stub — Phase 3 |

## Layout

See §17 in `docs/skill.md`. Hand-edit only `tokens/colors/*.json`.
