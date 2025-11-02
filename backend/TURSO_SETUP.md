# Turso Setup Guide

Complete guide to setting up Turso (cloud SQLite) for the Panboo backend.

## Why Turso?

- **Free** - Generous free tier (9GB storage, 500M writes/month)
- **SQLite** - Same SQL syntax you know
- **Persistent** - Works with Render free tier (no lost data)
- **Fast** - Low latency from anywhere
- **Easy** - 5 minute setup

## Step 1: Create Turso Account

1. Go to https://turso.tech
2. Click "Sign Up" (free account)
3. Sign in with GitHub

## Step 2: Install Turso CLI

### Windows:
```powershell
# Using Scoop
scoop install turso

# Or using Chocolatey
choco install turso
```

### Mac/Linux:
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

## Step 3: Login to Turso

```bash
turso auth login
```

This opens your browser to authenticate.

## Step 4: Create Database

```bash
# Create a database named 'panboo-db'
turso db create panboo-db

# Get the database URL
turso db show panboo-db --url
# Output: libsql://panboo-db-your-username.turso.io
```

## Step 5: Create Auth Token

```bash
# Create authentication token
turso db tokens create panboo-db

# Output: eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

**IMPORTANT**: Save this token! You can't view it again.

## Step 6: Update Backend `.env`

Edit `backend/.env`:

```env
# Database (Turso)
TURSO_URL=libsql://panboo-db-your-username.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

**Replace** with your actual URL and token from steps 4 and 5.

## Step 7: Test Locally

```bash
cd backend
npm start
```

You should see:
```
[INFO] Initializing database { url: 'libsql://panboo-db-your-username.turso.io' }
[INFO] Database tables created
[INFO] API server listening on port 3002
```

## Step 8: Deploy to Render

### Option A: Via Render Dashboard

1. Go to https://dashboard.render.com
2. New → Web Service
3. Connect your GitHub repo
4. Settings:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
5. Environment Variables:
   - Add `TURSO_URL` = `libsql://...`
   - Add `TURSO_AUTH_TOKEN` = `eyJ...`
6. Click "Create Web Service"

### Option B: Via render.yaml

Your `backend/render.yaml` is already configured! Just update these env vars in the Render dashboard after deployment.

## Useful Turso Commands

### View Databases
```bash
turso db list
```

### Access Database Shell
```bash
turso db shell panboo-db

# Now you can run SQL:
sqlite> SELECT COUNT(*) FROM charity_contributions;
sqlite> .tables
sqlite> .schema
sqlite> .quit
```

### Export Database
```bash
# Export to SQL file
turso db shell panboo-db .dump > backup.sql

# Import to local SQLite
sqlite3 panboo-local.db < backup.sql

# Open in DB Browser
# File -> Open Database -> panboo-local.db
```

### View Database Stats
```bash
turso db inspect panboo-db
```

### Create Additional Databases
```bash
# For your Telegram bot
turso db create telegram-bot-db
turso db tokens create telegram-bot-db
```

## Local Development

For local development, you can use a local SQLite file:

```env
# backend/.env
TURSO_URL=file:panboo.db
TURSO_AUTH_TOKEN=
```

This creates `backend/panboo.db` locally that you can open with DB Browser.

## Switching Between Local and Turso

**Local (Development):**
```env
TURSO_URL=file:panboo.db
TURSO_AUTH_TOKEN=
```

**Turso (Production):**
```env
TURSO_URL=libsql://panboo-db-your-username.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

## Troubleshooting

### "Authentication failed"
- Check your `TURSO_AUTH_TOKEN` is correct
- Regenerate token: `turso db tokens create panboo-db`

### "Database not found"
- Check `TURSO_URL` matches exactly
- List databases: `turso db list`

### "Too many requests"
- Free tier limits: 500M writes/month
- Check usage: `turso db inspect panboo-db`

### Tables not creating
- Check logs for errors
- Try manual shell: `turso db shell panboo-db`
- Run `.tables` to see if they exist

## Limits & Pricing

### Free Tier (Forever)
- 9GB total storage
- 500M row reads/month
- 25M row writes/month
- Up to 500 databases
- Perfect for Panboo!

### Paid Tiers
Only needed if you exceed free tier. Starts at $29/month for more usage.

## Database Management

### Backup Strategy
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
turso db shell panboo-db .dump > backups/panboo-$DATE.sql
```

### Monitor Usage
```bash
turso db inspect panboo-db
```

Watch for:
- Storage used
- Rows read/written
- Active connections

## Migrating from Local SQLite

If you have an existing `panboo.db`:

```bash
# 1. Export local database
sqlite3 panboo.db .dump > export.sql

# 2. Import to Turso
turso db shell panboo-db < export.sql
```

## Support

- Turso Docs: https://docs.turso.tech
- Turso Discord: https://discord.gg/turso
- GitHub Issues: https://github.com/tursodatabase/libsql

## Summary

✅ **Free forever** for most use cases
✅ **Same SQLite** you're already using
✅ **Works with Render free tier**
✅ **Easy to backup** and export
✅ **Can share** across multiple services

Perfect for Panboo! 🎉
