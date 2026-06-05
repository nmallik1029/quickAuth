import { NextRequest, NextResponse } from "next/server";
import { verifyClientAppSecret, getClientAppByClientId } from "@/lib/auth/client-apps";
import { consumeAuthorizationCode, createAccessToken } from "@/lib/oauth/codes";
import { createAuditLog } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

type Params = {
  grant_type?: string;
  code?: string;
  redirect_uri?: string;
  client_id?: string;
  client_secret?: string;
};

async function readParams(req: NextRequest): Promise<Params> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await req.json()) as Params;
  }
  const form = await req.formData();
  return Object.fromEntries(form.entries()) as Params;
}

function err(error: string, description?: string, status = 400) {
  return NextResponse.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status },
  );
}

export async function POST(req: NextRequest) {
  const p = await readParams(req);

  if (p.grant_type !== "authorization_code") {
    return err("unsupported_grant_type");
  }
  if (!p.code || !p.client_id || !p.client_secret || !p.redirect_uri) {
    return err("invalid_request", "Missing required parameter.");
  }

  // Rate limit per client.
  const rl = await checkRateLimit({
    key: `oauth-token:client:${p.client_id}`,
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) return err("rate_limited", "Too many token requests.", 429);

  const secretOk = await verifyClientAppSecret(p.client_id, p.client_secret);
  if (!secretOk) {
    await createAuditLog({ action: "oauth.token.failed", metadata: { clientId: p.client_id, reason: "bad_client" } });
    return err("invalid_client", "Client authentication failed.", 401);
  }

  const app = await getClientAppByClientId(p.client_id);
  if (!app || !app.isActive) {
    return err("invalid_client", "Client not active.", 401);
  }

  const result = await consumeAuthorizationCode({
    rawCode: p.code,
    clientAppId: app.id,
    redirectUri: p.redirect_uri,
  });
  if (!result.ok) {
    await createAuditLog({
      action: "oauth.token.failed",
      metadata: { clientId: p.client_id, reason: result.reason },
    });
    return err("invalid_grant", "Authorization code is invalid, expired, or already used.");
  }

  const { token, expiresAt } = await createAccessToken({
    clientAppId: app.id,
    userId: result.userId,
    scope: result.scope,
  });

  // Off the critical path — don't make the client wait on the audit write.
  void createAuditLog({
    action: "oauth.token.issued",
    actorUserId: result.userId,
    targetUserId: result.userId,
    metadata: { clientAppId: app.id, clientId: p.client_id },
  }).catch(() => {});

  return NextResponse.json({
    access_token: token,
    token_type: "Bearer",
    expires_in: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
    scope: result.scope ?? undefined,
    user_id: result.userId,
    // Embedded profile so first-party clients can skip the /oauth/userinfo call.
    user: result.user,
  });
}

export async function OPTIONS() {
  // No CORS by default — token requests should be server-to-server.
  return new NextResponse(null, { status: 204 });
}
