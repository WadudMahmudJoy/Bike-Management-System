#!/usr/bin/env bash
set -eu

if [[ ! "${POSTGRES_SHADOW_DB:-}" =~ ^[a-zA-Z0-9_]+$ ]]; then
  echo "Error: POSTGRES_SHADOW_DB must contain only alphanumeric characters and underscores." >&2
  exit 1
fi

if [[ ! "${POSTGRES_USER:-}" =~ ^[a-zA-Z0-9_]+$ ]]; then
  echo "Error: POSTGRES_USER must contain only alphanumeric characters and underscores." >&2
  exit 1
fi

echo "Creating shadow database: ${POSTGRES_SHADOW_DB} owned by ${POSTGRES_USER}..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v shadow_db="$POSTGRES_SHADOW_DB" -v user_name="$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE "' || :'shadow_db' || '" WITH OWNER "' || :'user_name' || '"'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'shadow_db') \gexec
EOSQL

echo "Shadow database ${POSTGRES_SHADOW_DB} created successfully."
