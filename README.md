# 3 Days in Italy

An interactive planner that builds an editable 3-day itinerary from a fixed dataset of 103 Italian Places.

**Live:** https://italy-trip-planner-5aeea.web.app

- [Spec](docs/SPEC.md) · [Glossary](GLOSSARY.md) · [Decisions (ADRs)](docs/adr/)
- [Data corrections review](docs/data/corrections-review.md): every change made to the raw data, with its reason

## Run it locally

Requires **Node 24**.

```sh
npm ci
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` / `npm run test:run` | Run the tests (watch mode / once) |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run lint` | Lint with oxlint |
| `npm run format` / `format:check` | Format with Prettier / check only |
| `npm run data:clean` | Regenerate `src/data/italy-clean.json` and the review checklist from `italy.json` + `src/data/corrections.ts` |

## How it's organised

```
italy.json                  raw dataset (never edited)
scripts/clean-data.ts       builds the clean dataset (+ dataset-wide tests)
src/
  data/                     corrections, cleaning, the clean dataset
  hours/                    opening-hours parser, Rome calendar helpers
  availability/             seasonal rules, "is it open on this date?"
  travel/                   Travel Time estimates
  schedule/                 timed day + Warnings
  preferences/              Preferences, Interests, Base Cities
  scoring/                  scores, "why" chips, budget groups
  generator/                plans one day (ADR 0002)
  trip/                     the Trip: every editor action, save/load
  editor/, onboarding/      wording and view logic for the screens
  ui/                       React components (MUI)
```


## Data

`italy.json` is the source of truth and is never edited. `src/data/corrections.ts` lists every fix with a reason and a source (`manual`, `assumption`, `ai-draft`, `rule`). **AI-drafted corrections apply only after a person sets `approved: true`.** Tests fail if a correction is stale or if the committed clean data doesn't match what the script would produce.

## Deploy

GitHub Actions ([`ci-deploy.yml`](.github/workflows/ci-deploy.yml)) runs format, lint, tests and build on every push and pull request. Then:

- **pull requests** deploy to a Firebase preview URL, posted on the PR;
- **`main`** deploys to the live site.

Nothing deploys if a check fails. Hosting is on Firebase's free Spark plan. The only external requests are OpenStreetMap map tiles.
