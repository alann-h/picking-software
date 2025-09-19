#!/bin/bash

# Your QBO webhook verifier token from environment variables or hardcoded
QBO_WEBHOOK_VERIFIER_TOKEN="56483a81-1614-4643-babb-55fa292f5379"

# The URL of your webhook endpoint
WEBHOOK_URL="http://localhost:5033/api/webhooks/qbo"

# The JSON payload you want to send
PAYLOAD='{
  "eventNotifications": [
    {
      "realmId": "9130357908851946",
      "dataChangeEvent": {
        "entities": [
          {
            "id": "34",
            "operation": "Update",
            "name": "Item",
            "lastUpdated": "2025-09-19T01:42:47.000Z"
          }
        ]
      }
    }
  ]
}'

# Generate the HMAC-SHA256 signature
# The payload is passed to openssl and the base64-encoded digest is captured.
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$QBO_WEBHOOK_VERIFIER_TOKEN" -binary | base64)

# Use curl to send the POST request with the correct headers and payload
curl -X POST "$WEBHOOK_URL" \
-H "Content-Type: application/json" \
-H "intuit-signature: $SIGNATURE" \
--data "$PAYLOAD"

echo ""