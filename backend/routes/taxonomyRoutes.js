import express from 'express';
import { Taxonomy } from '../models/Taxonomy.js';
import { getConnectionStatus } from '../config/db.js';
import { getLocalTaxonomy } from '../services/dataLoader.js';

const router = express.Router();

/**
 * GET /api/taxonomy
 * Returns GATE CSE syllabus taxonomy and mistake taxonomy.
 */
router.get('/', async (req, res) => {
  try {
    const dbStatus = getConnectionStatus();

    if (dbStatus.isConnected) {
      const doc = await Taxonomy.findOne({ key: 'gate_cse_taxonomy' }).lean();
      if (doc && doc.taxonomy) {
        return res.json({
          success: true,
          source: 'mongodb',
          taxonomy: doc.taxonomy,
          mistakeCategories: doc.mistakeCategories,
        });
      }
    }

    // Fallback to local JSON
    const local = getLocalTaxonomy();
    return res.json({
      success: true,
      source: dbStatus.isConnected ? 'mongodb_empty_fallback' : 'fallback_json',
      taxonomy: local.taxonomy || [],
      mistakeCategories: local.mistakeCategories || [],
    });
  } catch (error) {
    console.error('[Taxonomy Route] GET / error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch taxonomy',
      details: error.message,
    });
  }
});

export default router;
