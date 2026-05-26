
A standalone self-hosted authentication starter built with Next.js, TypeScript, Prisma, SQLite, Argon2id, and secure HTTP-only cookie sessions.

This project is intended as a learning-focused authentication system for small web apps. It implements the core pieces of auth directly instead of relying on hosted auth providers like Clerk, Supabase Auth, Auth0, Firebase Auth, Better Auth, or NextAuth.

## Tech Stack

- Next.js App Router
- TypeScript
- SQLite
- Prisma
- Argon2id
- HTTP-only cookies
- Tailwind CSS

## What This Project Is

This is a self-hosted auth starter for small web applications. The goal is to understand and implement the core parts of authentication:

- user creation
- password hashing
- session creation
- session validation
- secure cookies
- protected routes
- user/profile storage

## What This Project Is Not

This is not meant to replace enterprise authentication providers like Clerk, Auth0, WorkOS, or Firebase Auth.

This is also not production-grade yet. It is a long-term project that will gradually add the security and account-management features expected from a more complete auth system.

## Security Decisions in Phase 1

Phase 1 includes the basic security foundation:

- Passwords are never stored directly.
- Passwords are hashed with Argon2id.
- Sessions are stored in the database.
- Raw session tokens are not stored in the database.
- Session tokens are hashed before storage.
- The raw session token is stored only in an HTTP-only cookie.
- Protected routes check the current session server-side.
- Disabled users cannot log in.

## Database Models

Phase 1 includes three main models:

### User

Stores account and login-related information.

```txt
id
email
emailNormalized
passwordHash
emailVerifiedAt
role
disabledAt
createdAt
updatedAt
lastLoginAt
```
### Profile

Stores user-facing profile information.

```txt
id
userId
displayName
username
bio
avatarUrl
createdAt
updatedAt
```

### Session

Stores database-backed login sessions.

```txt
id
userId
tokenHash
userAgent
ipAddress
expiresAt
createdAt
revokedAt
```

## Getting Started

Install dependencies:

```bash
npm install
```

Create the database:

```bash
npx prisma migrate dev
```

Run the development server:

```bash
npm run dev
```

Open the app:

```txt
http://localhost:3000
```

## Useful Commands

Generate Prisma client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

Open Prisma Studio:

```bash
npx prisma studio
```

Run build:

```bash
npm run build
```

## Environment Variables

For Phase 1, the app uses SQLite locally.

Example `.env`:

```env
DATABASE_URL="file:./dev.db"
```

Later phases will add email-related variables such as:

```env
RESEND_API_KEY=
EMAIL_FROM=
APP_URL=
```

## Current Routes

```txt
/
```

Home page.

```txt
/signup
```

Create a new account.

```txt
/login
```

Log into an existing account.

```txt
/dashboard
```

Protected page. Requires a valid session.

## Planned Phases

### Phase 2: Email Verification and Password Reset

Planned:

* Email verification tokens
* Resend verification email
* Forgot password
* Reset password
* Resend email integration
* Expiring single-use tokens

### Phase 3: Profile Settings and Avatar Uploads

Planned:

* Edit display name
* Edit username
* Edit bio
* Upload profile picture
* Local avatar storage for development
* Storage abstraction for future S3 or Cloudflare R2 support

### Phase 4: Roles and Admin Dashboard

Planned:

* Admin role checks
* Admin dashboard
* User search
* Enable/disable users
* Manually verify users
* Revoke user sessions

### Phase 5: Audit Logs and Rate Limiting

Planned:

* Audit logs for important actions
* Rate limiting for login/signup/reset flows
* Minimal production-readiness checklist

## Long-Term Goal

The long-term goal is to turn this into a reusable authentication starter that can be copied into other small web apps.

Possible future directions:

* reusable starter template
* separate auth utility package
* `@neel-auth/core`
* `@neel-auth/nextjs`
* hosted auth service for personal projects

## Disclaimer

This project is currently experimental. Do not use it for sensitive production applications without a full security review.
