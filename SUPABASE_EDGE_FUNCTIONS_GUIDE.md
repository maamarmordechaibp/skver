# Supabase Edge Functions Deployment Guide

## Overview

Your voice IVR system has been converted to **Supabase Edge Functions**. This means:
- ✅ Phone system runs independently from your Next.js frontend
- ✅ Always online - not dependent on frontend uptime
- ✅ Automatic scaling and redundancy
- ✅ Built-in logging and monitoring
- ✅ External API integration for contact lookup

## Architecture

```
Phone Call → SignalWire
    ↓
/functions/v1/voice-incoming (Edge Function)
    ↓
Check Local DB (Supabase) OR External API
    ↓
Route through IVR flow
    ↓
Capture availability/registration
    ↓
Save to Supabase
    ↓
Return response to caller
```

## Edge Functions Created

| Function | Purpose |
|----------|---------|
| `voice-incoming` | Handle incoming calls, identify caller (local DB + external API) |
| `voice-main-menu` | Main menu selection (1-8, 0) |
| `voice-registration` | Start new host registration |
| `voice-reg-beds` | Get number of beds |
| `voice-reg-location` | Get accommodation type |
| `voice-reg-frequency` | Get call frequency |
| `voice-option-1-registered` | Availability for registered hosts |
| `voice-option-1-new` | Availability for unregistered callers |
| `voice-confirm-or-change` | Confirm or modify bed count |
| `voice-save-new-beds` | Save beds for unregistered caller |
| `voice-update-beds` | Update beds for registered caller |
| `voice-admin-pin` | Admin PIN prompt |
| `voice-admin-verify-pin` | Verify admin code |
| `voice-admin-save-beds` | Get beds needed for campaign |
| `voice-admin-message-recorded` | Playback recorded message |
| `voice-admin-message-action` | Handle playback/re-record/confirm |
| `voice-admin-launch-campaign` | Create and launch campaign |
| `voice-outbound-call` | Call host about availability |
| `voice-outbound-response` | Handle host response |
| `voice-outbound-update-beds` | Update beds during outbound |
| `voice-voicemail` | Voicemail recording prompt |
| `voice-voicemail-complete` | Save voicemail |

**Total: 22 Edge Functions**

## Setup Instructions

### 1. Create `.env.local` in `supabase/` folder

Copy `supabase/.env.local.example` to `supabase/.env.local` and fill in your values:

```bash
cp supabase/.env.local.example supabase/.env.local
```

Edit `supabase/.env.local`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXTERNAL_API_KEY=ak_be1cabdaa8df0fe1c8e50892f76e8943cae9fb00c7d4b3b6
ADMIN_PIN=1234
SIGNALWIRE_PHONE_NUMBER=+1234567890
```

**Where to get these values:**
- `SUPABASE_URL` - From Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` - From Supabase > Settings > API Keys (Service Role)
- `EXTERNAL_API_KEY` - Provided by your contact database
- `ADMIN_PIN` - Set to your preferred code
- `SIGNALWIRE_PHONE_NUMBER` - Your SignalWire phone number

### 2. Deploy Functions to Supabase

```bash
# Login to Supabase
npx supabase login

# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Create secrets in Supabase
npx supabase secrets set SUPABASE_URL=https://your-project.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
npx supabase secrets set EXTERNAL_API_KEY=ak_be1cabdaa8df0fe1c8e50892f76e8943cae9fb00c7d4b3b6
npx supabase secrets set ADMIN_PIN=1234
npx supabase secrets set SIGNALWIRE_PHONE_NUMBER=+1234567890

# Deploy all functions
npx supabase functions deploy

# Or deploy specific function
npx supabase functions deploy voice-incoming
```

### 3. Create Database Tables

Run the SQL schema in your Supabase database:
```sql
-- See DATABASE_SCHEMA.sql in project root
```

Go to Supabase Dashboard → SQL Editor → Create new query → Paste the contents of `DATABASE_SCHEMA.sql`

### 4. Configure SignalWire Webhook

1. Log in to SignalWire dashboard
2. Go to **Phone Numbers**
3. Select your IVR phone number
4. Click **Configure**
5. Set **Voice URL** to:
   ```
   https://your-project.supabase.co/functions/v1/voice-incoming
   ```
6. Set method to **POST**
7. Save

### 5. Test Your System

**Local Testing:**
```bash
# Test incoming call handler
curl -X POST http://localhost:54321/functions/v1/voice-incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=%2B1234567890&To=%2B1987654321&CallSid=CA123456"
```

**Production Testing:**
1. Call your SignalWire phone number
2. Listen to the menu
3. Press a digit to test different flows
4. Check Supabase logs for errors

## Key Features

### 1. External API Integration
When a caller is not found in local database, the system automatically looks them up in your external contact database:

```javascript
// voice-incoming automatically:
1. Checks local Supabase first
2. If not found, queries external API
3. Creates/updates host record with external contact info
4. Proceeds with call
```

**Configuration:**
- External API Key: Set in `EXTERNAL_API_KEY`
- API Endpoint: `https://wbqcdldbktrchmcareaz.supabase.co/functions/v1/external-api`

### 2. Independent Operation
- No dependency on Next.js frontend
- Runs on Supabase infrastructure
- Phone system works even if frontend is offline
- Automatic scaling

### 3. Data Flow
```
Incoming Call
    ↓
voice-incoming (check DB + external API)
    ↓
voice-main-menu (route based on digit)
    ↓
Specific handler (registration, availability, admin, etc.)
    ↓
Save to Supabase tables
    ↓
Return voice response (LaML/XML)
    ↓
Return response to caller
```

## Monitoring & Debugging

### View Function Logs
```bash
npx supabase functions pull-logs voice-incoming
npx supabase functions pull-logs voice-incoming --limit=100
```

### Check Supabase Logs
In Supabase Dashboard:
1. Go to **Functions**
2. Click on function name
3. View execution logs and errors

### Monitor Database
In Supabase Dashboard:
1. Go to **SQL Editor**
2. Run queries to check:
   ```sql
   SELECT * FROM hosts LIMIT 10;
   SELECT * FROM call_history ORDER BY created_at DESC LIMIT 20;
   SELECT * FROM campaigns WHERE status = 'active';
   SELECT * FROM responses ORDER BY responded_at DESC LIMIT 10;
   ```

## Environment Variables in Edge Functions

Access environment variables via `Deno.env.get()`:

```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const apiKey = Deno.env.get('EXTERNAL_API_KEY');
const adminPin = Deno.env.get('ADMIN_PIN');
```

## Secrets Management

**Store sensitive values as Supabase secrets:**
```bash
npx supabase secrets set SECRET_NAME=secret_value
```

**View all secrets:**
```bash
npx supabase secrets list
```

**Delete a secret:**
```bash
npx supabase secrets unset SECRET_NAME
```

## Troubleshooting

### 1. "401 Unauthorized" when deploying
- Run `npx supabase login`
- Run `npx supabase link --project-ref your-project-ref`

### 2. Functions returning errors
- Check logs: `npx supabase functions pull-logs voice-incoming`
- Ensure secrets are set: `npx supabase secrets list`
- Check Supabase dashboard for errors

### 3. Database connection errors
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Ensure tables exist in database
- Check Supabase project is active

### 4. External API returning empty
- Check `EXTERNAL_API_KEY` is valid
- Verify phone number format matches API expectations
- Check API rate limits in response headers

## Cost Considerations

**Supabase Edge Functions:**
- First 200,000 invocations/month: Free
- Additional: $0.000002 per invocation
- Execution time: First 15 minutes/month free, then $1.25/hour

**For typical usage:**
- 1000 calls/month = well within free tier
- 10,000 calls/month = usually under $5/month

## What's Next?

1. ✅ Deploy functions to Supabase
2. ✅ Create database tables
3. ✅ Configure SignalWire webhook
4. ✅ Test incoming call flow
5. ✅ Monitor logs and errors
6. (Optional) Set up email notifications
7. (Optional) Create frontend dashboard to manage campaigns

## Support

For issues:
1. Check function logs: `npx supabase functions pull-logs <function-name>`
2. Test with curl/Postman
3. Check Supabase documentation: https://supabase.com/docs/guides/functions
4. Review LaML syntax: Check SignalWire LaML documentation

---

**Status:** Ready for deployment ✅
