#!/usr/bin/env node

/**
 * Seed script for Forensic Nutrition PWA
 * Populates the SQLite database with 10 days of realistic dummy meal data
 *
 * Usage: node scripts/seed_db.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'nutrition.db');
const db = new sqlite3.Database(DB_PATH);

// Realistic meal templates with varying cuisines
const mealTemplates = [
  // Breakfast options
  {
    items: [
      { name: 'Scrambled Eggs', portion: '2 eggs', cuisine: 'American', category: 'simple', cal_low: 180, cal_high: 200, protein_g: 14, carbs_g: 2, sugar_g: 1, fat_g: 14, source: 'usda' },
      { name: 'Whole Wheat Toast', portion: '2 slices', cuisine: 'American', category: 'simple', cal_low: 140, cal_high: 160, protein_g: 6, carbs_g: 26, sugar_g: 4, fat_g: 2, source: 'usda' },
      { name: 'Orange Juice', portion: '8 oz', cuisine: null, category: 'simple', cal_low: 110, cal_high: 120, protein_g: 2, carbs_g: 26, sugar_g: 22, fat_g: 0, source: 'usda' }
    ],
    confidence: 'high',
    notes: '3 items from USDA database'
  },
  {
    items: [
      { name: 'Greek Yogurt with Berries', portion: '1 cup', cuisine: 'Mediterranean', category: 'simple', cal_low: 180, cal_high: 220, protein_g: 18, carbs_g: 20, sugar_g: 14, fat_g: 5, source: 'usda' },
      { name: 'Granola', portion: '1/2 cup', cuisine: null, category: 'simple', cal_low: 200, cal_high: 240, protein_g: 5, carbs_g: 40, sugar_g: 12, fat_g: 6, source: 'usda' }
    ],
    confidence: 'high',
    notes: '2 items from USDA database'
  },
  {
    items: [
      { name: 'Avocado Toast', portion: '2 slices', cuisine: 'American', category: 'complex', cal_low: 320, cal_high: 380, protein_g: 8, carbs_g: 30, sugar_g: 4, fat_g: 22, source: 'ai' },
      { name: 'Poached Egg', portion: '1 egg', cuisine: null, category: 'simple', cal_low: 70, cal_high: 80, protein_g: 6, carbs_g: 0, sugar_g: 0, fat_g: 5, source: 'usda' }
    ],
    confidence: 'medium',
    notes: '1 item from USDA, 1 AI estimate'
  },

  // Lunch options
  {
    items: [
      { name: 'Chicken Caesar Salad', portion: '1 large bowl', cuisine: 'Italian-American', category: 'complex', cal_low: 450, cal_high: 550, protein_g: 35, carbs_g: 18, sugar_g: 4, fat_g: 28, source: 'ai' }
    ],
    confidence: 'low',
    notes: 'AI estimate for composed salad'
  },
  {
    items: [
      { name: 'Pho Bo', portion: '1 large bowl', cuisine: 'Vietnamese', category: 'complex', cal_low: 400, cal_high: 520, protein_g: 28, carbs_g: 45, sugar_g: 3, fat_g: 12, source: 'ai' },
      { name: 'Thai Iced Tea', portion: '12 oz', cuisine: 'Thai', category: 'simple', cal_low: 180, cal_high: 220, protein_g: 2, carbs_g: 36, sugar_g: 32, fat_g: 4, source: 'ai' }
    ],
    confidence: 'low',
    notes: 'AI estimates for Vietnamese/Thai items'
  },
  {
    items: [
      { name: 'Turkey and Cheese Sandwich', portion: '1 sandwich', cuisine: 'American', category: 'complex', cal_low: 380, cal_high: 450, protein_g: 28, carbs_g: 35, sugar_g: 5, fat_g: 16, source: 'ai' },
      { name: 'Apple', portion: '1 medium', cuisine: null, category: 'simple', cal_low: 95, cal_high: 100, protein_g: 0, carbs_g: 25, sugar_g: 19, fat_g: 0, source: 'usda' },
      { name: 'Potato Chips', portion: '1 oz bag', cuisine: 'American', category: 'simple', cal_low: 150, cal_high: 160, protein_g: 2, carbs_g: 15, sugar_g: 0, fat_g: 10, source: 'usda' }
    ],
    confidence: 'medium',
    notes: '2 items from USDA, 1 AI estimate'
  },
  {
    items: [
      { name: 'Sushi Roll Combo', portion: '12 pieces', cuisine: 'Japanese', category: 'complex', cal_low: 480, cal_high: 600, protein_g: 22, carbs_g: 72, sugar_g: 8, fat_g: 12, source: 'ai' },
      { name: 'Miso Soup', portion: '1 cup', cuisine: 'Japanese', category: 'simple', cal_low: 40, cal_high: 60, protein_g: 3, carbs_g: 5, sugar_g: 2, fat_g: 1, source: 'ai' }
    ],
    confidence: 'low',
    notes: 'AI estimates for Japanese cuisine'
  },

  // Dinner options
  {
    items: [
      { name: 'Grilled Salmon', portion: '6 oz fillet', cuisine: null, category: 'simple', cal_low: 280, cal_high: 320, protein_g: 38, carbs_g: 0, sugar_g: 0, fat_g: 14, source: 'usda' },
      { name: 'Roasted Broccoli', portion: '1 cup', cuisine: null, category: 'simple', cal_low: 55, cal_high: 70, protein_g: 4, carbs_g: 10, sugar_g: 2, fat_g: 2, source: 'usda' },
      { name: 'Brown Rice', portion: '1 cup cooked', cuisine: null, category: 'simple', cal_low: 215, cal_high: 230, protein_g: 5, carbs_g: 45, sugar_g: 0, fat_g: 2, source: 'usda' }
    ],
    confidence: 'high',
    notes: '3 items from USDA database'
  },
  {
    items: [
      { name: 'Pad Thai', portion: '1 plate', cuisine: 'Thai', category: 'complex', cal_low: 550, cal_high: 700, protein_g: 22, carbs_g: 65, sugar_g: 12, fat_g: 24, source: 'ai' }
    ],
    confidence: 'low',
    notes: 'AI estimate for Thai street food'
  },
  {
    items: [
      { name: 'Carne Asada Tacos', portion: '3 tacos', cuisine: 'Mexican', category: 'complex', cal_low: 480, cal_high: 600, protein_g: 32, carbs_g: 42, sugar_g: 4, fat_g: 22, source: 'ai' },
      { name: 'Guacamole with Chips', portion: '1/2 cup', cuisine: 'Mexican', category: 'complex', cal_low: 280, cal_high: 350, protein_g: 4, carbs_g: 28, sugar_g: 2, fat_g: 20, source: 'ai' },
      { name: 'Horchata', portion: '12 oz', cuisine: 'Mexican', category: 'simple', cal_low: 150, cal_high: 200, protein_g: 2, carbs_g: 32, sugar_g: 26, fat_g: 3, source: 'ai' }
    ],
    confidence: 'low',
    notes: 'AI estimates for Mexican cuisine'
  },
  {
    items: [
      { name: 'Margherita Pizza', portion: '2 slices', cuisine: 'Italian', category: 'complex', cal_low: 400, cal_high: 480, protein_g: 16, carbs_g: 48, sugar_g: 6, fat_g: 16, source: 'ai' },
      { name: 'Mixed Green Salad', portion: '1 cup', cuisine: 'Italian', category: 'simple', cal_low: 80, cal_high: 120, protein_g: 2, carbs_g: 8, sugar_g: 4, fat_g: 6, source: 'ai' }
    ],
    confidence: 'medium',
    notes: '2 AI estimates for Italian items'
  },
  {
    items: [
      { name: 'Butter Chicken', portion: '1 cup', cuisine: 'Indian', category: 'complex', cal_low: 380, cal_high: 480, protein_g: 28, carbs_g: 14, sugar_g: 6, fat_g: 24, source: 'ai' },
      { name: 'Garlic Naan', portion: '1 piece', cuisine: 'Indian', category: 'simple', cal_low: 180, cal_high: 220, protein_g: 5, carbs_g: 32, sugar_g: 2, fat_g: 4, source: 'ai' },
      { name: 'Basmati Rice', portion: '1 cup', cuisine: 'Indian', category: 'simple', cal_low: 190, cal_high: 210, protein_g: 4, carbs_g: 44, sugar_g: 0, fat_g: 0, source: 'usda' }
    ],
    confidence: 'medium',
    notes: '1 USDA item, 2 AI estimates'
  },
  {
    items: [
      { name: 'Bibimbap', portion: '1 large bowl', cuisine: 'Korean', category: 'complex', cal_low: 520, cal_high: 650, protein_g: 24, carbs_g: 68, sugar_g: 8, fat_g: 18, source: 'ai' }
    ],
    confidence: 'low',
    notes: 'AI estimate for Korean mixed rice bowl'
  },

  // Snacks
  {
    items: [
      { name: 'Banana', portion: '1 medium', cuisine: null, category: 'simple', cal_low: 105, cal_high: 110, protein_g: 1, carbs_g: 27, sugar_g: 14, fat_g: 0, source: 'usda' },
      { name: 'Peanut Butter', portion: '2 tbsp', cuisine: null, category: 'simple', cal_low: 190, cal_high: 200, protein_g: 8, carbs_g: 6, sugar_g: 3, fat_g: 16, source: 'usda' }
    ],
    confidence: 'high',
    notes: '2 items from USDA database'
  },
  {
    items: [
      { name: 'Protein Shake', portion: '16 oz', cuisine: null, category: 'complex', cal_low: 220, cal_high: 280, protein_g: 30, carbs_g: 12, sugar_g: 6, fat_g: 6, source: 'ai' }
    ],
    confidence: 'low',
    notes: 'AI estimate for prepared shake'
  }
];

function calculateTotals(items) {
  return items.reduce((acc, item) => ({
    cal_low: acc.cal_low + (item.cal_low || 0),
    cal_high: acc.cal_high + (item.cal_high || 0),
    protein_g: acc.protein_g + (item.protein_g || 0),
    carbs_g: acc.carbs_g + (item.carbs_g || 0),
    sugar_g: acc.sugar_g + (item.sugar_g || 0),
    fat_g: acc.fat_g + (item.fat_g || 0)
  }), { cal_low: 0, cal_high: 0, protein_g: 0, carbs_g: 0, sugar_g: 0, fat_g: 0 });
}

function getRandomMeal(mealType) {
  let candidates;
  switch (mealType) {
    case 'breakfast':
      candidates = mealTemplates.slice(0, 3);
      break;
    case 'lunch':
      candidates = mealTemplates.slice(3, 7);
      break;
    case 'dinner':
      candidates = mealTemplates.slice(7, 13);
      break;
    case 'snack':
      candidates = mealTemplates.slice(13);
      break;
    default:
      candidates = mealTemplates;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function generateMealTimestamp(daysAgo, mealType) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  let hour, minute;
  switch (mealType) {
    case 'breakfast':
      hour = 7 + Math.floor(Math.random() * 2); // 7-8 AM
      minute = Math.floor(Math.random() * 60);
      break;
    case 'lunch':
      hour = 12 + Math.floor(Math.random() * 2); // 12-1 PM
      minute = Math.floor(Math.random() * 60);
      break;
    case 'dinner':
      hour = 18 + Math.floor(Math.random() * 2); // 6-7 PM
      minute = Math.floor(Math.random() * 60);
      break;
    case 'snack':
      hour = 15 + Math.floor(Math.random() * 2); // 3-4 PM
      minute = Math.floor(Math.random() * 60);
      break;
    default:
      hour = 12;
      minute = 0;
  }

  date.setHours(hour, minute, 0, 0);
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

async function seedDatabase() {
  console.log('🌱 Seeding Forensic Nutrition database...\n');

  // Ensure table exists
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

  const insertMeal = (timestamp, meal) => {
    return new Promise((resolve, reject) => {
      const totals = calculateTotals(meal.items);

      db.run(
        `INSERT INTO meals (timestamp, image_path, items, cal_low, cal_high, protein_g, carbs_g, sugar_g, fat_g, confidence, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          timestamp,
          null, // No image for seed data
          JSON.stringify(meal.items),
          totals.cal_low,
          totals.cal_high,
          totals.protein_g,
          totals.carbs_g,
          totals.sugar_g,
          totals.fat_g,
          meal.confidence,
          meal.notes
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  };

  let totalMeals = 0;
  const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'];

  // Generate 10 days of meals
  for (let day = 0; day < 10; day++) {
    console.log(`Day ${day + 1} (${day === 0 ? 'today' : day + ' days ago'}):`);

    // Each day has 2-4 meals
    const numMeals = 2 + Math.floor(Math.random() * 3);
    const dayMealTypes = mealTypes.slice(0, numMeals);

    for (const mealType of dayMealTypes) {
      const meal = getRandomMeal(mealType);
      const timestamp = generateMealTimestamp(day, mealType);

      try {
        const id = await insertMeal(timestamp, meal);
        const totals = calculateTotals(meal.items);
        console.log(`  ✓ ${mealType.padEnd(10)} | ${totals.cal_low}-${totals.cal_high} kcal | ${meal.items.length} items | ${meal.confidence} confidence`);
        totalMeals++;
      } catch (err) {
        console.error(`  ✗ Failed to insert ${mealType}:`, err.message);
      }
    }
    console.log('');
  }

  console.log(`\n✅ Seeded ${totalMeals} meals across 10 days`);
  console.log(`📁 Database: ${DB_PATH}`);

  db.close();
}

seedDatabase().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
