# Hybrid Vector Database Fix

If you see:

`The column Job.embeddingRole does not exist in the current database.`

this means the application code and Prisma schema have been updated, but the database migration has not been applied.

## Fix

From the project root:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

Then restart the application:

```bash
npm run dev
```

## What the migration adds

The hybrid recommendation engine needs these Job columns:

- `embeddingRole`
- `embeddingSkills`
- `embeddingDomain`
- `embeddingVersion`

The migration also marks active jobs as pending so the embedding worker can regenerate their hybrid vectors.

## If this is a development database

You can also run:

```bash
npx prisma migrate dev
```

Do not use `prisma db push` as the normal deployment method for this version because the project already contains versioned migrations.

## If Prisma says the migration was already applied

Run:

```bash
npx prisma migrate status
```

If Prisma reports the hybrid migration as applied but the columns are still missing, the database/schema history is inconsistent. In that case, inspect the migration table before changing migration history; do not delete the migration or reset a production database blindly.
