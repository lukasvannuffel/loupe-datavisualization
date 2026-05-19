# AI Gateway setup

Loupe routes all model calls through the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). Provider-specific SDKs are not used in application code.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `AI_GATEWAY_API_KEY` | Yes (AI features) | API key from the Vercel AI Gateway dashboard |
| `ANTHROPIC_MODEL` | No | Defaults to `anthropic/claude-sonnet-4.6` |
| `AI_GATEWAY_BASE_URL` | No | Override gateway base URL |
| `RATE_LIMIT_SALT` | Yes (rate limiting) | Server-only secret for hashing anonymous actor keys (see below) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Same Supabase project used for auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (rate limiting) | Service role — writes `ai_rate_limits` (bypasses RLS) |

Copy `.env.local.example` to `.env.local` and fill in values.

### Generate `RATE_LIMIT_SALT`

```bash
openssl rand -hex 32
```

Add the output to `.env.local` and to Vercel project environment variables for production. Never commit the salt to git.

Anonymous users are rate-limited by a **SHA-256 hash** of their IP combined with this salt. Without the salt, hashes cannot be reversed or precomputed from IPs. Authenticated users use `user:<uuid>` (opaque Supabase user id).

## Smoke test

```bash
npm run smoke:ai
```

Requires `AI_GATEWAY_API_KEY` in `.env.local`.

## Rate limiting

**Limit:** 20 AI recommendation calls per actor per rolling hour. The 21st call within the window returns `RATE_LIMITED` with a user-readable retry message.

**Actor resolution:**

- Signed-in user → `user:<supabase_user_id>`
- Anonymous → salted hash of client IP (never stored raw)

**IP detection (Vercel):** `x-forwarded-for` (first comma-separated value), then `x-real-ip`, then `"unknown"`.

**Storage:** Supabase table `public.ai_rate_limits` (`actor_key`, `called_at`). RLS denies all client access; only the service role used in `recommendChart` can read/write.

**Cache:** Client-side recommendation cache hits do not call `recommendChart` and therefore do not consume rate-limit quota.

### View activity

Supabase Dashboard → Table Editor → `ai_rate_limits`.

### Reset a user’s limit

Delete rows for their `actor_key`:

```sql
delete from public.ai_rate_limits where actor_key = 'user:<uuid>';
```

For anonymous actors, delete by the hashed `actor_key` value shown in server logs (`[ai] recommend` → `actorKey`).

### Fail-open behavior

If Supabase is unavailable during the rate-limit check, recommendations are **allowed** (logged as error). The AI Gateway monthly cost cap remains the absolute backstop.

## Input token budget

Each recommendation call enforces a **5,000 input-token ceiling** (heuristic: `ceil(characters / 4)`), including the system prompt and user prompt shell. If the intent would exceed the budget, the intent field is truncated on a word boundary with a ` […truncated]` suffix before the model call. Truncation is logged server-side (`intentTruncated` on `[ai] recommend`).

## Cost logging

Every successful recommendation logs a single JSON-friendly line:

```
[ai] recommend { model, latencyMs, inputTokens, outputTokens, actorKey, intentTruncated, intentOriginalTokens, intentFinalTokens, dailyTokenTotal }
```

`dailyTokenTotal` is a best-effort in-memory counter (UTC day, per server instance). Use gateway dashboard metrics for authoritative billing.

## Cost cap (third safety net)

Configure a **hard monthly spend cap** in the Vercel AI Gateway dashboard so runaway usage cannot exceed budget even if application guardrails fail.

1. Open [Vercel Dashboard](https://vercel.com) → your project → **AI** → **Gateway**.
2. Set **Budget / spend limit** (recommended: align with project budget, e.g. **$50/month** for development).
3. Enable notifications if available.

This cap is **not** enforced in application code; it is configured only in the gateway UI.

**Documented cap for this project:** $50/month (adjust in dashboard if budget changes).

## Apply database migration

```bash
supabase db reset
# or: supabase migration up
```

Migration file: `supabase/migrations/20260519_ai_rate_limits.sql`.
