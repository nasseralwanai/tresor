# Trésor Edge Functions

Directory for Supabase Deno Edge Functions.

## Structure
- `_shared/` — shared utilities (CORS, Supabase admin client)
- Individual function directories (e.g., `ai-vision/`, `link-parse/`)

## Deploy (local)
```bash
supabase functions deploy <function-name>
```

## Invoke (local)
```bash
curl -i --location --request POST \
  'http://127.0.0.1:54321/functions/v1/<function-name>' \
  --header 'Authorization: Bearer <anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{"name":"Functions"}'
```

## Phase 2+ Functions Planned
- `bulk-import-ai` — batch photo → AI identification (Phase 2, Nasser's requirement)
- `ai-vision` — single photo → brand/model/value (Phase 4)
- `link-parse` — URL → structured item data (Phase 4)
- `price-track` — scheduled price tracking (Phase 6)
