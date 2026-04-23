#!/bin/bash
set -euo pipefail

# ==============================================================================
# list-dataset.sh
#
# Description:
#   This script lists a sample dataset on the Canton Data Marketplace by
#   creating a DataListing contract on a running Canton ledger. It allocates
#   the necessary parties (Operator, Provider) and then submits the create
#   command via the JSON API.
#
# Prerequisites:
#   - A Canton ledger (e.g., from 'dpm sandbox') must be running.
#   - The project's DAR must be built (run 'dpm build').
#   - `curl` and `jq` must be installed and available in the PATH.
#
# Usage:
#   ./scripts/list-dataset.sh
#
# ==============================================================================

# --- Configuration ---
LEDGER_URL="http://localhost:7575"
OPERATOR_HINT="MarketplaceOperator"
PROVIDER_HINT="DataProvider"

# --- Admin JWT Token ---
# This is a standard admin token for a local 'dpm sandbox' instance.
# It grants full permissions, including party allocation.
# You can generate a similar one via https://jwt.io using the HS256 algorithm,
# a secret (anything, e.g., 'secret'), and the following payload:
# {
#   "https://daml.com/ledger-api": {
#     "ledgerId": "dpm-sandbox",
#     "participantId": "sandbox-participant",
#     "applicationId": "data-marketplace-script",
#     "admin": true
#   }
# }
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2RhbWwuY29tL2xlZGdlci1hcGkiOnsibGVkZ2VySWQiOiJkcG0tc2FuZGJveCIsInBhcnRpY2lwYW50SWQiOiJzYW5kYm94LXBhcnRpY2lwYW50IiwiYXBwbGljYXRpb25JZCI6ImRhdGEtbWFya2V0cGxhY2Utc2NyaXB0IiwiYWRtaW4iOnRydWV9fQ.4A65Nli3gu4sXR622u5C5DT3nC0hM522C2Wk2vxbC18"
AUTH_HEADER="Authorization: Bearer ${JWT_TOKEN}"

# --- Sample Dataset Details ---
DATASET_ID="us-census-2020-demographics"
DATASET_TITLE="US Census 2020 Demographic Data"
DATASET_DESC="Aggregated demographic data from the 2020 US Census, including age, race, and housing statistics."
DATASET_PRICE="1500.0000000000" # Daml Decimals have 10 decimal places of precision
DATASET_CURRENCY="USD"
DATASET_URL="ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi" # Example IPFS content address

# --- Helper Functions ---
# Function to allocate a party via the JSON API v2 endpoint
allocate_party() {
  local hint=$1
  echo "--> Allocating party with hint: ${hint}"
  local response
  response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "${AUTH_HEADER}" \
    -d "{\"identifierHint\": \"${hint}\"}" \
    "${LEDGER_URL}/v2/parties/allocate")

  local party_id
  party_id=$(echo "${response}" | jq -r '.partyDetails.identifier')

  if [ "${party_id}" == "null" ] || [ -z "${party_id}" ]; then
    echo "!!! Failed to allocate party '${hint}'."
    echo "    Response from ledger: ${response}"
    exit 1
  fi
  echo "    '${hint}' allocated with Party ID: ${party_id}"
  echo "${party_id}"
}

# --- Main Script Logic ---
main() {
  echo "=== Data Marketplace: List New Dataset Script ==="
  echo "    Ledger URL: ${LEDGER_URL}"
  echo

  # 1. Find the main package ID from the most recently built DAR
  echo "--> Finding package ID from project DAR file..."
  local dar_file
  dar_file=$(ls -t .daml/dist/canton-data-marketplace-*.dar 2>/dev/null | head -n 1)

  if [ -z "$dar_file" ]; then
      echo "!!! Error: No DAR file found in '.daml/dist/'."
      echo "    Please run 'dpm build' first."
      exit 1
  fi

  local package_id
  package_id=$(dpm damlc inspect-dar --json "$dar_file" | jq -r .main_package_id)
  echo "    Using Package ID: ${package_id} (from ${dar_file})"
  echo

  # 2. Allocate required parties for the listing
  local operator_party_id
  operator_party_id=$(allocate_party "${OPERATOR_HINT}")

  local provider_party_id
  provider_party_id=$(allocate_party "${PROVIDER_HINT}")
  echo

  # 3. Construct the JSON payload for the DataListing contract create command
  echo "--> Constructing 'create' command for DataListing..."
  local template_id="${package_id}:DataListing:DataListing"
  local json_payload
  json_payload=$(cat <<EOF
{
  "templateId": "${template_id}",
  "payload": {
    "operator": "${operator_party_id}",
    "provider": "${provider_party_id}",
    "listingId": "${DATASET_ID}",
    "title": "${DATASET_TITLE}",
    "description": "${DATASET_DESC}",
    "price": "${DATASET_PRICE}",
    "currency": "${DATASET_CURRENCY}",
    "dataUrl": "${DATASET_URL}",
    "metadata": ["demographics", "census", "usa", "2020"]
  }
}
EOF
)
  echo "    Payload to be sent:"
  echo "${json_payload}" | jq .
  echo

  # 4. Send the create command to the ledger's JSON API
  echo "--> Sending create command to the ledger..."
  local create_response
  create_response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "${AUTH_HEADER}" \
    -d "${json_payload}" \
    "${LEDGER_URL}/v1/create")

  # 5. Check response and report result
  local http_body
  http_body=$(echo "$create_response" | sed '$d')
  local http_status
  http_status=$(echo "$create_response" | tail -n1)
  local contract_id
  contract_id=$(echo "${http_body}" | jq -r '.result.contractId // "null"')

  if [ "${http_status}" -eq 200 ] && [ "${contract_id}" != "null" ]; then
    echo
    echo "✅ Success! Data listing created on the ledger."
    echo "   Contract ID: ${contract_id}"
  else
    echo
    echo "!!! Error: Failed to create DataListing contract."
    echo "    HTTP Status: ${http_status}"
    echo "    Response Body:"
    echo "${http_body}" | jq .
    exit 1
  fi

  echo
  echo "=== Script finished successfully. ==="
}

# Execute the main function
main "$@"