#!/usr/bin/env python3
"""
FNA Context Auto-Updater
Runs every 10 minutes via launchd to keep CLAUDE.md up to date
"""

import sqlite3
import subprocess
import os
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path("/Users/home-mini/nutrition-pwa")
CLAUDE_MD = Path("/Users/home-mini/.claude/CLAUDE.md")
DB_PATH = PROJECT_ROOT / "nutrition.db"

def get_db_stats():
    """Get current stats from database"""
    stats = {
        "total_meals": 0,
        "meals_today": 0,
        "profile_exists": "No",
        "cal_target": 2000,
        "profile_name": ""
    }

    if not DB_PATH.exists():
        return stats

    try:
        conn = sqlite3.connect(str(DB_PATH))
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) FROM meals")
        stats["total_meals"] = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM meals WHERE date(timestamp) = date('now')")
        stats["meals_today"] = cur.fetchone()[0]

        cur.execute("SELECT name, cal_target FROM profile WHERE id = 1")
        row = cur.fetchone()
        if row:
            stats["profile_exists"] = "Yes"
            stats["profile_name"] = row[0] or ""
            stats["cal_target"] = row[1] or 2000

        conn.close()
    except Exception as e:
        print(f"DB error: {e}")

    return stats

def check_server():
    """Check if server is running"""
    try:
        result = subprocess.run(
            ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "http://localhost:3000/summary"],
            capture_output=True, text=True, timeout=5
        )
        return "Running" if result.stdout == "200" else "Stopped"
    except:
        return "Stopped"

def count_endpoints():
    """Count API endpoints in server.js"""
    server_js = PROJECT_ROOT / "server.js"
    if not server_js.exists():
        return 0

    content = server_js.read_text()
    count = 0
    for method in ["app.get", "app.post", "app.put", "app.delete"]:
        count += content.count(method + "(")
    return count

def generate_context():
    """Generate the FNA context block"""
    stats = get_db_stats()
    server_status = check_server()
    endpoints = count_endpoints()
    updated_at = datetime.now().strftime("%Y-%m-%d %H:%M PST")

    return f'''- if i type FNA - then remember this You are managing FNA (Food Nutrition Assistant).

  CONTEXT & ARCHITECTURE:
  - Project root: /Users/home-mini/nutrition-pwa/
  - GitHub: https://github.com/gtalwar12/forensic-nutrition-app
  - Public URL: https://nutrition.dev-home-mini.me
  - Local URL: http://localhost:3000
  - Backend: Node.js + Express + SQLite
  - AI: Claude Haiku via OpenRouter (two-stage analysis)
  - Nutrition DB: USDA FoodData Central API

  CURRENT STATUS (auto-updated {updated_at}):
  - Server: {server_status}
  - Total meals logged: {stats["total_meals"]}
  - Meals today: {stats["meals_today"]}
  - Profile configured: {stats["profile_exists"]}
  - Daily calorie target: {stats["cal_target"]}

  TWO-STAGE ANALYSIS FLOW:
  ```
  Photo → Haiku (identify) → USDA lookup → Haiku (estimate misses)
  ```

  TABS:
  | Tab | Purpose |
  |-----|---------|
  | Today | Daily summary + meal list with edit/delete |
  | Charts | 7-day calorie corridor chart + history drill-down |
  | Summary | AI nutritional insights (24h + 7d) |
  | Profile | User settings + AI-generated macro targets |

  KEY FILES:
  - server.js - Express server ({endpoints} endpoints)
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
  ```bash
  cd /Users/home-mini/nutrition-pwa
  node server.js
  ```

  Or check status:
  ```bash
  curl http://localhost:3000/summary
  curl https://nutrition.dev-home-mini.me/summary
  ```

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
  - ~$0.001-0.003 per image (Haiku)
  - ~$0.001 per AI summary
  - USDA lookups: free
  - Typical: < $0.05/day

  COMMON TASKS:
  ```bash
  # Check server
  curl http://localhost:3000/summary | jq

  # Restart server
  lsof -ti:3000 | xargs kill -9; node server.js &

  # Seed dummy data
  node scripts/seed_db.js

  # Check DB
  sqlite3 nutrition.db "SELECT * FROM meals ORDER BY id DESC LIMIT 5;"
  ```

  RULE: Always ensure server is running before testing. Two-stage = cheaper.

'''

def update_claude_md():
    """Update the FNA section in CLAUDE.md"""
    if not CLAUDE_MD.exists():
        print("CLAUDE.md not found")
        return

    content = CLAUDE_MD.read_text()
    new_context = generate_context()

    # Find FNA section start
    fna_start = content.find("- if i type FNA")
    if fna_start == -1:
        print("FNA section not found in CLAUDE.md")
        return

    # Find the next section (starts with "---" or "- if i type")
    remaining = content[fna_start + 20:]  # Skip past the marker

    # Look for next section marker
    next_section = -1
    for marker in ["\n---\n", "\n- if i type "]:
        pos = remaining.find(marker)
        if pos != -1 and (next_section == -1 or pos < next_section):
            next_section = pos

    if next_section == -1:
        # FNA is the last section
        fna_end = len(content)
    else:
        fna_end = fna_start + 20 + next_section

    # Replace the section
    new_content = content[:fna_start] + new_context + content[fna_end:]

    CLAUDE_MD.write_text(new_content)

    stats = get_db_stats()
    server_status = check_server()
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] FNA context updated - Server: {server_status}, Meals: {stats['total_meals']}")

if __name__ == "__main__":
    update_claude_md()
