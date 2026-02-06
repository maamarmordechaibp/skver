# Quick Deployment Checklist

## Pre-Deployment ✅

- [ ] All 22 Edge Functions created in `supabase/functions/`
- [ ] Shared utilities created (`laml-builder.ts`, `database.ts`, `external-api-client.ts`)
- [ ] Database schema ready (`DATABASE_SCHEMA.sql`)
- [ ] `.env.local.example` file created

## Step 1: Setup Environment (5 minutes)

```bash
# Copy environment template
cp supabase/.env.local.example supabase/.env.local

# Edit file with your values
code supabase/.env.local  # or your editor
```

**Required values:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role key from Settings > API Keys
- `EXTERNAL_API_KEY` - ak_be1cabdaa8df0fe1c8e50892f76e8943cae9fb00c7d4b3b6
- `ADMIN_PIN` - Your preferred code (default: 1234)
- `SIGNALWIRE_PHONE_NUMBER` - Your phone number

## Step 2: Login & Link (2 minutes)

```bash
# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref
# (Find project-ref in Supabase dashboard URL or settings)
```

## Step 3: Create Secrets (2 minutes)

```bash
# Set all secrets in Supabase
npx supabase secrets set SUPABASE_URL=https://xxxx.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
npx supabase secrets set EXTERNAL_API_KEY=ak_be1cabdaa8df0fe1c8e50892f76e8943cae9fb00c7d4b3b6
npx supabase secrets set ADMIN_PIN=1234
npx supabase secrets set SIGNALWIRE_PHONE_NUMBER=+1234567890
```

## Step 4: Deploy Functions (3 minutes)

```bash
# Deploy all functions
npx supabase functions deploy

# You should see 22 functions deployed:
# ✓ voice-incoming
# ✓ voice-main-menu
# ✓ voice-registration
# ... (19 more)
```

## Step 5: Create Database Tables (2 minutes)

Go to [Supabase Dashboard](https://supabase.com/dashboard) →

1. Select your project
2. Go to **SQL Editor**
3. Create new query
4. Copy contents of `DATABASE_SCHEMA.sql`
5. Run the query

Tables created:
- `hosts` - Host information
- `campaigns` - Guest needs
- `call_queue` - Call order
- `responses` - Host responses
- `call_history` - All calls
- `admin_settings` - App config

## Step 6: Configure SignalWire (2 minutes)

1. Go to [SignalWire Dashboard](https://signalwire.com/dashboard)
2. Click **Phone Numbers**
3. Select your IVR number
4. Click **Configure**
5. Find **Voice URL** section
6. Set to:
   ```
   https://your-project.supabase.co/functions/v1/voice-incoming
   ```
7. Set method to **POST**
8. Save

## Step 7: Test (5 minutes)

### Test 1: Local test (if running locally)
```bash
curl -X POST http://localhost:54321/functions/v1/voice-incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=%2B1234567890&To=%2B1987654321&CallSid=CA123"
```

You should get back an XML response with the main menu prompt.

### Test 2: Live test
1. Call your SignalWire phone number
2. Hear the welcome message
3. Press 1 (to report availability)
4. Follow the prompts
5. System records your response in Supabase

### Test 3: Check database
Go to Supabase Editor and run:
```sql
SELECT * FROM call_history ORDER BY created_at DESC LIMIT 1;
SELECT * FROM hosts WHERE is_registered = true;
```

## Success Indicators ✅

- [ ] All 22 functions show as deployed in Supabase Dashboard
- [ ] Can call phone number and hear menu
- [ ] Pressing digits routes correctly
- [ ] Data appears in `call_history` table
- [ ] No errors in function logs
- [ ] External API successfully enriches unknown contacts

## Troubleshooting

**Functions won't deploy?**
```bash
npx supabase functions deploy --debug
```

**"Not found" error calling phone number?**
- Check SignalWire webhook URL is correct
- Check function logs: `npx supabase functions pull-logs voice-incoming`

**No data in database?**
- Check `SUPABASE_SERVICE_ROLE_KEY` is correct
- Verify database tables exist
- Check function error logs

**Calls not recognized from external API?**
- Verify `EXTERNAL_API_KEY` is correct
- Check phone number format (must match external API format)
- Check API rate limits (headers in response)

## Total Setup Time: ~20 minutes

**Estimated timeline:**
- Environment setup: 5 min
- Login & link: 2 min
- Set secrets: 2 min
- Deploy functions: 3 min
- Create tables: 2 min
- SignalWire config: 2 min
- Testing: 5 min

## Next Steps

After deployment is working:

1. **Frontend Integration**
   - Connect Next.js dashboard to Supabase
   - Create campaign management UI
   - View analytics in real-time

2. **Email Reports**
   - Set up Resend for campaign completion emails
   - Send daily summaries to admin

3. **Advanced Features**
   - Auto-calling hosts from queue
   - SMS notifications
   - Voicemail transcription
   - Custom IVR messages

## Important Notes

🔐 **Security:**
- Never commit `.env.local` to git
- Keep service role key secret
- Use Supabase secrets for all sensitive values

📞 **Phone System:**
- All calls are logged to database
- Only backend processes voice (frontend cannot interfere)
- System works 24/7 independently

💰 **Cost:**
- First 200k invocations/month: FREE
- Each call = ~5 invocations (incoming, main menu, selection, db save, response)
- 1000 calls/month = ~5k invocations (free tier)

---

**Ready to deploy? Start with Step 1!**
