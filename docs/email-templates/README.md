# Waypoint Email Templates

Themed email templates for Supabase Authentication.

## Templates

| File                    | Supabase Template    | Purpose                               | CTA Color    |
| ----------------------- | -------------------- | ------------------------------------- | ------------ |
| `magic-link.html`       | Magic Link           | Passwordless sign-in emails           | Burgundy     |
| `confirm-signup.html`   | Confirm signup       | New account verification              | Forest Green |
| `change-email.html`     | Change Email Address | Confirm new email address             | Teal         |
| `invite-user.html`      | Invite user          | Invite new users to the platform      | Purple       |
| `reset-password.html`   | Reset Password       | Password recovery emails              | Bronze       |
| `reauthentication.html` | Reauthentication     | Verify identity for sensitive actions | Dark Brown   |

## Setup in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Select the template you want to customize
4. Copy the HTML content from the corresponding file
5. Paste into the "Body" field
6. Save changes

## Template Variables

Supabase provides these variables for use in templates:

| Variable                 | Description                                      |
| ------------------------ | ------------------------------------------------ |
| `{{ .ConfirmationURL }}` | The action link (magic link, confirmation, etc.) |
| `{{ .Email }}`           | User's email address                             |
| `{{ .SiteURL }}`         | Your configured site URL                         |
| `{{ .Token }}`           | Raw token (if needed)                            |
| `{{ .TokenHash }}`       | Hashed token                                     |

## Design Notes

### Color Scheme

- Background: Parchment (#e3d5b8, #f2e8c9, #fdfbf7)
- Border: Dark brown (#5c4033)
- Text: Dark brown (#2b2118, #4a3b32)
- Muted text: (#8c7b70)

### CTA Button Colors (by template)

- **Magic Link**: Burgundy (#701c1c) — "Enter the Realm"
- **Confirm Signup**: Forest Green (#2d4f1e) — "Confirm Your Identity"
- **Change Email**: Teal (#1a5f7a) — "Confirm New Address"
- **Invite User**: Purple (#4a3b8c) — "Accept the Summons"
- **Reset Password**: Bronze (#8c5a2e) — "Reset Passphrase"
- **Reauthentication**: Dark Brown (#5c4033) — "Verify Identity"

### Design Elements

- Fantasy-themed copy with medieval flair
- Fallback plain-text link for email clients that block buttons
- Mobile-responsive table-based layout
- Security notices where appropriate

## Testing

To preview templates locally, open the HTML files directly in a browser. Note that template variables (`{{ .ConfirmationURL }}`) won't render — they're replaced by Supabase at send time.

## Expiration Times

| Template         | Expiration |
| ---------------- | ---------- |
| Magic Link       | 24 hours   |
| Confirm Signup   | 24 hours   |
| Change Email     | 24 hours   |
| Invite User      | 24 hours   |
| Reset Password   | 1 hour     |
| Reauthentication | 10 minutes |
