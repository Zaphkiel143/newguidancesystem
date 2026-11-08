# Sign in with Microsoft Entra ID — setup

The sign-in page follows the STI eLMS pattern:

1. **Log in** → *Sign in with Microsoft Entra ID* (students, faculty, staff) or *Parent or guardian log in*.
2. **Sign in** → type the school email (`@stamaria.sti.edu.ph`).
3. **Verify your identity** → pick one of the ways this account can use:
   - **Approve a request**: number matching on a device already signed in to E-Gabay (push notification).
   - **Use a verification code**: Microsoft Authenticator (the "E-Gabay STI" entry set up from Profile / My Account).
   - **Email code**: a 6-digit code to the school inbox.
   - **Use your password**: the account's E-Gabay password ("Forgot password?" resets it with an email code).
   - **Continue with Microsoft**: real Microsoft 365 sign-in. Shows up only after the setup below.

Everything except "Continue with Microsoft" works with no extra setup.

## Passwords

- New school accounts choose a password on the "Welcome to E-Gabay" form; parents already did.
- Older accounts made before this (stored as `code-login-only`) are asked to choose one right after their next email-code (or Microsoft) sign-in. Until then the password option doesn't show for them.
- No database change is needed: `User.passwordHash` already exists.

## Turning on "Continue with Microsoft"

STI IT (a tenant admin) has to do this, because E-Gabay has to be registered in STI's Microsoft tenant.

1. Azure portal → **Microsoft Entra ID → App registrations → New registration**
   - Name: `E-Gabay`
   - Supported account types: **Accounts in this organizational directory only** (single tenant)
   - Redirect URI: platform **Web**, `https://<your-site>/api/auth/entra/callback`
     (also add `http://localhost:3000/api/auth/entra/callback` for local testing)
2. On the app's **Overview**, copy the **Application (client) ID** and **Directory (tenant) ID** (the GUID, not a domain name).
3. **Certificates & secrets → New client secret** → copy the secret **Value** (it's shown only once).
4. **API permissions**: the default Microsoft Graph `User.Read` is enough. The app asks only for `openid profile email`. If the tenant blocks user consent, an admin clicks **Grant admin consent**.
5. Add these to `.env` locally and to the host's environment settings (Vercel / Render):

   ```
   ENTRA_TENANT_ID=<Directory (tenant) ID>
   ENTRA_CLIENT_ID=<Application (client) ID>
   ENTRA_CLIENT_SECRET=<client secret value>
   # Optional. Defaults to <site>/api/auth/entra/callback
   ENTRA_REDIRECT_URI=
   ```

6. Restart the server. "Continue with Microsoft" now appears on the Verify step.

Client secrets expire (6–24 months). Set a reminder to make a new one before it does.

## How it works (for maintainers)

- `lib/entra.ts`: builds the authorize URL (state, nonce, PKCE) and exchanges the code for an ID token.
- `app/api/auth/entra/start/route.ts`: saves the attempt in a 10-minute cookie, sends the browser to Microsoft with `login_hint` set to the typed email.
- `app/api/auth/entra/callback/route.ts`: checks state, nonce, audience, tenant and the school email domain.
  - An existing, active account with a password signs straight in.
  - A new account, or one without a password, goes back to `/Login` with a one-time code (the same kind an email brings), so it finishes there with details and/or a password.
