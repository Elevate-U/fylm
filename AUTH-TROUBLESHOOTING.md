# Supabase Authentication 401 Error - Troubleshooting Guide

## The Problem
You're getting a `401 Unauthorized` error when trying to log in on your Vercel deployment:
```
XHR POST https://symlpvgdqnmccllwwejt.supabase.co/auth/v1/token?grant_type=password
[HTTP/2 401 31ms]
```

## Root Causes & Solutions

### 1. **Missing Environment Variables in Vercel** (Most Common)

**Check your Vercel environment variables:**

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Ensure you have:
   - `VITE_SUPABASE_URL` = `https://symlpvgdqnmccllwwejt.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your_anon_key`

**Set via Vercel CLI:**
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

**Important:** After adding environment variables, you MUST redeploy:
```bash
vercel --prod
```

### 2. **CORS Configuration Issues**

**Check your Supabase project CORS settings:**

1. Go to your Supabase dashboard
2. Navigate to **Settings** → **API** → **CORS**
3. Make sure your Vercel domain is listed (e.g., `https://your-app.vercel.app`)
4. Or add `*` temporarily for testing (remove after fixing)

### 3. **Supabase Project Configuration**

**Check authentication settings:**

1. Go to **Authentication** → **Settings**
2. Ensure **Enable email confirmations** is appropriate for your needs
3. Check **Site URL** is set to your Vercel domain
4. Verify **Redirect URLs** include your Vercel domain

### 4. **Debug Steps**

**Step 1: Run the debug script**
1. Open your deployed site in browser
2. Open browser console (F12)
3. Copy and paste the contents of `debug-auth.js`
4. Check the console output

**Step 2: Check environment variables are loaded**
```javascript
// Run in browser console on deployed site
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing');
```

**Step 3: Test authentication endpoint directly**
```javascript
// Test auth endpoint
fetch('https://symlpvgdqnmccllwwejt.supabase.co/auth/v1/settings', {
    headers: {
        'apikey': 'your_anon_key_here',
        'Authorization': 'Bearer your_anon_key_here'
    }
})
.then(r => console.log('Status:', r.status))
.catch(e => console.error('Error:', e));
```

### 5. **Quick Fixes to Try**

**Fix 1: Force environment variable refresh**
```bash
# Clear Vercel cache and redeploy
vercel --prod --force
```

**Fix 2: Check if project is paused**
- Go to Supabase dashboard
- Check if your project is paused/suspended
- Unpause if needed

**Fix 3: Verify credentials**
- Copy fresh credentials from Supabase dashboard
- Update environment variables in Vercel
- Redeploy

### 6. **Advanced Debugging**

**Check network requests:**
1. Open browser DevTools
2. Go to Network tab
3. Try to login
4. Look for the failing request
5. Check headers and response

**Common 401 error messages:**
- `Invalid API key` - Wrong anon key
- `Invalid JWT` - Authentication token issues
- `User not found` - Account doesn't exist
- `Invalid login credentials` - Wrong email/password

## Quick Test Checklist

- [ ] Environment variables are set in Vercel
- [ ] Environment variables are properly named (`VITE_` prefix)
- [ ] Project has been redeployed after setting env vars
- [ ] CORS is configured for your domain
- [ ] Supabase project is not paused
- [ ] Site URL is set in Supabase auth settings
- [ ] Auth endpoint is accessible

## Still Having Issues?

If you're still getting 401 errors:

1. Check Supabase project logs in the dashboard
2. Verify your email/password is correct
3. Try creating a new test user
4. Check if your Supabase subscription is active
5. Contact Supabase support if the project appears broken

## Next Steps

After fixing the authentication:
1. Test login locally to ensure it works
2. Deploy and test on Vercel
3. Remove the debug script (`debug-auth.js`)
4. Remove this troubleshooting file if no longer needed 