#!/bin/sh
set -e
node scripts/migrate.js
node scripts/seed.js
exec node server.js
