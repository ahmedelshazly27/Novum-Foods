# Novum Foods — novum-foods.com

The website is a single self-unpacking HTML bundle (`site/index.html`) deployed
to the Vercel project `novum-website-…`. This repo adds a backend for the
contact form.

## How the contact form works

```
Contact form (site/contact-form.js)
   │  POST JSON {role, name, company, email, message}
   ▼
Supabase edge function `contact`   (supabase/functions/contact)
   ├─ validates input, checks origin, honeypot, ≤3 submissions / email / hour
   ├─ inserts into public.contact_submissions
   ├─ sends the "We've received your details" email via Resend
   │   (reply-to hello@novum-foods.com)
   └─ optionally alerts the team (NOTIFY_EMAIL)
```

The "Start a conversation" email box on the Approach page now opens the
contact form with the email already filled in (it used to go to a
`contact.html` page that doesn't exist in the deployment).

## Setup

1. **Create a Supabase project** called `novum-foods`.
2. **Resend**: create an account, add and verify the domain `novum-foods.com`
   (add the DNS records Resend gives you), then create an API key.
3. **Database**: run `supabase/migrations/20260924000000_contact_submissions.sql`
   (SQL editor, or `supabase db push`).
4. **Edge function**:
   ```sh
   supabase link --project-ref <PROJECT_REF>
   supabase secrets set RESEND_API_KEY=re_... NOTIFY_EMAIL=hello@novum-foods.com
   supabase functions deploy contact --no-verify-jwt
   ```
   Optional secrets: `EMAIL_FROM` (default `Novum <hello@novum-foods.com>`),
   `EMAIL_REPLY_TO` (default `hello@novum-foods.com`), `ALLOWED_ORIGINS`
   (default `https://novum-foods.com,https://www.novum-foods.com`).
5. **Website**: put the project ref into the bundle and redeploy:
   ```sh
   python3 scripts/inject-contact-form.py site/index.html --ref <PROJECT_REF>
   ```
   Re-run this every time the site is re-exported from the design tool.

## Viewing leads

Supabase dashboard → Table editor → `contact_submissions`. Use the `status`
column (`new`, `contacted`, `qualified`, `closed`, `spam`) to track follow-up.
`confirmation_sent` / `confirmation_error` show whether the email went out.
