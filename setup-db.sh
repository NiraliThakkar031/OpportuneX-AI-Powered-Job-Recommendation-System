#!/usr/bin/env bash
set -e

echo "Generating Prisma Client..."
npx prisma generate

echo "Applying existing Prisma migrations..."
npx prisma migrate deploy

echo "Database setup complete."
