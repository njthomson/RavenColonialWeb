# RavenColonialWeb

## Repo layout

| Path | In PR | Purpose |
|------|-------|---------|
| `src/` | Yes | Production app + economy model |
| `docs/` | Yes | Production architecture ([technical](docs/economy-model.md) · [plain-language](docs/economy-model-guide.md)) |
| `local/` | No | Local tests, Spansh tools, and dev-only docs (gitignored) |

```bash
npm start              # site (src/ only)
npm run build
```

Local verification (not in git): clone keeps a `local/` folder on disk — see `local/README.md` if present for fixture/Spansh tooling.

Economy docs: **[technical model](docs/economy-model.md)** · **[plain-language guide](docs/economy-model-guide.md)**.
