# Integrating a client app (VSN Analysis, Ember Analysis, …)

## 1. Register the app

```bash
npm run create-client-app -- \
  --name "VSN Analysis" \
  --slug vsn \
  --redirect http://localhost:3001/auth/callback
```

Copy the `client_id` and `client_secret` printed once. Store them in your client app:

```
QUICKAUTH_URL=http://localhost:3000
QUICKAUTH_CLIENT_ID=qa_client_xxxxxxxx
QUICKAUTH_CLIENT_SECRET=qa_secret_xxxxxxxx
QUICKAUTH_REDIRECT_URI=http://localhost:3001/auth/callback
```

## 2. Send the user to /oauth/authorize

From your client app's "Sign in with QuickAuth" button:

```ts
const params = new URLSearchParams({
  response_type: "code",
  client_id: process.env.QUICKAUTH_CLIENT_ID!,
  redirect_uri: process.env.QUICKAUTH_REDIRECT_URI!,
  state: crypto.randomUUID(), // store this in a cookie/session to verify on callback
  scope: "profile email",
});
const url = `${process.env.QUICKAUTH_URL}/oauth/authorize?${params}`;
```

If the user isn't signed in to QuickAuth, they'll be sent to `/login` first and bounced back automatically. They'll see a consent screen, then either approve or deny.

## 3. Handle the callback

QuickAuth redirects back to your `redirect_uri` with `?code=…&state=…` (or `?error=…`).

```ts
// e.g. /auth/callback in your client app
export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  // verify state matches the one you stored

  const res = await fetch(`${process.env.QUICKAUTH_URL}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.QUICKAUTH_REDIRECT_URI,
      client_id: process.env.QUICKAUTH_CLIENT_ID,
      client_secret: process.env.QUICKAUTH_CLIENT_SECRET,
    }),
  });
  const tokens = await res.json();
  // tokens = { access_token, token_type: "Bearer", expires_in, user_id, scope }
}
```

## 4. Fetch the user profile

```ts
const user = await fetch(`${process.env.QUICKAUTH_URL}/oauth/userinfo`, {
  headers: { Authorization: `Bearer ${tokens.access_token}` },
}).then((r) => r.json());

// { id, email, email_verified, username, display_name, avatar_url }
```

Use `user.id` as the stable identifier in your own DB.

## Endpoints

| Endpoint | Method | Auth |
|---|---|---|
| `/oauth/authorize` | GET (browser) | user session |
| `/oauth/token` | POST | `client_id` + `client_secret` (server-to-server) |
| `/oauth/userinfo` | GET | `Authorization: Bearer <access_token>` |

## TTLs

- Authorization code: 60 seconds, single-use
- Access token: 1 hour
- Post-login redirect cookie: 10 minutes
