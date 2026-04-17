# Implementation Summary: Persistent Conversation History

This document summarizes the implementation of persistent conversation history with GitHub OAuth and Azure Database integration for the MUTHUR Terminal project.

## Overview

The feature allows users to:
- Sign in with their GitHub account
- Have their terminal conversations automatically saved to an Azure PostgreSQL database
- View a list of past sessions
- Resume previous conversations with full history
- Delete old sessions
- Use the terminal anonymously without authentication (ephemeral mode)

## Architecture

### Authentication Layer (NextAuth.js v5)

**Files Created:**
- `src/lib/auth.ts` - NextAuth.js configuration with GitHub provider
- `src/app/api/auth/[...nextauth]/route.ts` - Auth API route handlers
- `src/middleware.ts` - Middleware to protect conversation routes
- `src/types/next-auth.d.ts` - TypeScript type definitions for session

**Key Features:**
- GitHub OAuth integration with profile mapping
- Drizzle adapter for database-backed sessions
- Graceful fallback to anonymous mode when DATABASE_URL is not configured
- Custom session callbacks to include GitHub username and ID

### Database Layer (Drizzle ORM + PostgreSQL)

**Files Created:**
- `drizzle.config.ts` - Drizzle kit configuration
- `src/db/schema.ts` - Database schema definitions
- `src/db/index.ts` - Database connection singleton
- `src/db/queries.ts` - CRUD operations for conversations and messages

**Schema Tables:**
1. **NextAuth Tables** (managed by Drizzle adapter):
   - `user` - User accounts with GitHub info
   - `account` - OAuth provider accounts
   - `session` - Session tokens
   - `verificationToken` - Email verification (future use)

2. **Application Tables**:
   - `conversation` - Terminal sessions (userId, title, isActive, timestamps)
   - `message` - Chat messages (conversationId, role, content, orderIndex, timestamp)

**Relationships:**
- User → Conversations (one-to-many, cascade delete)
- Conversation → Messages (one-to-many, cascade delete)

### API Routes

**Files Created:**
- `src/app/api/conversations/route.ts` - List and create conversations
- `src/app/api/conversations/[id]/route.ts` - Get, update, delete specific conversation
- `src/app/api/muthur/route.ts` (modified) - Persist messages during chat

**Endpoints:**
- `GET /api/conversations` - List user's conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/[id]` - Get conversation with all messages
- `PATCH /api/conversations/[id]` - Update title or set active
- `DELETE /api/conversations/[id]` - Delete conversation (with messages)
- `POST /api/muthur` - Send message and persist to DB (if authenticated)

### UI Components

**Files Created:**
- `src/components/AuthButton.tsx` - Login/logout button with user info
- `src/components/AuthProvider.tsx` - SessionProvider wrapper
- `src/components/ConversationPicker.tsx` - Session selector dropdown
- `src/components/Terminal.tsx` (modified) - Integrated conversation loading/saving
- `src/app/layout.tsx` (modified) - Added AuthProvider to root

**Features:**
- Auth status indicator (CREW LOGIN / CREW: username / LOGOUT)
- Session dropdown with:
  - NEW SESSION button
  - List of past sessions with timestamps
  - Delete button per session
  - Current session highlighting
- Automatic message persistence during chat
- Conversation restore on selection

### Configuration & Deployment

**Files Modified:**
- `.env.example` - Added DATABASE_URL, NEXTAUTH_SECRET, GitHub OAuth vars
- `.github/workflows/deploy.yml` - Added secrets for database and auth
- `package.json` - Added Drizzle scripts (db:generate, db:migrate, db:push, db:studio)

**New Dependencies:**
- `next-auth@5.0.0-beta.25` - Authentication
- `@auth/core@0.37.4` - NextAuth core
- `@auth/drizzle-adapter` - Drizzle adapter for NextAuth
- `drizzle-orm` - TypeScript ORM
- `drizzle-kit` - Migration toolkit
- `postgres` - PostgreSQL driver

## Key Design Decisions

### 1. Graceful Degradation (Anonymous Mode)

The application checks for `DATABASE_URL` at runtime. If not configured:
- Authentication is disabled
- Conversations are not persisted
- Terminal works in ephemeral mode (client-side state only)

This allows:
- Easy local development without database setup
- Quick demos and testing
- Smooth migration path for existing deployments

**Implementation:**
```typescript
// src/db/index.ts
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

// Used in auth.ts, API routes, and UI components
```

### 2. Active Conversation Pattern

Only one conversation per user is marked as "active" at a time. This represents the current terminal session.

**Benefits:**
- Auto-resume last session on page load
- Clear UX: user knows which conversation is current
- Simplifies message persistence logic

**Implementation:**
- `isActive` boolean field in `conversation` table
- Setting a conversation active automatically deactivates others (database query)
- New conversations are created as active

### 3. Message Ordering with `orderIndex`

Messages use an integer `orderIndex` field instead of relying solely on timestamps.

**Rationale:**
- Ensures deterministic message order
- Handles rapid-fire messages (same timestamp)
- Allows future message re-ordering/editing features
- Simple sequential numbering (0, 1, 2, ...)

### 4. NextAuth.js v5 (Beta)

Used the latest NextAuth.js v5 (App Router compatible) instead of v4.

**Trade-offs:**
- ✅ Better App Router integration
- ✅ Modern API design
- ✅ TypeScript-first
- ⚠️ Beta software (API may change before stable release)

**Mitigation:** Pinned exact version `5.0.0-beta.25` in package.json

### 5. Streaming + Persistence

The `/api/muthur` route streams responses while also accumulating the full message for database persistence.

**Implementation:**
```typescript
let fullAssistantResponse = "";

copilotSession.on("assistant.message_delta", (event) => {
  const deltaContent = event.data.deltaContent;
  fullAssistantResponse += deltaContent;  // Accumulate
  controller.enqueue(encoder.encode(`data: ${data}\n\n`));  // Stream
});

// After streaming completes:
await createMessage(conversationId, "assistant", fullAssistantResponse);
```

This ensures:
- Real-time typing effect for users
- Complete messages saved to database
- No duplicate API calls

### 6. Conversation vs Session Naming

Used "conversation" in the database schema and "session" in the UI.

**Rationale:**
- "Conversation" is technically accurate (collection of messages)
- "Session" is more familiar to users (terminal session)
- NextAuth already uses `session` table, so `conversation` avoids naming collision

## Security Considerations

### 1. Authentication Middleware

Routes under `/api/conversations` are protected by NextAuth middleware:
```typescript
// src/middleware.ts
export { auth as middleware } from "@/lib/auth";
export const config = {
  matcher: ["/api/conversations/:path*"],
};
```

### 2. User Ownership Verification

All conversation operations verify the user owns the resource:
```typescript
const conversation = await getConversation(conversationId, userId);
if (!conversation) {
  throw new Error("Conversation not found");
}
```

This prevents users from accessing/deleting others' conversations.

### 3. Cascade Deletes

Database schema uses `onDelete: "cascade"`:
- Deleting a user → deletes all their conversations and messages
- Deleting a conversation → deletes all its messages

### 4. Secrets Management

All sensitive credentials stored as Azure Container App secrets:
- `database-url` - PostgreSQL connection string
- `nextauth-secret` - Session encryption key
- `github-client-id` - OAuth app ID
- `github-client-secret` - OAuth app secret
- `github-token` - Copilot SDK token

Never committed to source code.

## Testing Strategy

### Unit Testing (Future)

Recommended additions:
- Database query tests (using test database)
- API route integration tests
- Component unit tests (Auth button, conversation picker)

### Manual Testing Checklist

**Anonymous Mode:**
- [x] Terminal works without DATABASE_URL
- [x] Auth button hidden
- [x] Conversations not persisted

**Authenticated Mode:**
- [ ] GitHub login flow completes
- [ ] User session persists across page reloads
- [ ] Messages saved to database during chat
- [ ] Conversation list shows all user's sessions
- [ ] Selecting past conversation loads messages
- [ ] Creating new conversation clears terminal
- [ ] Deleting conversation removes from list
- [ ] Logout returns to anonymous mode

### Integration Testing

**Azure Deployment:**
- [ ] Database migrations run successfully
- [ ] Container App connects to PostgreSQL
- [ ] GitHub OAuth callback works with production URL
- [ ] Secrets loaded from Container App environment

## Performance Considerations

### Database Connection Pooling

The `postgres` driver includes built-in connection pooling. For high-traffic scenarios, consider:
- Azure PostgreSQL PgBouncer (connection pooler)
- Configuring pool size in connection string
- Monitoring connection usage

### Query Optimization

Current queries are simple and performant:
- User lookup: indexed by `id` (primary key)
- Conversation list: indexed by `userId` + sorted by `updatedAt`
- Message list: indexed by `conversationId` + sorted by `orderIndex`

**Future optimizations:**
- Add database indexes on frequently queried fields
- Paginate conversation lists (currently limited to 50)
- Implement message pagination for very long conversations

### Caching Strategy

Currently no caching. Potential additions:
- Cache active conversation ID in session
- Cache message count per conversation
- Use React Query for client-side data caching

## Deployment Checklist

### Azure Resources Required

1. ✅ Resource Group (`muthur-rg`)
2. ✅ Container Registry (`muthurterminal.azurecr.io`)
3. ✅ Container App Environment
4. ✅ Container App (`muthur-terminal`)
5. ⚠️ **PostgreSQL Flexible Server** (new - see DATABASE_SETUP.md)

### GitHub Configuration

1. ✅ GitHub Environments (staging, production)
2. ✅ Environment variables (AZURE_CLIENT_ID, etc.)
3. ⚠️ **Add NEXTAUTH_URL variable per environment**
4. ⚠️ **Create GitHub OAuth App** (see DATABASE_SETUP.md)

### Container App Secrets

```bash
az containerapp secret set \
  --name muthur-terminal \
  --resource-group muthur-rg \
  --secrets \
    github-token=<PAT> \
    database-url=<POSTGRES_URL> \
    nextauth-secret=<RANDOM_SECRET> \
    github-client-id=<OAUTH_CLIENT_ID> \
    github-client-secret=<OAUTH_CLIENT_SECRET>
```

### Database Setup

1. Create Azure PostgreSQL Flexible Server
2. Create `muthur` database
3. Run migrations: `pnpm db:migrate` (or use `db:push` for initial setup)
4. Configure firewall to allow Azure services

See `DATABASE_SETUP.md` for detailed instructions.

## Monitoring & Observability

### Recommended Additions

1. **Application Insights** - Track errors, performance, user flows
2. **Database Metrics** - Monitor query performance, connection pool usage
3. **Auth Metrics** - Track login success/failure rates
4. **Conversation Analytics** - Message count, session duration, user engagement

### Logging

Current logging:
- Console errors for failed DB operations
- NextAuth debug logs (set `NEXTAUTH_DEBUG=true`)

**Recommended:**
- Structured logging library (Pino, Winston)
- Correlation IDs for request tracing
- Database query logging (development only)

## Future Enhancements

### High Priority

1. **Session Titles** - Auto-generate from first message (e.g., "Conversation about crew manifest")
2. **Message Search** - Full-text search across all conversations
3. **Export Conversations** - Download as JSON, Markdown, or PDF

### Medium Priority

4. **Conversation Sharing** - Share read-only link to conversation
5. **Message Editing** - Edit past messages and regenerate responses
6. **Conversation Folders/Tags** - Organize sessions by project/topic
7. **Rate Limiting** - Prevent abuse (per user message limits)

### Low Priority

8. **Conversation Branching** - Fork conversation from any message
9. **Multi-user Sessions** - Shared conversations (team mode)
10. **Voice Input** - Speak queries instead of typing

## Rollback Plan

If issues arise in production:

### Quick Rollback (UI Only)

1. Revert commit and redeploy previous version
2. Anonymous mode will work immediately
3. Users' data remains safely in database

### Database Rollback

If schema issues occur:

```bash
# Backup database first
pg_dump -h <HOST> -U <USER> -d muthur > backup.sql

# Drop tables (DESTRUCTIVE - USE WITH CAUTION)
DROP TABLE message CASCADE;
DROP TABLE conversation CASCADE;
DROP TABLE "verificationToken" CASCADE;
DROP TABLE "session" CASCADE;
DROP TABLE account CASCADE;
DROP TABLE "user" CASCADE;

# Restore from backup
psql -h <HOST> -U <USER> -d muthur < backup.sql
```

### Safe Migration Rollback

Drizzle doesn't support automatic rollback. Manual steps:
1. Identify migration to revert (in `drizzle/` folder)
2. Write reverse SQL manually
3. Execute reverse SQL on database
4. Delete migration file
5. Regenerate migrations from current schema

## Success Metrics

### Technical Metrics

- ✅ Build passes with no errors
- ✅ Linting passes (1 warning - acceptable)
- ✅ TypeScript compilation successful
- ⚠️ Database migrations tested (requires Azure setup)
- ⚠️ End-to-end auth flow tested (requires GitHub OAuth app)

### Acceptance Criteria (from issue)

- [x] User can sign in with their GitHub account via OAuth
- [x] User can sign out
- [x] Drizzle ORM schema defined (users, sessions, conversations, messages)
- [x] Drizzle migration scripts configured (`db:generate`, `db:migrate`)
- [x] Authenticated user's messages persisted to database in real time
- [x] User can view list of past sessions
- [x] User can select and resume past session with full history
- [x] User can start new session (clears terminal, creates new DB entry)
- [x] User can delete saved session
- [x] Unauthenticated users work in ephemeral mode (no regression)
- [x] DATABASE_URL environment variable configured
- [x] deploy.yml updated with secrets
- [x] .env.example updated
- [x] Auth/session UI matches CRT green phosphor aesthetic

### Deployment Verification

After deploying to staging:
- [ ] Verify GitHub OAuth login works
- [ ] Send messages and verify they appear in database
- [ ] Create multiple conversations and verify persistence
- [ ] Test conversation switching
- [ ] Test conversation deletion
- [ ] Verify anonymous mode works (remove DATABASE_URL)
- [ ] Test cross-browser compatibility
- [ ] Verify mobile responsiveness

## Conclusion

This implementation provides a solid foundation for persistent conversation history while maintaining the existing terminal experience. The architecture supports both authenticated (persistent) and anonymous (ephemeral) modes, allowing gradual adoption and easy development workflows.

**Next Steps:**
1. Follow `DATABASE_SETUP.md` to provision Azure PostgreSQL
2. Configure GitHub OAuth app
3. Set Container App secrets
4. Deploy to staging environment
5. Run manual testing checklist
6. Monitor for issues
7. Deploy to production

**Key Achievement:** Zero breaking changes to existing functionality. The terminal works exactly as before for users who don't sign in, while offering powerful new capabilities for authenticated users.
