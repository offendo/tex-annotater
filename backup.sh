#!/usr/bin/env bash

DB_NAME=annotations-db
DB_USER=postgres
DB_PASS=password

TIMESTAMP=$(date +%F_%T | tr ':' '-')
TEMP_FILE=$(mktemp tmp.XXXXXXXXXX)
S3_FILE="s3://$BUCKET_NAME/backup-$TIMESTAMP"

BUCKET_NAME=tex-annotation

TIMESTAMP=$(date +%F_%T | tr ':' '-')
TEMP_FILE=$(mktemp tmp.XXXXXXXXXX)
S3_FILE="s3://$BUCKET_NAME/database-backup/backup-$TIMESTAMP"

docker-compose run postgres pg_dump -Fc --no-acl -h postgres -U $DB_USER $DB_NAME > $TEMP_FILE
aws s3 cp $TEMP_FILE $S3_FILE --sse
rm "$TEMP_FILE"
