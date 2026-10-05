import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate directories where JSON datasets may reside
const candidateDirs = [
  path.resolve(__dirname, '../data'),
  path.resolve(__dirname, '../../src/data/json'),
  path.resolve(process.cwd(), 'src/data/json'),
  path.resolve(process.cwd(), 'backend/data'),
];

/**
 * Locate and read a JSON file from candidate directories.
 */
export function loadJsonData(fileName) {
  for (const dir of candidateDirs) {
    const fullPath = path.join(dir, fileName);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        return JSON.parse(content);
      } catch (err) {
        console.error(`[DataLoader] Error parsing JSON at ${fullPath}:`, err.message);
      }
    }
  }
  console.warn(`[DataLoader] Warning: Could not locate ${fileName} in candidate paths:`, candidateDirs);
  return null;
}

/**
 * Load all questions (145 questions dataset)
 */
export function getLocalQuestions() {
  const data = loadJsonData('questions.json');
  return Array.isArray(data) ? data : [];
}

/**
 * Load all tests (39 tests dataset)
 */
export function getLocalTests() {
  const data = loadJsonData('tests.json');
  return Array.isArray(data) ? data : [];
}

/**
 * Load taxonomy and mistake categories
 */
export function getLocalTaxonomy() {
  return loadJsonData('taxonomy.json') || { taxonomy: [], mistakeCategories: [] };
}

export default {
  loadJsonData,
  getLocalQuestions,
  getLocalTests,
  getLocalTaxonomy,
};
