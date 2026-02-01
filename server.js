require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { IDENTIFY_PROMPT, ESTIMATE_PROMPT, RECALCULATE_PROMPT } = require('./nutritionPrompt');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `meal_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|heic/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Initialize SQLite database
const db = new sqlite3.Database('./nutrition.db', (err) => {
  if (err) console.error('Database error:', err);
  else console.log('Connected to SQLite database');
});

// Create/update tables
db.serialize(() => {
  db.get("SELECT sql FROM sqlite_master WHERE name='meals'", (err, row) => {
    if (row && !row.sql.includes('protein_g')) {
      db.run("ALTER TABLE meals ADD COLUMN protein_g INTEGER DEFAULT 0");
      db.run("ALTER TABLE meals ADD COLUMN carbs_g INTEGER DEFAULT 0");
      db.run("ALTER TABLE meals ADD COLUMN sugar_g INTEGER DEFAULT 0");
      db.run("ALTER TABLE meals ADD COLUMN fat_g INTEGER DEFAULT 0");
      console.log('Migrated database to include macros');
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      image_path TEXT,
      items TEXT,
      cal_low INTEGER,
      cal_high INTEGER,
      protein_g INTEGER DEFAULT 0,
      carbs_g INTEGER DEFAULT 0,
      sugar_g INTEGER DEFAULT 0,
      fat_g INTEGER DEFAULT 0,
      confidence TEXT,
      notes TEXT
    )
  `);

  // Profile table
  db.run(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT,
      age INTEGER,
      gender TEXT,
      current_weight REAL,
      target_weight REAL,
      weight_unit TEXT DEFAULT 'lbs',
      activity_level TEXT DEFAULT 'medium',
      glp1_usage INTEGER DEFAULT 0,
      glp1_type TEXT,
      cal_target INTEGER,
      protein_target INTEGER,
      carbs_target INTEGER,
      fat_target INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// ============================================================
// USDA FoodData Central API
// ============================================================

const PORTION_GRAMS = {
  'grape': 5, 'grapes': 5,
  'apple': 180, 'banana': 120, 'orange': 130,
  'strawberry': 12, 'blueberry': 1.5,
  'prune': 10, 'raisin': 1,
  'cheese slice': 28, 'cheese': 28,
  'milk cup': 244, 'yogurt cup': 245,
  'egg': 50,
  'bread slice': 30, 'bread': 30,
  'toast': 30, 'bagel': 70,
  'rice cup': 158, 'pasta cup': 140,
  'chip': 2, 'chips': 28,
  'cracker': 4, 'cookie': 30,
  'pretzel': 5,
  'chicken breast': 170, 'chicken': 85,
  'beef': 85, 'steak': 170,
  'fish fillet': 140, 'salmon': 140,
  'shrimp': 15,
  'carrot': 60, 'broccoli cup': 90,
  'potato': 150, 'tomato': 120,
  'lettuce cup': 55,
  'juice cup': 240, 'soda can': 355,
  'coffee cup': 240, 'tea cup': 240,
  'cup': 240, 'oz': 28, 'tbsp': 15, 'tsp': 5,
  'piece': 30, 'slice': 30, 'serving': 100
};

function parsePortion(portionStr) {
  const match = portionStr.toLowerCase().match(/^([\d.\/]+)?\s*(.+)?$/);
  if (!match) return { quantity: 1, unit: 'serving', grams: 100 };

  let quantity = 1;
  if (match[1]) {
    if (match[1].includes('/')) {
      const [num, den] = match[1].split('/');
      quantity = parseFloat(num) / parseFloat(den);
    } else {
      quantity = parseFloat(match[1]);
    }
  }

  const unit = (match[2] || 'serving').trim();
  let grams = 100;
  for (const [key, val] of Object.entries(PORTION_GRAMS)) {
    if (unit.includes(key)) {
      grams = val;
      break;
    }
  }

  return { quantity, unit, grams: quantity * grams };
}

async function searchUSDA(foodName) {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return null;

  try {
    const searchTerm = foodName
      .toLowerCase()
      .replace(/fresh|raw|cooked|grilled|baked|fried|organic/gi, '')
      .trim();

    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(searchTerm)}&dataType=Foundation,SR%20Legacy&pageSize=5`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.foods || data.foods.length === 0) {
      console.log(`  USDA: no match for "${foodName}"`);
      return null;
    }

    const food = data.foods[0];
    console.log(`  USDA: "${foodName}" → "${food.description}"`);

    const nutrients = {};
    for (const n of food.foodNutrients || []) {
      const name = n.nutrientName?.toLowerCase() || '';
      if (name.includes('energy') && n.unitName === 'KCAL') {
        nutrients.calories = n.value;
      } else if (name === 'protein') {
        nutrients.protein_g = n.value;
      } else if (name === 'carbohydrate, by difference') {
        nutrients.carbs_g = n.value;
      } else if (name.includes('sugars, total')) {
        nutrients.sugar_g = n.value;
      } else if (name === 'total lipid (fat)') {
        nutrients.fat_g = n.value;
      }
    }

    return { description: food.description, per100g: nutrients, fdcId: food.fdcId };
  } catch (error) {
    console.error('USDA error:', error.message);
    return null;
  }
}

function scaleUSDA(usda, portionStr) {
  const portion = parsePortion(portionStr);
  const scale = portion.grams / 100;
  const calories = Math.round(usda.per100g.calories * scale);

  return {
    source: 'usda',
    fdcId: usda.fdcId,
    cal_low: calories,
    cal_high: calories,
    protein_g: Math.round((usda.per100g.protein_g || 0) * scale),
    carbs_g: Math.round((usda.per100g.carbs_g || 0) * scale),
    sugar_g: Math.round((usda.per100g.sugar_g || 0) * scale),
    fat_g: Math.round((usda.per100g.fat_g || 0) * scale),
    notes: `USDA: ${usda.description}`
  };
}

// ============================================================
// AI Functions (Two-Stage)
// ============================================================

// Stage 1: Identify foods in image (Haiku with vision)
async function identifyFoods(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  console.log('Stage 1: Identifying foods (Haiku vision)...');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Forensic Nutrition PWA'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-haiku',
      messages: [
        { role: 'system', content: IDENTIFY_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            { type: 'text', text: 'Identify all foods in this image.' }
          ]
        }
      ],
      max_tokens: 800
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${await response.text()}`);
  }

  const data = await response.json();
  let content = data.choices[0].message.content;

  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) content = jsonMatch[1].trim();

  return JSON.parse(content);
}

// Stage 2: Estimate nutrition for USDA misses (Haiku text-only)
async function estimateNutrition(foodName, portion, cuisine) {
  console.log(`  AI estimate: ${foodName} (${portion})`);

  const context = cuisine ? `${cuisine} cuisine` : '';

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Forensic Nutrition PWA'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-haiku',
      messages: [
        { role: 'system', content: ESTIMATE_PROMPT },
        { role: 'user', content: `Food: ${foodName}${context ? ` (${context})` : ''}\nPortion: ${portion}` }
      ],
      max_tokens: 300
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${await response.text()}`);
  }

  const data = await response.json();
  let content = data.choices[0].message.content;

  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) content = jsonMatch[1].trim();

  return { ...JSON.parse(content), source: 'ai' };
}

// Main analysis flow
async function analyzeFood(imagePath) {
  // Stage 1: Identify foods
  const identified = await identifyFoods(imagePath);
  console.log(`Found ${identified.items.length} items`);

  // Stage 2 & 3: USDA lookup, then AI fallback
  console.log('Stage 2: Looking up nutrition...');
  const enrichedItems = [];
  let usdaHits = 0;
  let aiEstimates = 0;

  for (const item of identified.items) {
    let nutrition;

    // Try USDA first (especially for simple foods)
    if (item.category === 'simple') {
      const usda = await searchUSDA(item.name);
      if (usda && usda.per100g.calories) {
        nutrition = scaleUSDA(usda, item.portion);
        usdaHits++;
      }
    }

    // Fall back to AI for complex dishes or USDA misses
    if (!nutrition) {
      nutrition = await estimateNutrition(item.name, item.portion, item.cuisine);
      aiEstimates++;
    }

    enrichedItems.push({
      name: item.name,
      portion: item.portion,
      cuisine: item.cuisine,
      category: item.category,
      ...nutrition
    });
  }

  console.log(`Results: ${usdaHits} USDA, ${aiEstimates} AI estimates`);

  // Calculate totals
  const totals = enrichedItems.reduce((acc, item) => ({
    cal_low: acc.cal_low + (item.cal_low || 0),
    cal_high: acc.cal_high + (item.cal_high || 0),
    protein_g: acc.protein_g + (item.protein_g || 0),
    carbs_g: acc.carbs_g + (item.carbs_g || 0),
    sugar_g: acc.sugar_g + (item.sugar_g || 0),
    fat_g: acc.fat_g + (item.fat_g || 0)
  }), { cal_low: 0, cal_high: 0, protein_g: 0, carbs_g: 0, sugar_g: 0, fat_g: 0 });

  // Determine confidence
  const confidence = usdaHits === enrichedItems.length ? 'high'
    : usdaHits > 0 ? 'medium'
    : 'low';

  return {
    items: enrichedItems,
    meal_total: totals,
    confidence,
    analysis_notes: `${usdaHits} items from USDA database, ${aiEstimates} AI estimates. ${identified.meal_context || ''}`
  };
}

// Recalculate (for edits) - tries USDA first
async function recalculateItem(name, portion) {
  // Try USDA
  const usda = await searchUSDA(name);
  if (usda && usda.per100g.calories) {
    console.log(`  USDA recalc: ${name}`);
    return scaleUSDA(usda, portion);
  }

  // Fall back to AI
  console.log(`  AI recalc: ${name}`);
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Forensic Nutrition PWA'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-haiku',
      messages: [
        { role: 'system', content: RECALCULATE_PROMPT },
        { role: 'user', content: `Food: ${name}\nPortion: ${portion}` }
      ],
      max_tokens: 200
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${await response.text()}`);
  }

  const data = await response.json();
  let content = data.choices[0].message.content;

  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) content = jsonMatch[1].trim();

  return { ...JSON.parse(content), source: 'ai' };
}

// ============================================================
// API Routes
// ============================================================

app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    console.log(`\n=== Analyzing: ${req.file.path} ===`);
    const analysis = await analyzeFood(req.file.path);

    db.run(
      `INSERT INTO meals (image_path, items, cal_low, cal_high, protein_g, carbs_g, sugar_g, fat_g, confidence, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.file.path,
        JSON.stringify(analysis.items),
        analysis.meal_total.cal_low,
        analysis.meal_total.cal_high,
        analysis.meal_total.protein_g || 0,
        analysis.meal_total.carbs_g || 0,
        analysis.meal_total.sugar_g || 0,
        analysis.meal_total.fat_g || 0,
        analysis.confidence,
        analysis.analysis_notes
      ],
      function(err) {
        if (err) console.error('Database insert error:', err);
        else {
          res.json({ success: true, id: this.lastID, analysis, image: req.file.filename });
        }
      }
    );

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/meal/:id/item/:index', async (req, res) => {
  const { id, index } = req.params;
  const { name, portion } = req.body;

  try {
    db.get('SELECT * FROM meals WHERE id = ?', [id], async (err, meal) => {
      if (err || !meal) {
        return res.status(404).json({ error: 'Meal not found' });
      }

      const items = JSON.parse(meal.items);
      const itemIndex = parseInt(index);

      if (itemIndex < 0 || itemIndex >= items.length) {
        return res.status(400).json({ error: 'Invalid item index' });
      }

      console.log(`\n=== Recalculating: ${name} (${portion}) ===`);
      const newNutrition = await recalculateItem(name, portion);

      items[itemIndex] = {
        ...items[itemIndex],
        name,
        portion,
        cal_low: newNutrition.cal_low,
        cal_high: newNutrition.cal_high,
        protein_g: newNutrition.protein_g || 0,
        carbs_g: newNutrition.carbs_g || 0,
        sugar_g: newNutrition.sugar_g || 0,
        fat_g: newNutrition.fat_g || 0,
        volume_oz: newNutrition.volume_oz,
        source: newNutrition.source,
        notes: newNutrition.notes
      };

      const totals = items.reduce((acc, item) => ({
        cal_low: acc.cal_low + (item.cal_low || 0),
        cal_high: acc.cal_high + (item.cal_high || 0),
        protein_g: acc.protein_g + (item.protein_g || 0),
        carbs_g: acc.carbs_g + (item.carbs_g || 0),
        sugar_g: acc.sugar_g + (item.sugar_g || 0),
        fat_g: acc.fat_g + (item.fat_g || 0)
      }), { cal_low: 0, cal_high: 0, protein_g: 0, carbs_g: 0, sugar_g: 0, fat_g: 0 });

      db.run(
        `UPDATE meals SET items = ?, cal_low = ?, cal_high = ?, protein_g = ?, carbs_g = ?, sugar_g = ?, fat_g = ? WHERE id = ?`,
        [JSON.stringify(items), totals.cal_low, totals.cal_high, totals.protein_g, totals.carbs_g, totals.sugar_g, totals.fat_g, id],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, items, totals });
        }
      );
    });

  } catch (error) {
    console.error('Recalculate error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/summary', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  db.all(
    `SELECT * FROM meals WHERE date(timestamp) = date(?) ORDER BY timestamp DESC`,
    [today],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const summary = {
        date: today,
        meals: rows.length,
        total_cal_low: 0,
        total_cal_high: 0,
        total_protein_g: 0,
        total_carbs_g: 0,
        total_sugar_g: 0,
        total_fat_g: 0,
        entries: []
      };

      rows.forEach(row => {
        summary.total_cal_low += row.cal_low || 0;
        summary.total_cal_high += row.cal_high || 0;
        summary.total_protein_g += row.protein_g || 0;
        summary.total_carbs_g += row.carbs_g || 0;
        summary.total_sugar_g += row.sugar_g || 0;
        summary.total_fat_g += row.fat_g || 0;
        summary.entries.push({
          id: row.id,
          time: row.timestamp,
          items: JSON.parse(row.items || '[]'),
          cal_low: row.cal_low,
          cal_high: row.cal_high,
          protein_g: row.protein_g || 0,
          carbs_g: row.carbs_g || 0,
          sugar_g: row.sugar_g || 0,
          fat_g: row.fat_g || 0,
          confidence: row.confidence,
          notes: row.notes
        });
      });

      res.json(summary);
    }
  );
});

app.get('/history', (req, res) => {
  db.all(
    `SELECT date(timestamp) as date,
            COUNT(*) as meals,
            SUM(cal_low) as total_low,
            SUM(cal_high) as total_high,
            SUM(protein_g) as total_protein,
            SUM(carbs_g) as total_carbs,
            SUM(sugar_g) as total_sugar,
            SUM(fat_g) as total_fat
     FROM meals
     WHERE timestamp >= date('now', '-7 days')
     GROUP BY date(timestamp)
     ORDER BY date DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get('/meals/:date', (req, res) => {
  const { date } = req.params;

  db.all(
    `SELECT * FROM meals WHERE date(timestamp) = date(?) ORDER BY timestamp ASC`,
    [date],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const meals = rows.map(row => ({
        id: row.id,
        time: row.timestamp,
        items: JSON.parse(row.items || '[]'),
        cal_low: row.cal_low,
        cal_high: row.cal_high,
        protein_g: row.protein_g || 0,
        carbs_g: row.carbs_g || 0,
        sugar_g: row.sugar_g || 0,
        fat_g: row.fat_g || 0,
        confidence: row.confidence
      }));

      const totals = meals.reduce((acc, m) => ({
        cal_low: acc.cal_low + m.cal_low,
        cal_high: acc.cal_high + m.cal_high,
        protein_g: acc.protein_g + m.protein_g,
        carbs_g: acc.carbs_g + m.carbs_g,
        sugar_g: acc.sugar_g + m.sugar_g,
        fat_g: acc.fat_g + m.fat_g
      }), { cal_low: 0, cal_high: 0, protein_g: 0, carbs_g: 0, sugar_g: 0, fat_g: 0 });

      res.json({ date, meals, totals });
    }
  );
});

// ============================================================
// Profile Endpoints
// ============================================================

app.get('/profile', (req, res) => {
  db.get('SELECT * FROM profile WHERE id = 1', (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || {});
  });
});

app.post('/profile', async (req, res) => {
  const { name, age, gender, current_weight, target_weight, weight_unit, activity_level, glp1_usage, glp1_type } = req.body;

  // Calculate recommended targets using AI
  let recommendations = null;
  try {
    recommendations = await calculateRecommendations(req.body);
  } catch (e) {
    console.error('AI recommendation error:', e);
  }

  const cal_target = req.body.cal_target || recommendations?.cal_target || 2000;
  const protein_target = req.body.protein_target || recommendations?.protein_target || 120;
  const carbs_target = req.body.carbs_target || recommendations?.carbs_target || 200;
  const fat_target = req.body.fat_target || recommendations?.fat_target || 65;

  db.run(
    `INSERT INTO profile (id, name, age, gender, current_weight, target_weight, weight_unit, activity_level, glp1_usage, glp1_type, cal_target, protein_target, carbs_target, fat_target, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       age = excluded.age,
       gender = excluded.gender,
       current_weight = excluded.current_weight,
       target_weight = excluded.target_weight,
       weight_unit = excluded.weight_unit,
       activity_level = excluded.activity_level,
       glp1_usage = excluded.glp1_usage,
       glp1_type = excluded.glp1_type,
       cal_target = excluded.cal_target,
       protein_target = excluded.protein_target,
       carbs_target = excluded.carbs_target,
       fat_target = excluded.fat_target,
       updated_at = excluded.updated_at`,
    [name, age, gender, current_weight, target_weight, weight_unit || 'lbs', activity_level, glp1_usage ? 1 : 0, glp1_type, cal_target, protein_target, carbs_target, fat_target],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, recommendations, cal_target, protein_target, carbs_target, fat_target });
    }
  );
});

app.post('/profile/generate-targets', async (req, res) => {
  try {
    const recommendations = await calculateRecommendations(req.body);
    res.json(recommendations);
  } catch (error) {
    console.error('AI recommendation error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function calculateRecommendations(profile) {
  const { age, gender, current_weight, target_weight, weight_unit, activity_level, glp1_usage, glp1_type } = profile;

  const prompt = `You are a nutrition expert. Calculate recommended daily calorie and macro targets.

Profile:
- Age: ${age || 'unknown'}
- Gender: ${gender || 'unknown'}
- Current weight: ${current_weight || 'unknown'} ${weight_unit || 'lbs'}
- Target weight: ${target_weight || 'unknown'} ${weight_unit || 'lbs'}
- Activity level: ${activity_level || 'medium'} (none/low/medium/high)
- GLP-1 medication: ${glp1_usage ? `Yes (${glp1_type || 'unspecified'})` : 'No'}

${glp1_usage ? 'Note: GLP-1 users typically need 20-30% fewer calories but higher protein (1.0-1.2g per lb of target weight) to preserve muscle mass.' : ''}

Return ONLY valid JSON with these exact keys:
{
  "cal_target": <number>,
  "protein_target": <number in grams>,
  "carbs_target": <number in grams>,
  "fat_target": <number in grams>,
  "reasoning": "<brief explanation>"
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'FNA'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-haiku',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300
    })
  });

  if (!response.ok) throw new Error('AI API error');

  const data = await response.json();
  let content = data.choices[0].message.content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) content = jsonMatch[0];

  return JSON.parse(content);
}

// ============================================================
// AI Summary Endpoint
// ============================================================

app.get('/ai-summary', async (req, res) => {
  try {
    // Get profile for context
    const profile = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM profile WHERE id = 1', (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });

    // Get last 24 hours of meals
    const meals24h = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM meals WHERE timestamp >= datetime('now', '-24 hours') ORDER BY timestamp DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Get last 7 days of meals
    const meals7d = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM meals WHERE timestamp >= datetime('now', '-7 days') ORDER BY timestamp DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Parse items from meals
    const parse24h = meals24h.map(m => ({
      time: m.timestamp,
      items: JSON.parse(m.items || '[]'),
      cal_low: m.cal_low,
      cal_high: m.cal_high,
      protein_g: m.protein_g,
      carbs_g: m.carbs_g,
      fat_g: m.fat_g
    }));

    const totals24h = meals24h.reduce((acc, m) => ({
      cal_low: acc.cal_low + (m.cal_low || 0),
      cal_high: acc.cal_high + (m.cal_high || 0),
      protein_g: acc.protein_g + (m.protein_g || 0),
      carbs_g: acc.carbs_g + (m.carbs_g || 0),
      fat_g: acc.fat_g + (m.fat_g || 0)
    }), { cal_low: 0, cal_high: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

    const totals7d = meals7d.reduce((acc, m) => ({
      cal_low: acc.cal_low + (m.cal_low || 0),
      cal_high: acc.cal_high + (m.cal_high || 0),
      protein_g: acc.protein_g + (m.protein_g || 0),
      carbs_g: acc.carbs_g + (m.carbs_g || 0),
      fat_g: acc.fat_g + (m.fat_g || 0)
    }), { cal_low: 0, cal_high: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

    // Build all food items for context
    const allItems24h = parse24h.flatMap(m => m.items.map(i => i.name)).join(', ');
    const allItems7d = meals7d.flatMap(m => JSON.parse(m.items || '[]').map(i => i.name)).join(', ');

    const prompt = `You are a supportive nutrition coach. Analyze this eating data and provide helpful, encouraging feedback.

USER PROFILE:
${profile.name ? `Name: ${profile.name}` : ''}
${profile.glp1_usage ? `On GLP-1 medication (${profile.glp1_type || 'type unknown'}) - prioritize protein intake` : ''}
Daily targets: ${profile.cal_target || 2000} cal, ${profile.protein_target || 120}g protein, ${profile.carbs_target || 200}g carbs, ${profile.fat_target || 65}g fat

LAST 24 HOURS:
- Meals: ${meals24h.length}
- Calories: ${totals24h.cal_low}-${totals24h.cal_high}
- Protein: ${totals24h.protein_g}g | Carbs: ${totals24h.carbs_g}g | Fat: ${totals24h.fat_g}g
- Foods eaten: ${allItems24h || 'none logged'}

LAST 7 DAYS:
- Total meals: ${meals7d.length}
- Avg daily calories: ${Math.round(totals7d.cal_low / 7)}-${Math.round(totals7d.cal_high / 7)}
- Avg daily protein: ${Math.round(totals7d.protein_g / 7)}g
- Foods eaten: ${allItems7d || 'none logged'}

Provide a JSON response with:
{
  "summary_24h": {
    "headline": "<short encouraging headline>",
    "nutrition_quality": "<assessment of nutritional value>",
    "protein_status": "<are they hitting protein goals? important for GLP-1 users>",
    "portion_insight": "<observation about portions>",
    "suggestion": "<one actionable tip>"
  },
  "summary_7d": {
    "headline": "<week overview headline>",
    "patterns": "<eating patterns observed>",
    "wins": "<positive behaviors to celebrate>",
    "focus_area": "<one area to improve>",
    "encouragement": "<supportive closing message>"
  }
}

Be warm, specific, and constructive. Focus on progress, not perfection.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'FNA'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600
      })
    });

    if (!response.ok) throw new Error('AI API error');

    const data = await response.json();
    let content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) content = jsonMatch[0];

    const summary = JSON.parse(content);
    res.json({
      ...summary,
      totals_24h: totals24h,
      totals_7d: totals7d,
      meals_24h: meals24h.length,
      meals_7d: meals7d.length
    });

  } catch (error) {
    console.error('AI summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/meal/:id', (req, res) => {
  db.run('DELETE FROM meals WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

app.listen(PORT, () => {
  console.log(`🍽️  FNA running on http://localhost:${PORT}`);
  console.log(`   Two-stage analysis: Haiku identify → USDA lookup → Haiku estimate`);
  if (!process.env.USDA_API_KEY) {
    console.log('⚠️  No USDA_API_KEY - all estimates via AI');
  } else {
    console.log('✓ USDA FoodData Central enabled');
  }
});
