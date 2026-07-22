# Design Tokens — Color MVP (Phase 1)

Canonical Token Layer scaffold from [docs/skill.md](docs/skill.md).

## Quick start

```bash
npm install
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
| `npm run extract` | Pull Figma Variables → snapshot (Phase 1 manual) |
| `npm run writeback` | Stub — Phase 3 |

## Layout

See §17 in `docs/skill.md`. Hand-edit only `tokens/colors/*.json`.
