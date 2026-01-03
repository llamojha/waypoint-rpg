# Waypoint Email Templates

Themed email templates for Supabase Authentication.

## Templates

| File                  | Supabase Template | Purpose                     |
| --------------------- | ----------------- | --------------------------- |
| `magic-link.html`     | Magic Link        | Passwordless sign-in emails |
| `confirm-signup.html` | Confirm signup    | New account verification    |

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

- Uses Waypoint's parchment color scheme (#e3d5b8, #f2e8c9, #fdfbf7)
- Burgundy (#701c1c) for magic link CTA
- Forest green (#2d4f1e) for confirmation CTA
- Fantasy-themed copy with medieval flair
- Fallback plain-text link for email clients that block buttons
- Mobile-responsive table-based layout

## Testing

To preview templates locally, open the HTML files directly in a browser. Note that template variables ({{ .ConfirmationURL }}) won't render — they're replaced by Supabase at send time.
