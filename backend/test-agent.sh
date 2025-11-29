#!/bin/bash

# VeriAI Agent Test Script
# Tests all agent API endpoints

BASE_URL="http://localhost:5000/api/agent"
MODEL_SLUG="bert-base-uncased"

echo "🧪 Testing VeriAI Autonomous Agent"
echo "=================================="
echo ""

# Test 1: Health Check
echo "1️⃣  Health Check"
echo "GET $BASE_URL/health"
curl -s "$BASE_URL/health" | jq '.'
echo ""
echo ""

# Test 2: Get Trust Score
echo "2️⃣  Get Trust Score"
echo "GET $BASE_URL/trust/$MODEL_SLUG"
curl -s "$BASE_URL/trust/$MODEL_SLUG" | jq '.'
echo ""
echo ""

# Test 3: Trigger Manual Analysis
echo "3️⃣  Trigger Manual Analysis"
echo "POST $BASE_URL/analyze/$MODEL_SLUG"
curl -s -X POST "$BASE_URL/analyze/$MODEL_SLUG" | jq '.data.insight | {veracity, risk_level, confidence, summary}'
echo ""
echo ""

# Test 4: Get Insights History
echo "4️⃣  Get Insights History"
echo "GET $BASE_URL/insights/$MODEL_SLUG?limit=3"
curl -s "$BASE_URL/insights/$MODEL_SLUG?limit=3" | jq '.data | length'
echo "insights found"
echo ""
echo ""

# Test 5: Get On-Chain Ratings
echo "5️⃣  Get On-Chain Ratings"
echo "GET $BASE_URL/ratings/$MODEL_SLUG?limit=5"
curl -s "$BASE_URL/ratings/$MODEL_SLUG?limit=5" | jq '.data.ratings | length'
echo "ratings found"
echo ""
echo ""

echo "✅ All tests completed!"
