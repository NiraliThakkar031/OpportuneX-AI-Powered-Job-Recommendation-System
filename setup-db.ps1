# Run from the project root after npm install.
$ErrorActionPreference = "Stop"

Write-Host "Generating Prisma Client..."
npx prisma generate

Write-Host "Applying existing Prisma migrations..."
npx prisma migrate deploy

Write-Host "Database setup complete."
