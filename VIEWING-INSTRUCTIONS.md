# 📱 Viewing Your Egg Market App

## 🚀 Quick Start

### Start Development Server
```bash
npm run dev
```
Wait for: `✓ Ready in X.Xs` message

### Access Your Application
Open your web browser and go to:
- **Main Application**: http://localhost:3000 (redirects to dashboard)
- **Dashboard**: http://localhost:3000/dashboard (login required)
- **Test Page**: http://localhost:3000/test (ShadCN components demo)

### Development Tools & Services
- **Supabase Studio**: http://127.0.0.1:54323 (Database management)
- **Inbucket (Local Emails)**: http://127.0.0.1:54324 (Email verification)

---

## 📧 Email Verification

### In Local Development:
1. **Sign up** with any email address on the app
2. **Open Inbucket**: Navigate to http://127.0.0.1:54324
3. **Find your email**: Look for the inbox with your email address
4. **Click verification link**: Open email and click "Confirm your account"
5. **Return to app**: You'll be automatically verified

### Email Testing Service:
- All verification emails go to **Inbucket** (not your real email)
- Access at: http://127.0.0.1:54324
- Works exactly like real email but locally

---

## 🔍 What You'll See

### Current App State
| URL | What's There | Status |
|-----|-------------|--------|
| `/` | Redirects to dashboard | ✅ Working |
| `/dashboard` | Login form (if not authenticated) | ✅ Working |
| `/dashboard/*` | Protected business dashboard | 🔒 Requires auth |
| `/test` | ShadCN components demo | ✅ Working |

### Authentication Flow
1. Visit http://localhost:3000 → Redirects to /dashboard
2. See login form with Sign In/Sign Up tabs
3. Create account → Check Inbucket for verification
4. Sign in → Access dashboard with sidebar

---

## 🎨 UI Status

### ⚠️ ShadCN Styling Issue
**Current Problem**: CSS custom properties aren't being processed correctly by Tailwind
- **Components exist**: All ShadCN components are installed
- **Classes applied**: HTML shows correct class names
- **Styling missing**: CSS variables not being built into final CSS
- **Visual result**: Components look unstyled/basic

### What's Working
- ✅ **Component Structure**: All ShadCN components render
- ✅ **Authentication**: Email/password + Google OAuth ready
- ✅ **Database**: Supabase with proper schema
- ✅ **Routing**: Protected routes and redirects
- ✅ **Email Verification**: Via Inbucket local email service

### What Needs Fix
- ⚠️ **CSS Variables**: Not being built into final stylesheet
- ⚠️ **Visual Styling**: Components look basic without proper theme
- ⚠️ **Color Theme**: Blue + neutral palette not applying

---

## 🛠 Development Server Status

### Background Processes
- **Next.js Dev Server**: Port 3000 (Main app)
- **Supabase Local**: Port 54321 (API)
- **Supabase Studio**: Port 54323 (Database UI)
- **PostgreSQL**: Port 54322 (Database)
- **Inbucket**: Port 54324 (Email testing)

### Check if Running
Look for this in your terminal:
```
▲ Next.js 15.5.3
- Local: http://localhost:3000
✓ Ready in X.Xs
```

### Start All Services
```bash
# Start Next.js
npm run dev

# Start Supabase (if not running)
supabase start
```

---

## 📊 Database Access

### Supabase Studio
Navigate to: http://127.0.0.1:54323

**Available Tables:**
- `companies` - Business organizations
- `profiles` - User profiles with roles
- `documents` - File management (Carters)

**No login required** for local development!

---

## 🎯 Current Development Status

### ✅ Completed
- [x] ShipFast boilerplate integration
- [x] Supabase authentication (email + Google OAuth)
- [x] ShadCN component installation
- [x] Database schema and RLS policies
- [x] Protected routing system
- [x] Local email verification (Inbucket)
- [x] Role-based access control structure

### ⚠️ In Progress
- [ ] **CSS theme system** (variables not building correctly)
- [ ] Visual styling application
- [ ] Google OAuth configuration (client ID needed)

### 🔜 Next Steps
Once CSS is fixed:
1. Professional UI with blue + neutral theme
2. Complete dashboard functionality
3. Document management (Carters)
4. User management interface
5. Company-specific data views

---

## 🐛 Known Issues

### CSS Custom Properties Not Building
**Error**: `Cannot apply unknown utility class 'bg-background'`
**Cause**: Tailwind not processing CSS variables correctly
**Impact**: Components render but lack proper styling
**Status**: Actively debugging

### Temporary Workaround
Visit `/test` to see component structure even without full styling

---

**Ready to test authentication flow with Inbucket email verification!** 🚀