# API Error Handling

The frontend must never render raw upstream responses. All product pages use the centralized `apiFetch` wrapper in `frontend/lib/api.ts`.

## Frontend Contract

`apiFetch` adds an `x-request-id`, applies a request timeout, checks response size, validates `content-type`, and parses JSON safely.

Classifications:

- `network`: fetch failed before a response was received.
- `timeout`: request exceeded `NEXT_PUBLIC_API_TIMEOUT_MS` or the default timeout.
- `html_response`: an API route returned HTML, usually a Next.js or proxy error page.
- `invalid_json`: response claimed or needed JSON but could not be parsed.
- `backend_unavailable`: backend returned a 5xx JSON error.
- `auth`: backend returned 401/403.
- `capability_disabled`: backend reports a disabled provider or missing env.
- `http`: other non-2xx API errors.

`ApiState.ErrorState` shows a sanitized user message and request ID. In development only, it exposes expandable diagnostics with status, URL, content type, code, and a short body preview. HTML is never rendered into the card.

## Backend Contract

Backend errors should return structured JSON:

```json
{
  "success": false,
  "error": {
    "code": "REQUEST_FAILED",
    "message": "The request could not be completed.",
    "details": {}
  }
}
```

The global Nest exception filter also includes `ok: false` and top-level `code/message` for older client compatibility.

The Vercel API entrypoint `api/[...path].ts` installs the same exception filter and catches backend bootstrap failures so `/api/*` returns JSON instead of a framework HTML page.

## Profile Dashboard

`/profile` uses `ProductDataPage` with `walletRequired`. The page does not fetch profile data until a wallet is connected. Once connected, `/product/profile?wallet=...` returns safe empty data on missing user or database read failure, so widgets can render partial/empty states instead of crashing.

## Verification

Run:

```powershell
npm run test:api-errors
npm run typecheck
npm run build
```

The API error tests cover backend offline, invalid endpoint, HTML upstream response, malformed JSON, timeout, 500 JSON, and successful JSON parsing.
