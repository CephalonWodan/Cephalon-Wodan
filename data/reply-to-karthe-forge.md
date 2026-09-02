# Reply to Karthe — Forge/Vercel diagnosis

**Subject: Latest Vercel deployment test — Forge still returns HTTP 404**

Hi Karthe,

Thank you for following up. Please find attached a screenshot of the current Vercel environment-variable configuration and the latest Vercel build log.

I have completed the requested fresh deployment and public test. The current results are:

| Check | Result |
|---|---|
| Public site | HTTP 200; the application loads correctly |
| GitHub branch | `main` |
| Tested commit | `3f56edd` — `fix: type chat request payload` |
| Vercel build | Completed successfully |
| Deployment | Completed successfully |
| `/api/chat` | HTTP 200; the serverless function executes |
| Forge upstream call | HTTP 404 returned by Forge |
| Test request | `POST /api/chat` with a minimal French request: “Réponds uniquement OK.” |
| Test time | 31 August 2026 at approximately 07:17 UTC |

The TypeScript errors previously shown in the build log have been corrected. The Vercel function now starts successfully, so the remaining problem appears to occur when the serverless function calls the Forge upstream service.

The current Vercel configuration is:

```text
BUILT_IN_FORGE_API_URL=https://forge.manus.ai/
```

The `BUILT_IN_FORGE_API_KEY` variable is configured in Vercel for both Production and Preview as a Secret. I am not including or exposing its value for security reasons.

The function is currently calling:

```text
https://forge.manus.ai/v1/chat/completions
```

Could you please verify on the Manus side:

1. whether the Forge API key is valid and authorized;
2. whether Forge keys can be used from an external Vercel serverless function;
3. whether `https://forge.manus.ai/v1/chat/completions` is the correct endpoint;
4. whether the HTTP 404 is an endpoint error or an intentional response for an unauthorized external request; and
5. whether a different endpoint, header, model name, or official configuration is required.

The ticket is still unresolved because Vercel and `/api/chat` are operational, but Forge continues to return HTTP 404. Please keep the case open while the technical team investigates. I can provide additional sanitized logs if needed, but I will not share the API key itself.

Best regards,

[Your name]
[Manus account email]
[Project URL]
