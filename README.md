# Forensic Nutrition PWA

AI-powered calorie tracking that uses vision models to analyze food photos.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Photo Upload                                                │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Stage 1: IDENTIFY (Claude Haiku + vision)                   │
│  - Identifies foods, portions, cuisine                       │
│  - Marks items as "simple" or "complex"                      │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Stage 2: USDA LOOKUP (free, for simple items)               │
│  - grapes, cheese, bread → exact USDA calories               │
│  - complex dishes → skip                                     │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Stage 3: AI ESTIMATE (Haiku text, USDA misses only)         │
│  - pozole, pad thai → AI estimates with cuisine context      │
└──────────────────────────────────────────────────────────────┘
```

## Features

- **Two-stage AI analysis**: Haiku for identification, USDA for lookup, Haiku for complex dishes
- **USDA FoodData Central**: Exact nutrition for common foods (grapes, cheese, bread, etc.)
- **Editable items**: Tap to edit food name/portion, auto-recalculates
- **Macro tracking**: Protein, carbs, sugar, fat
- **Delete meals**: Remove entries with one tap
- **Mobile-first dark UI**: PWA-ready design

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your keys:
# - OPENROUTER_API_KEY (required)
# - USDA_API_KEY (optional, get free at https://fdc.nal.usda.gov/api-key-signup.html)

# Start server
node server.js
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key for Claude Haiku |
| `USDA_API_KEY` | No | USDA FoodData Central API key (free) |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze` | Upload and analyze food photo |
| GET | `/summary` | Get today's calorie summary |
| PUT | `/meal/:id/item/:index` | Edit item and recalculate |
| DELETE | `/meal/:id` | Delete a meal |
| GET | `/history` | Get last 7 days |

## Cost

- ~$0.001-0.003 per image (Haiku is cheap)
- USDA lookups are free
- Typical daily use: < $0.05/day

## Tech Stack

- **Backend**: Node.js, Express, SQLite
- **AI**: Claude Haiku via OpenRouter
- **Nutrition DB**: USDA FoodData Central
- **Frontend**: Vanilla JS, mobile-first CSS
