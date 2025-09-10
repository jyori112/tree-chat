# Clerk Configuration Guide

This document provides step-by-step instructions for configuring your Clerk application with OAuth providers and authentication methods, as part of Task 1 of the clerk-authentication specification.

## Clerk Account and Application Setup

✅ **Already Completed**: A Clerk account and application have been created, as evidenced by the API keys in `.env`:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (public key for client-side)
- `CLERK_SECRET_KEY` (secret key for server-side)

## Required Configuration Steps

### 1. Configure OAuth Providers (Google, GitHub)

#### Google OAuth Setup:
1. Log in to your Clerk Dashboard at [clerk.com](https://clerk.com)
2. Navigate to **User & Authentication** → **Social connections**
3. Click **Add connection** and select **Google**
4. Configure the following:
   - Enable **Google** authentication
   - Set up Google OAuth credentials (requires Google Cloud Console setup)
   - Add authorized redirect URIs:
     - Development: `https://settled-seagull-26.clerk.accounts.dev/v1/oauth_callback`
     - Production: `https://your-domain.com/.../oauth_callback`

#### GitHub OAuth Setup:
1. In the same **Social connections** section
2. Click **Add connection** and select **GitHub** 
3. Configure the following:
   - Enable **GitHub** authentication
   - Set up GitHub OAuth credentials (requires GitHub Developer Settings)
   - Add authorized callback URLs:
     - Development: `https://settled-seagull-26.clerk.accounts.dev/v1/oauth_callback`
     - Production: `https://your-domain.com/.../oauth_callback`

### 2. Configure Email/Password Authentication

1. Navigate to **User & Authentication** → **Email, phone, username**
2. Configure **Email address**:
   - ✅ Enable email address authentication
   - ✅ Enable email verification (recommended for security)
   - Set email verification to **Required** for new sign-ups

3. Configure **Password**:
   - ✅ Enable password authentication
   - Configure password requirements:
     - Minimum 8 characters
     - Require at least one uppercase letter
     - Require at least one number
     - Require at least one special character

### 3. Configure Application URLs

1. Navigate to **Domains** section in Clerk Dashboard
2. Configure development URLs:
   - **Frontend API**: Already configured (shows in your publishable key)
   - **Home URL**: `http://localhost:3000`
   - **Sign-in URL**: `http://localhost:3000/sign-in`
   - **Sign-up URL**: `http://localhost:3000/sign-up`
   - **After sign-in redirect**: `http://localhost:3000/dashboard`
   - **After sign-up redirect**: `http://localhost:3000/select-workspace`

3. For production deployment, update these URLs to your production domain

### 4. Configure Organizations (Workspaces)

1. Navigate to **Organizations** section
2. Enable **Organizations** feature:
   - ✅ Allow users to create organizations
   - ✅ Allow users to be members of multiple organizations
   - Set organization creation permissions to **All users**
   - Configure organization roles: **admin** and **member**

### 5. Configure JWT Templates (for API Integration)

1. Navigate to **JWT Templates** 
2. Create a new template named **tree-chat-workspace**:
   ```json
   {
     "user_id": "{{user.id}}",
     "org_id": "{{org.id}}",
     "org_slug": "{{org.slug}}",
     "org_role": "{{membership.role}}",
     "permissions": "{{membership.permissions}}"
   }
   ```

### 6. Configure Webhooks (Optional, for advanced features)

1. Navigate to **Webhooks**
2. Add webhook endpoint for your API:
   - Development: `http://localhost:3000/api/webhooks/clerk`
   - Production: `https://your-domain.com/api/webhooks/clerk`
3. Select events to listen to:
   - `user.created`
   - `user.updated` 
   - `user.deleted`
   - `organization.created`
   - `organization.updated`
   - `organizationMembership.created`
   - `organizationMembership.deleted`

## Testing Your Configuration

### 1. Start the Development Server
```bash
pnpm --filter=@tree-chat/web dev
```

### 2. Test Authentication Flow
1. Navigate to `http://localhost:3000`
2. Click "Sign Up" to test new user registration
3. Test email/password sign-up
4. Test Google/GitHub OAuth (if configured)
5. Verify redirect to workspace selection
6. Test workspace creation and selection
7. Verify access to dashboard

### 3. Verify Organization Features
1. Create a new workspace
2. Verify workspace switching works
3. Test user invitation flow (if implemented)

## Environment Variables Verification

Ensure these environment variables are properly set in your `.env` file:

```bash
# Clerk API Keys (✅ Already configured)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c2V0dGxlZC1zZWFndWxsLTI2LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_EWVn3lo57MdcJ2y8S6ZQGOecaGP82YIg3qTzXKUqzR

# Additional variables for production
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Next Steps

After completing this configuration:

1. ✅ **Task 1 Complete**: Clerk account and application configuration
2. **Task 2**: Implement authentication providers and context
3. **Task 3**: Set up protected routes and middleware
4. **Task 4**: Implement user profile management  
5. **Task 5**: Set up workspace member management

## Troubleshooting

### Common Issues:

1. **"Invalid publishable key"** error:
   - Verify the publishable key in `.env` matches your Clerk dashboard
   - Ensure you're using the correct environment (development/production)

2. **OAuth redirect errors**:
   - Check that redirect URLs in OAuth provider settings match Clerk's requirements
   - Ensure HTTPS is used for production redirect URLs

3. **Organization creation fails**:
   - Verify Organizations feature is enabled in Clerk dashboard
   - Check that user has permission to create organizations

4. **JWT claims missing**:
   - Ensure JWT template is properly configured with correct claims
   - Verify template is associated with your application

This completes the configuration requirements for Task 1 of the clerk-authentication specification.