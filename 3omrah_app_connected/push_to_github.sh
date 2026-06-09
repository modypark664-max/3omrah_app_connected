#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./push_to_github.sh git@github.com:YOURUSER/REPO.git"
  exit 1
fi

REPO_URL=$1

git init
git add .
git commit -m "Prepare for Render + Vercel deployment"
git branch -M main
git remote add origin "$REPO_URL"
git push -u origin main

echo "Pushed to $REPO_URL"
