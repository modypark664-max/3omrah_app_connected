#!/usr/bin/env bash
set -euo pipefail

echo "== Auto-deploy script for Rehlatty (Backend -> Render, Frontend -> Vercel) =="

ROOT_DIR="$(pwd)"
FRONTEND_DIR="$ROOT_DIR/3omrah_app_clean_20260220_2356/3OMRAH_APP"
BACKEND_DIR="$ROOT_DIR/3omrah_backend/3omrah_sanitized_20260221_002919"

command -v gh >/dev/null 2>&1 || { echo >&2 "gh (GitHub CLI) is required. Install from https://cli.github.com/"; exit 1; }
command -v vercel >/dev/null 2>&1 || { echo >&2 "vercel CLI is required. Install with 'npm i -g vercel'"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo >&2 "curl is required."; exit 1; }
command -v jq >/dev/null 2>&1 || echo "Warning: 'jq' not found. JSON parsing may be limited.";

read -p "GitHub repo name to create (username/repo). Leave empty to skip repo creation and use existing remote: " GITHUB_REPO
if [ -n "$GITHUB_REPO" ]; then
  echo "Creating GitHub repo: $GITHUB_REPO"
  gh repo create "$GITHUB_REPO" --public --source=. --remote=origin --push || true
else
  echo "Skipping repo creation. Will use existing git remote 'origin' if present."
fi

echo "
-- Commit and push code to GitHub (branch: main) --"
git init || true
git add .
git commit -m "Prepare project for automated deploy" || true
git branch -M main || true
if git remote | grep origin >/dev/null 2>&1; then
  echo "Using existing origin"
else
  if [ -n "$GITHUB_REPO" ]; then
    git remote add origin "git@github.com:$GITHUB_REPO.git" || true
  fi
fi
git push -u origin main || true

echo "
-- Deploy frontend to Vercel --"
cd "$FRONTEND_DIR"
echo "Running: vercel --prod --confirm"
VERCEL_OUTPUT=$(vercel --prod --confirm 2>&1 || true)
echo "$VERCEL_OUTPUT"

# Try to extract vercel url
VERCEL_URL=$(echo "$VERCEL_OUTPUT" | grep -Eo 'https?://[a-zA-Z0-9.-]+\.vercel\.app' | head -n1 || true)
if [ -z "$VERCEL_URL" ]; then
  # fallback: ask user
  read -p "Vercel URL not detected automatically. Paste Vercel URL here (or leave empty): " VERCEL_URL
else
  echo "Frontend deployed to: $VERCEL_URL"
fi

echo "
-- Prepare backend deploy on Render --"
cd "$ROOT_DIR"
read -p "Do you want the script to trigger a Render deploy now? (y/N): " TRIGGER_RENDER
if [[ "$TRIGGER_RENDER" =~ ^[Yy]$ ]]; then
  read -p "Paste your Render API key (won't be stored): " RENDER_API_KEY
  read -p "If you have an existing Render Service ID, paste it now (leave empty to skip triggering): " RENDER_SERVICE_ID
  if [ -n "$RENDER_SERVICE_ID" ]; then
    echo "Triggering deploy for service $RENDER_SERVICE_ID"
    curl -s -X POST \
      -H "Authorization: Bearer $RENDER_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"clearCache":true}' \
      https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys || echo "Render deploy trigger failed"
    echo "Triggered deploy (check Render dashboard)."
  else
    echo "No Render Service ID provided — skipping Render trigger. To create a service, use the Render UI and point it to this repo."
  fi
else
  echo "Skipping automatic Render trigger. Create a Render Web Service and set MONGODB_URI there."
fi

echo "
-- Final notes --"
echo "If you skipped providing Render details, create a Web Service on Render and set its MONGODB_URI env var to the value from:\n  $BACKEND_DIR/.env"
echo "Once backend URL is available, set the frontend env on Vercel to point to it:\n  vercel env add EXPO_PUBLIC_API_URL production https://your-backend-url"
echo "Script finished."
