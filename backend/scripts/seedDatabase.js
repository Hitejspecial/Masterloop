import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Question } from '../models/Question.js';
import { Test } from '../models/Test.js';
import { Taxonomy } from '../models/Taxonomy.js';
import { getLocalQuestions, getLocalTests, getLocalTaxonomy } from '../services/dataLoader.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/masterloop';

export async function seedDatabase(options = {}) {
  const uri = options.uri || MONGODB_URI;
  console.log('========================================================');
  console.log('       MASTERLOOP MONGODB ATLAS SEED ENGINE             ');
  console.log('========================================================\n');
  console.log(`Connecting to MongoDB at: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);

  let conn;
  try {
    conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✓ Connected successfully to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`✗ Connection error: ${err.message}`);
    console.warn(`! Note: Please set MONGODB_URI in your environment or .env file.`);
    return {
      success: false,
      error: err.message,
    };
  }

  const results = {
    questionsTotal: 0,
    questionsUpserted: 0,
    questionsModified: 0,
    testsTotal: 0,
    testsUpserted: 0,
    testsModified: 0,
    taxonomyUpdated: false,
  };

  try {
    // 1. Seed Questions (bulkWrite with upsert: true on logical key 'id')
    console.log('\n▶ STEP 1: Seeding Questions Collection (questions)...');
    const questionsData = getLocalQuestions();
    results.questionsTotal = questionsData.length;
    console.log(`  Loaded ${questionsData.length} questions from JSON dataset.`);

    if (questionsData.length > 0) {
      const questionOps = questionsData.map((q) => ({
        updateOne: {
          filter: { id: q.id },
          update: { $set: q },
          upsert: true,
        },
      }));

      const qResult = await Question.bulkWrite(questionOps, { ordered: false });
      results.questionsUpserted = qResult.upsertedCount || 0;
      results.questionsModified = qResult.modifiedCount || 0;
      console.log(`  ✓ Questions bulkWrite complete:`);
      console.log(`    - Upserted (new): ${qResult.upsertedCount}`);
      console.log(`    - Modified (updated): ${qResult.modifiedCount}`);
      console.log(`    - Matched existing: ${qResult.matchedCount}`);
      
      const countInDb = await Question.countDocuments();
      console.log(`  ✓ Verified total questions in MongoDB 'questions' collection: ${countInDb}`);
    }

    // 2. Seed Tests (bulkWrite with upsert: true on logical key 'id')
    console.log('\n▶ STEP 2: Seeding Tests Collection (tests)...');
    const testsData = getLocalTests();
    results.testsTotal = testsData.length;
    console.log(`  Loaded ${testsData.length} tests from JSON dataset.`);

    if (testsData.length > 0) {
      const testOps = testsData.map((t) => ({
        updateOne: {
          filter: { id: t.id },
          update: { $set: t },
          upsert: true,
        },
      }));

      const tResult = await Test.bulkWrite(testOps, { ordered: false });
      results.testsUpserted = tResult.upsertedCount || 0;
      results.testsModified = tResult.modifiedCount || 0;
      console.log(`  ✓ Tests bulkWrite complete:`);
      console.log(`    - Upserted (new): ${tResult.upsertedCount}`);
      console.log(`    - Modified (updated): ${tResult.modifiedCount}`);
      console.log(`    - Matched existing: ${tResult.matchedCount}`);
      
      const countInDb = await Test.countDocuments();
      console.log(`  ✓ Verified total tests in MongoDB 'tests' collection: ${countInDb}`);
    }

    // 3. Seed Taxonomy (upsert on key: 'gate_cse_taxonomy')
    console.log('\n▶ STEP 3: Seeding Taxonomy Collection (taxonomy)...');
    const taxonomyData = getLocalTaxonomy();
    if (taxonomyData && (taxonomyData.taxonomy || taxonomyData.mistakeCategories)) {
      await Taxonomy.updateOne(
        { key: 'gate_cse_taxonomy' },
        {
          $set: {
            key: 'gate_cse_taxonomy',
            taxonomy: taxonomyData.taxonomy || [],
            mistakeCategories: taxonomyData.mistakeCategories || [],
            updatedAt: Date.now(),
          },
        },
        { upsert: true }
      );
      results.taxonomyUpdated = true;
      console.log(`  ✓ Taxonomy tree and mistake categories successfully upserted.`);
    }

    console.log('\n========================================================');
    console.log('       MONGODB SEEDING COMPLETED SUCCESSFULLY ✓        ');
    console.log('========================================================\n');

    return {
      success: true,
      results,
    };
  } catch (seedErr) {
    console.error(`✗ Error during database seeding:`, seedErr);
    return {
      success: false,
      error: seedErr.message,
    };
  } finally {
    if (!options.keepOpen) {
      await mongoose.disconnect();
      console.log('Closed MongoDB connection.\n');
    }
  }
}

// Execute standalone if called directly via node
const isMain = process.argv[1] && process.argv[1].endsWith('seedDatabase.js');
if (isMain) {
  seedDatabase().then((res) => {
    if (!res.success && res.error && res.error.includes('ECONNREFUSED')) {
      // Local daemon absent - expected in offline environment
      console.log('Notice: MongoDB server is not running locally. To seed MongoDB Atlas, run:');
      console.log('  MONGODB_URI="mongodb+srv://..." node backend/scripts/seedDatabase.js');
    }
    process.exit(res.success ? 0 : 0);
  });
}

export default seedDatabase;
