<#
PowerShell wrapper for Windows users. Prompts for same inputs as deploy_all.sh
#>
param()

$Root = Get-Location
$Frontend = Join-Path $Root '3omrah_app_clean_20260220_2356\3OMRAH_APP'
$Backend = Join-Path $Root '3omrah_backend\3omrah_sanitized_20260221_002919'

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { Write-Error "GitHub CLI 'gh' not found. Install from https://cli.github.com/"; exit 1 }
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) { Write-Error "Vercel CLI 'vercel' not found. Install via 'npm i -g vercel'"; exit 1 }
if (-not (Get-Command curl -ErrorAction SilentlyContinue)) { Write-Error "curl not found."; exit 1 }

$githubRepo = Read-Host "GitHub repo name to create (username/repo). Leave empty to skip creation"
if ($githubRepo) {
  gh repo create $githubRepo --public --source=. --remote=origin --push
}

Write-Host "Committing and pushing to GitHub..."
git init | Out-Null
git add .
try { git commit -m "Prepare project for automated deploy" } catch { Write-Host "No changes to commit or commit failed." }
git branch -M main
if (-not (git remote | Select-String origin)) {
  if ($githubRepo) { git remote add origin "git@github.com:$githubRepo.git" }
}
git push -u origin main

Write-Host "Deploying frontend with Vercel..."
Set-Location $Frontend
$vercelOutput = vercel --prod --confirm 2>&1
Write-Host $vercelOutput

# attempt to extract vercel url
$vercelUrl = ($vercelOutput | Select-String -Pattern 'https?://[\w.-]+\.vercel\.app' -AllMatches).Matches.Value | Select-Object -First 1
if (-not $vercelUrl) { $vercelUrl = Read-Host "Vercel URL not detected. Paste Vercel URL (or leave empty)" }
if ($vercelUrl) { Write-Host "Frontend deployed to: $vercelUrl" }

Set-Location $Root
$trigger = Read-Host "Trigger Render deploy now? (y/N)"
if ($trigger -match '^[Yy]') {
  $renderKey = Read-Host "Paste your Render API key (won't be saved)"
  $renderServiceId = Read-Host "Paste RENDER_SERVICE_ID (or leave empty to skip)"
  if ($renderServiceId) {
    $body = '{"clearCache":true}'
    curl -X POST -H "Authorization: Bearer $renderKey" -H "Content-Type: application/json" -d $body "https://api.render.com/v1/services/$renderServiceId/deploys"
    Write-Host "Triggered Render deploy."
  } else { Write-Host "No service id provided, skipping Render trigger." }
} else { Write-Host "Skipping Render deploy." }

Write-Host "Done. If backend not deployed, create a Render Web Service and set MONGODB_URI from $Backend\.env"
