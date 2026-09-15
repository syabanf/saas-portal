import type { IntegrationMode, SdkStack } from '@scp/types'

export interface SdkSnippet {
  install: string
  code: string
  language: string
}

/** Integration snippets shown in the wizard and the SDK page (blueprint §33 step 5, §50). */
export function sdkSnippet(stack: SdkStack, audience: string): SdkSnippet {
  switch (stack) {
    case 'node':
      return {
        install: 'npm install @platform/node',
        language: 'javascript',
        code: `import { SaaSGuard } from "@platform/node";

const guard = new SaaSGuard({
  issuer: process.env.SAAS_ISSUER,
  audience: "${audience}",
});

app.use(async (req, res, next) => {
  const result = await guard.verify(req.headers.authorization);
  if (!result.valid) return res.status(401).json({ error: result.reason });
  req.tenant = result.claims.tenant_id;
  next();
});`,
      }
    case 'next':
      return {
        install: 'npm install @platform/next',
        language: 'typescript',
        code: `// app/auth/callback/route.ts
import { handleCallback } from "@platform/next";

export const GET = handleCallback({
  clientId: process.env.APP_CLIENT_ID!,
  clientSecret: process.env.APP_CLIENT_SECRET!,
  audience: "${audience}",
  redirectTo: "/dashboard",
});`,
      }
    case 'go':
      return {
        install: 'go get github.com/platform/saas-go',
        language: 'go',
        code: `guard := saas.NewGuard(saas.Config{
    Issuer:   os.Getenv("SAAS_ISSUER"),
    Audience: "${audience}",
})

r.Use(guard.Middleware())`,
      }
    case 'php':
      return {
        install: 'composer require platform/saas',
        language: 'php',
        code: `$guard = new \\Platform\\SaaSGuard([
    'issuer' => getenv('SAAS_ISSUER'),
    'audience' => '${audience}',
]);

$result = $guard->verify($request->bearerToken());
if (! $result->valid) {
    abort(401, $result->reason);
}`,
      }
    case 'flutter':
      return {
        install: 'flutter pub add platform_saas',
        language: 'dart',
        code: `final saas = SaaSClient(
  issuer: 'http://localhost:3200',
  clientId: 'iot_mobile',
  audience: '${audience}',
  redirectUri: 'iotmobile://auth/callback',
);

final session = await saas.login();`,
      }
    case 'rest':
      return {
        install: 'No SDK required',
        language: 'http',
        code: `POST /v1/access/code/exchange
Content-Type: application/json
Authorization: Basic base64(client_id:client_secret)

{ "code": "<authorization_code>", "redirect_uri": "http://localhost:4101/auth/callback" }

HTTP/1.1 200 OK
{ "access_token": "<app_token>", "token_type": "Bearer", "expires_in": 900, "aud": "${audience}" }`,
      }
  }
}

export function envSnippet(clientId: string, audience: string, callbackUrl: string): string {
  return `SAAS_ISSUER=http://localhost:3200
SAAS_ACCESS_BROKER=http://localhost:3300
SAAS_CLIENT_ID=${clientId}
SAAS_CLIENT_SECRET=<shown once at creation>
SAAS_AUDIENCE=${audience}
SAAS_CALLBACK_URL=${callbackUrl}`
}

export interface IntegrationGuide {
  /** One sentence describing who calls whom. */
  summary: string
  /** What the product owner must build or point at. */
  todo: string[]
  language: string
  code: string
}

/** Copy-paste guide for the two ways a product can be protected (blueprint §18, §21). */
export function integrationGuide(
  mode: IntegrationMode,
  code: string,
  apiUrl: string,
): IntegrationGuide {
  if (mode === 'gateway') {
    return {
      summary: `Callers send requests to the SaaS Gate gateway. We check the subscription and forward to ${apiUrl}.`,
      todo: [
        'Point your clients at the gateway URL below instead of your own API.',
        'Accept the forwarded request on your API and trust the X-Tenant-Id header.',
      ],
      language: 'http',
      code: `GET https://gateway.saasgate.example/${code}/devices
Authorization: Bearer <client_token>

# SaaS Gate checks the subscription, then forwards to
# ${apiUrl}/devices with these headers:
#   X-Tenant-Id: org_abc
#   X-Subscription-Status: active
#   X-Forwarded-By: saas-gate`,
    }
  }
  return {
    summary: `Your application calls the SaaS Gate check endpoint, then serves the request from ${apiUrl}.`,
    todo: [
      'Call the check endpoint at the start of a protected request.',
      'Deny the request yourself when the answer is not allowed.',
    ],
    language: 'javascript',
    code: `const res = await fetch("https://api.saasgate.example/v1/access/check", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: \`Bearer \${process.env.SAAS_CLIENT_SECRET}\`,
  },
  body: JSON.stringify({ product: "${code}", tenant_id: tenantId }),
});

const { allowed, reason } = await res.json();
if (!allowed) return reply.code(403).send({ error: reason });`,
  }
}
