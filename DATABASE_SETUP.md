# Database Setup & Migrations Guide

This guide explains how to set up the Azure PostgreSQL database and run Drizzle ORM migrations for the MUTHUR Terminal persistent conversation history feature.

## Prerequisites

- Azure CLI installed and authenticated
- Node.js 22+ (for Drizzle CLI and Copilot SDK)
- pnpm package manager
- Access to an Azure subscription

## 1. Create Azure PostgreSQL Flexible Server

### Option A: Using Azure CLI

```bash
# Set environment variables
RESOURCE_GROUP="muthur-rg"
DB_SERVER_NAME="muthur-db"  # Must be globally unique
DB_NAME="muthur"
ADMIN_USER="muthur_admin"
ADMIN_PASSWORD="<STRONG_PASSWORD>"  # Generate a strong password
LOCATION="eastus"

# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --name $DB_SERVER_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user $ADMIN_USER \
  --admin-password $ADMIN_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 14 \
  --public-access all

# Create database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --database-name $DB_NAME
```

### Option B: Using Azure Portal

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Create a new **Azure Database for PostgreSQL flexible server**
3. Configure:
   - Resource group: `muthur-rg`
   - Server name: Choose globally unique name
   - Region: East US (or your preferred region)
   - PostgreSQL version: 14
   - Compute + storage: Burstable, B1ms (1 vCore, 2 GiB RAM)
   - Authentication: PostgreSQL authentication
   - Admin username: `muthur_admin`
   - Admin password: (strong password)
4. Under **Networking**:
   - Enable **Allow public access from any Azure service**
   - Add your client IP for local development
5. Create the server
6. Once created, go to **Databases** and create a database named `muthur`

## 2. Get Database Connection String

```bash
# Get connection string
az postgres flexible-server show-connection-string \
  --server-name $DB_SERVER_NAME \
  --database-name $DB_NAME \
  --admin-user $ADMIN_USER \
  --admin-password $ADMIN_PASSWORD \
  --query connectionStrings.psql_cmd \
  --output tsv
```

Your connection string will look like:
```
postgresql://<ADMIN_USER>:<ADMIN_PASSWORD>@<DB_SERVER_NAME>.postgres.database.azure.com:5432/<DB_NAME>?sslmode=require
```

Example:
```
postgresql://muthur_admin:MyP@ssw0rd123@muthur-db.postgres.database.azure.com:5432/muthur?sslmode=require
```

## 3. Configure Environment Variables

Add the connection string to your `.env` file:

```bash
# .env
DATABASE_URL=postgresql://muthur_admin:MyP@ssw0rd123@muthur-db.postgres.database.azure.com:5432/muthur?sslmode=require

# NextAuth.js configuration
NEXTAUTH_SECRET=<RANDOM_SECRET>  # Generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000  # Or your production URL

# GitHub OAuth (create at https://github.com/settings/developers)
GITHUB_CLIENT_ID=<YOUR_GITHUB_OAUTH_APP_CLIENT_ID>
GITHUB_CLIENT_SECRET=<YOUR_GITHUB_OAUTH_APP_CLIENT_SECRET>
```

## 4. Generate Database Migrations

```bash
# Install dependencies if not already installed
pnpm install

# Generate migration files from schema
pnpm db:generate
```

This will create migration SQL files in the `drizzle/` directory based on your schema defined in `src/db/schema.ts`.

## 5. Run Migrations

### Development (push schema directly)

For development, you can push the schema directly without migrations:

```bash
pnpm db:push
```

This will:
- Connect to your database using `DATABASE_URL`
- Create all tables defined in `src/db/schema.ts`
- Update existing tables if the schema changed

### Production (apply migrations)

For production, use migrations:

```bash
pnpm db:migrate
```

This will:
- Apply all pending migrations from the `drizzle/` directory
- Track applied migrations in the database
- Safely update your production schema

## 6. Verify Database Schema

You can verify the schema was created successfully:

```bash
# Option 1: Use Drizzle Studio (visual database browser)
pnpm db:studio

# This will open a web interface at http://localhost:4983
```

Expected tables:
- `user` - User accounts from GitHub OAuth
- `account` - OAuth provider accounts (NextAuth)
- `session` - NextAuth session tokens
- `verificationToken` - Email verification tokens (NextAuth)
- `conversation` - MUTHUR terminal sessions
- `message` - Chat messages within conversations

## 7. Configure Azure Container App Secrets

Add the database URL to your Container App as a secret:

```bash
# Set Container App secrets
CONTAINER_APP_NAME="muthur-terminal"

az containerapp secret set \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --secrets \
    database-url="<YOUR_DATABASE_URL>" \
    nextauth-secret="<YOUR_NEXTAUTH_SECRET>" \
    github-client-id="<YOUR_GITHUB_CLIENT_ID>" \
    github-client-secret="<YOUR_GITHUB_CLIENT_SECRET>"
```

The GitHub Actions workflow (`deploy.yml`) will automatically pass these secrets as environment variables to the container.

## 8. Firewall Configuration

### Allow Azure Services

Enable **Allow Azure services and resources to access this server** in the PostgreSQL firewall settings.

### Allow Your IP (for local development)

```bash
# Add your current IP
MY_IP=$(curl -s ifconfig.me)

az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --rule-name allow-dev-machine \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP
```

## 9. GitHub OAuth App Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Configure:
   - Application name: `MUTHUR Terminal`
   - Homepage URL: `https://your-app-url.azurecontainerapps.io`
   - Authorization callback URL: `https://your-app-url.azurecontainerapps.io/api/auth/callback/github`
   - For development, also add: `http://localhost:3000/api/auth/callback/github`
4. Generate a new client secret
5. Copy the Client ID and Client Secret to your `.env` file

## Troubleshooting

### Connection timeout

- Verify firewall rules allow your IP
- Check if the server is running: `az postgres flexible-server show --name $DB_SERVER_NAME --resource-group $RESOURCE_GROUP`

### SSL connection required

Make sure your connection string includes `?sslmode=require` at the end.

### Migration errors

If migrations fail:
```bash
# Reset database (DEVELOPMENT ONLY - destroys all data)
pnpm db:push --force

# Or manually drop all tables and re-run migrations
```

### Anonymous mode (no database)

If `DATABASE_URL` is not set:
- Authentication will be disabled
- Users will use the terminal in anonymous/ephemeral mode
- Conversations will not be saved
- This is the default behavior for quick testing

## Cost Optimization

### Burstable tier

The recommended `Standard_B1ms` tier costs approximately $13-15/month and is suitable for:
- Development and staging environments
- Low to moderate traffic applications
- Intermittent workloads

### Stopping the server

To save costs during non-use periods:
```bash
# Stop server (billing paused)
az postgres flexible-server stop \
  --name $DB_SERVER_NAME \
  --resource-group $RESOURCE_GROUP

# Start server
az postgres flexible-server start \
  --name $DB_SERVER_NAME \
  --resource-group $RESOURCE_GROUP
```

### Auto-scaling

For production workloads, consider upgrading to General Purpose tier with auto-scaling enabled.

## Schema Updates

When you modify `src/db/schema.ts`:

1. Generate a new migration:
   ```bash
   pnpm db:generate
   ```

2. Review the generated SQL in `drizzle/` directory

3. Apply the migration:
   ```bash
   pnpm db:migrate
   ```

4. For development, you can skip migrations and use:
   ```bash
   pnpm db:push
   ```

## Security Best Practices

1. **Use strong passwords**: Generate admin passwords with at least 16 characters
2. **Rotate secrets regularly**: Update `NEXTAUTH_SECRET` and database passwords periodically
3. **Restrict firewall rules**: Only allow necessary IP addresses
4. **Use Azure Key Vault**: Store secrets in Key Vault for production (optional but recommended)
5. **Enable SSL**: Always use `sslmode=require` in connection strings
6. **Monitor access**: Review Azure PostgreSQL audit logs regularly

## Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Azure PostgreSQL Flexible Server Docs](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [GitHub OAuth Apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps)
