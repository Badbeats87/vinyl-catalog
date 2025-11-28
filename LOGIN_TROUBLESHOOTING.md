# Login Troubleshooting Guide

## 🚨 Login Failed - Quick Fix

### CRITICAL: Check Both Servers Are Running

**Most common issue: Only one server is running!**

```bash
# Terminal 1 - Backend MUST be running
npm run dev

# Terminal 2 - Frontend MUST be running
cd frontend && npm run dev
```

If you only started one, the other won't work!

---

## Step-by-Step Diagnosis

### Step 1: Verify Backend Is Running
```bash
curl http://localhost:3000/health
```

Should return:
```json
{"status":"ok","timestamp":"2025-11-28T18:39:12.892Z"}
```

**If this fails:** Backend is not running. Run `npm run dev` in Terminal 1.

---

### Step 2: Verify Backend Auth Endpoint Works
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","role":"admin"}'
```

Should return:
```json
{
  "success": true,
  "token": "eyJ...",
  "user": {"id":"admin","email":"admin@demo.com","role":"admin"}
}
```

**If this fails:** Backend auth is broken. Check `/Users/invision/site-oul/src/api/auth-routes.ts`

---

### Step 3: Verify Frontend Is Running
Go to `http://localhost:3001` in browser

You should see the landing page with "Buy & Sell Vinyl Records"

**If blank/error:** Frontend is not running. Run `cd frontend && npm run dev` in Terminal 2.

---

### Step 4: Check Browser Console for Errors
1. Open `http://localhost:3001/login`
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Try to login as `admin@demo.com` with any password
5. Look for errors in console

**Common errors and fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Failed to fetch` | Frontend can't reach backend | Make sure backend is running on port 3000 |
| `CORS error` | Backend CORS not configured | Check backend has CORS middleware |
| `Cannot read property 'success'` | Response format wrong | Backend not returning JSON properly |
| `Network request failed` | API URL wrong | Check `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:3000` |

---

## Common Issues & Solutions

### Issue: "Cannot POST /api/auth/login" or "Route not found"

**Problem:** Backend endpoint doesn't exist

**Solution:**
```bash
# Check if auth route is registered in backend
grep -n "app.post.*auth/login" /Users/invision/site-oul/src/index.ts
```

Should show something like:
```
app.post('/api/auth/login', async (req, res) => {
```

If not found, the route needs to be added to `src/index.ts`

---

### Issue: "Network Error" or "Failed to fetch"

**Problem:** Frontend can't reach backend

**Check 1:** Is backend actually running?
```bash
ps aux | grep "npm run dev" | grep -v grep
```

Should show the Node process.

**Check 2:** Is backend on the right port?
```bash
lsof -i :3000
```

Should show something listening on port 3000.

**Check 3:** If backend is on different port, update frontend:
```bash
# Edit frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000  # If backend on 4000
```

Then rebuild frontend:
```bash
npm run build
```

---

### Issue: Login works but redirects to wrong page

**Problem:** Role detection is wrong

**Solution:** Check the email you're using:
- Contains "admin" → Goes to `/admin/dashboard`
- Contains "seller" → Goes to `/seller/dashboard`
- Otherwise → Goes to `/buyer/storefront`

Try:
- `admin@demo.com` for admin
- `seller@demo.com` for seller
- `buyer@demo.com` for buyer

---

### Issue: "localStorage is not defined"

**Problem:** Browser doesn't support localStorage (shouldn't happen)

**Solution:** Use different browser or check DevTools isn't blocking storage.

---

## Complete Reset

If everything is broken, do a complete reset:

```bash
# Kill all npm processes
pkill -f "npm run dev"

# Clean backend
rm -rf dist node_modules
npm install
npm run build

# Clean frontend
cd frontend
rm -rf .next node_modules
npm install
npm run build

# Start backend
cd /Users/invision/site-oul
npm run dev &

# Start frontend (in another terminal)
cd /Users/invision/site-oul/frontend
npm run dev
```

---

## Test Login API Directly

Copy this into your browser console while on any page:

```javascript
// Test backend login
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@demo.com', role: 'admin' })
})
.then(r => r.json())
.then(data => console.log('Success:', data))
.catch(e => console.error('Error:', e))
```

Should see `Success: {success: true, token: "...", user: {...}}`

---

## Port Conflicts

If ports are already in use:

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process (if it's old npm)
kill -9 <PID>

# Or run on different port
PORT=4000 npm run dev          # Backend on 4000
cd frontend && PORT=3002 npm run dev  # Frontend on 3002

# Then update frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Debug Mode

For maximum debugging:

**Backend:**
```bash
DEBUG=* npm run dev
```

**Frontend (in browser console):**
```javascript
localStorage.setItem('DEBUG', 'axios')  // Enable axios logging
```

---

## Still Broken?

1. **Check logs:**
   ```bash
   tail -100 /tmp/backend.log  # Backend logs
   ```

2. **Check network traffic:**
   - Open DevTools → Network tab
   - Try to login
   - Look for failed requests
   - Click on the failed request to see response

3. **Verify API client config:**
   - Check `frontend/lib/api.ts` has correct endpoint
   - Check `frontend/.env.local` has correct URL

4. **Test with curl:**
   ```bash
   curl -v http://localhost:3000/api/auth/login -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","role":"admin"}'
   ```

---

## Nuclear Option: Rebuild Everything

```bash
# Go to root
cd /Users/invision/site-oul

# Kill everything
pkill -f npm
pkill -f node
pkill -f tsx

# Wait
sleep 2

# Clean everything
rm -rf dist node_modules frontend/.next frontend/node_modules
rm -rf dist/**/*.js dist/**/*.d.ts

# Reinstall
npm install
cd frontend && npm install && cd ..

# Build
npm run build
npm run build --prefix frontend

# Test backend
npm run dev
# Should see: "Platform API Server Started"

# In another terminal
cd frontend && npm run dev
# Should see: "Local: http://localhost:3001"

# Test login
# Go to http://localhost:3001/login
# Email: admin@demo.com
# Password: anything
```

---

## Still Need Help?

The absolute minimum that must be true:

1. ✅ Backend running on http://localhost:3000
2. ✅ Backend responds to `curl http://localhost:3000/health`
3. ✅ Frontend running on http://localhost:3001
4. ✅ Frontend can see landing page
5. ✅ `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:3000`
6. ✅ Both use correct Node/npm versions

Check all 6 of these and login should work.
