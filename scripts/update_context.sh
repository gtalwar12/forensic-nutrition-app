#!/bin/bash
# FNA Context Auto-Updater
# Runs every 10 minutes via launchd to keep CLAUDE.md up to date

set -e

PROJECT_ROOT="/Users/home-mini/nutrition-pwa"
CLAUDE_MD="/Users/home-mini/.claude/CLAUDE.md"
DB_PATH="$PROJECT_ROOT/nutrition.db"

# Get current stats from database
if [ -f "$DB_PATH" ]; then
  TOTAL_MEALS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM meals;" 2>/dev/null || echo "0")
  MEALS_TODAY=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM meals WHERE date(timestamp) = date('now');" 2>/dev/null || echo "0")
  PROFILE_EXISTS=$(sqlite3 "$DB_PATH" "SELECT CASE WHEN EXISTS(SELECT 1 FROM profile WHERE id=1) THEN 'Yes' ELSE 'No' END;" 2>/dev/null || echo "No")
  CAL_TARGET=$(sqlite3 "$DB_PATH" "SELECT COALESCE(cal_target, 2000) FROM profile WHERE id=1;" 2>/dev/null || echo "2000")
else
  TOTAL_MEALS="0"
  MEALS_TODAY="0"
  PROFILE_EXISTS="No"
  CAL_TARGET="2000"
fi

# Check if server is running
if curl -s http://localhost:3000/summary > /dev/null 2>&1; then
  SERVER_STATUS="Running"
else
  SERVER_STATUS="Stopped"
fi

# Get file counts
JS_FILES=$(find "$PROJECT_ROOT/public" -name "*.js" 2>/dev/null | wc -l | tr -d ' ')
ENDPOINTS=$(grep -c "app\.\(get\|post\|put\|delete\)" "$PROJECT_ROOT/server.js" 2>/dev/null || echo "0")

# Generate timestamp
UPDATED_AT=$(date "+%Y-%m-%d %H:%M PST")

# Generate the new FNA context
FNA_CONTEXT="- if i type FNA - then remember this You are managing FNA (Food Nutrition Assistant).

  CONTEXT & ARCHITECTURE:
  - Project root: /Users/home-mini/nutrition-pwa/
  - GitHub: https://github.com/gtalwar12/forensic-nutrition-app
  - Public URL: https://nutrition.dev-home-mini.me
  - Local URL: http://localhost:3000
  - Backend: Node.js + Express + SQLite
  - AI: Claude Haiku via OpenRouter (two-stage analysis)
  - Nutrition DB: USDA FoodData Central API

  CURRENT STATUS (auto-updated $UPDATED_AT):
  - Server: $SERVER_STATUS
  - Total meals logged: $TOTAL_MEALS
  - Meals today: $MEALS_TODAY
  - Profile configured: $PROFILE_EXISTS
  - Daily calorie target: $CAL_TARGET

  TWO-STAGE ANALYSIS FLOW:
  \`\`\`
  Photo → Haiku (identify) → USDA lookup → Haiku (estimate misses)
  \`\`\`

  TABS:
  | Tab | Purpose |
  |-----|---------|
  | Today | Daily summary + meal list with edit/delete |
  | Charts | 7-day calorie corridor chart + history drill-down |
  | Summary | AI nutritional insights (24h + 7d) |
  | Profile | User settings + AI-generated macro targets |

  KEY FILES:
  - server.js - Express server ($ENDPOINTS endpoints)
  - public/index.html - Mobile-first dark UI (4 tabs)
  - public/app.js - Today tab logic
  - public/charts.js - Charts tab + history drill-down
  - public/profile.js - Profile + Summary tabs
  - nutritionPrompt.js - AI prompts
  - scripts/seed_db.js - Database seeder
  - .env - OPENROUTER_API_KEY, USDA_API_KEY

  FEATURES:
  - Two-stage AI analysis (10x cheaper than Sonnet)
  - USDA FoodData Central for common foods
  - Editable items with auto-recalculate
  - 7-day calorie corridor visualization
  - History drill-down (click day → see meals)
  - AI Summary (24h + 7d nutritional insights)
  - Profile with GLP-1 support
  - AI-generated personalized macro targets
  - Mobile-first dark theme

  RUNNING THE APP:
  \`\`\`bash
  cd /Users/home-mini/nutrition-pwa
  node server.js
  \`\`\`

  Or check status:
  \`\`\`bash
  curl http://localhost:3000/summary
  curl https://nutrition.dev-home-mini.me/summary
  \`\`\`

  CLOUDFLARE TUNNEL:
  - Route: nutrition.dev-home-mini.me → http://127.0.0.1:3000
  - Config: ~/.cloudflared/config.yml

  API ENDPOINTS:
  | Method | Endpoint | Description |
  |--------|----------|-------------|
  | POST | /analyze | Upload food photo |
  | GET | /summary | Today's calories |
  | PUT | /meal/:id/item/:index | Edit item |
  | DELETE | /meal/:id | Delete meal |
  | GET | /history | Last 7 days aggregated |
  | GET | /meals/:date | Meals for specific date |
  | GET | /profile | Get user profile |
  | POST | /profile | Save user profile |
  | POST | /profile/generate-targets | AI macro calculation |
  | GET | /ai-summary | AI nutritional summary |

  DATABASE:
  - Path: /Users/home-mini/nutrition-pwa/nutrition.db
  - Tables: meals, profile

  COST:
  - ~\$0.001-0.003 per image (Haiku)
  - ~\$0.001 per AI summary
  - USDA lookups: free
  - Typical: < \$0.05/day

  COMMON TASKS:
  \`\`\`bash
  # Check server
  curl http://localhost:3000/summary | jq

  # Restart server
  lsof -ti:3000 | xargs kill -9; node server.js &

  # Seed dummy data
  node scripts/seed_db.js

  # Check DB
  sqlite3 nutrition.db \"SELECT * FROM meals ORDER BY id DESC LIMIT 5;\"
  \`\`\`

  RULE: Always ensure server is running before testing. Two-stage = cheaper.

"

# Create backup
cp "$CLAUDE_MD" "$CLAUDE_MD.bak"

# Find the FNA section and replace it
# Use awk to replace the section between FNA marker and the next section marker
awk -v new_content="$FNA_CONTEXT" '
  /^- if i type FNA/ {
    printing = 0
    print new_content
    next
  }
  /^- if i type [A-Z]/ && !printing {
    printing = 1
  }
  /^---$/ && !printing {
    printing = 1
  }
  printing { print }
  !(/^- if i type FNA/) && !/^- if i type [A-Z]/ && !/^---$/ && !printing { next }
' "$CLAUDE_MD.bak" > "$CLAUDE_MD.tmp"

# Check if replacement worked, if not use sed approach
if [ ! -s "$CLAUDE_MD.tmp" ]; then
  # Fallback: just update the timestamp line if full replacement fails
  sed -i '' "s/CURRENT STATUS (auto-updated.*)/CURRENT STATUS (auto-updated $UPDATED_AT):/" "$CLAUDE_MD"
  rm -f "$CLAUDE_MD.tmp"
else
  mv "$CLAUDE_MD.tmp" "$CLAUDE_MD"
fi

rm -f "$CLAUDE_MD.bak"

echo "[$UPDATED_AT] FNA context updated - Server: $SERVER_STATUS, Meals: $TOTAL_MEALS"
