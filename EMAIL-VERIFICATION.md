# Email Verification in Local Development

## 📧 Where to Find Verification Emails

When developing locally with Supabase, verification emails are NOT sent to your actual email. Instead, they're captured by **Inbucket**, a local email testing service.

### Access Your Local Emails:
🔗 **Inbucket URL**: http://127.0.0.1:54324

### How to Verify Your Account:

1. **Sign up** with any email address on the app
2. **Open Inbucket**: Navigate to http://127.0.0.1:54324
3. **Find your email**: Look for the inbox with your email address
4. **Click the verification link**: Open the email and click "Confirm your account"
5. **Return to the app**: You'll be automatically verified

### Available Test Pages:

- **Main App**: http://localhost:3000 (redirects to dashboard)
- **Dashboard**: http://localhost:3000/dashboard (requires login)
- **ShadCN Test**: http://localhost:3000/test (shows ShadCN styling)

### Authentication Flow:

1. Homepage → Redirects to dashboard
2. Dashboard → Shows login form (if not authenticated)
3. Login/Signup → Uses ShadCN styled forms
4. Email verification → Check Inbucket (local email service)
5. Verified → Access dashboard with professional ShadCN UI

---

**Note**: In production, real emails will be sent through your configured email provider.