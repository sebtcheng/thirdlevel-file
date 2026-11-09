import pool from '../config/db.js';

let oicSchemaReady = false;

const optionalColumnExpressionCache = new Map();

export const ensureOicColumn = async (client = pool) => {
  // Schema has already been permanently migrated in the database.
  // We stub this out to prevent massive schema locks on API cold starts.
  if (client === pool) oicSchemaReady = true;
  return;
};

export const sanitizeOicPosition = (positionTitle, existingIsOic = false) => {
  if (typeof positionTitle !== 'string') return { position_title: positionTitle, is_oic: !!existingIsOic };
  let cleaned = positionTitle.trim();
  let isOic = !!existingIsOic;

  const oicPrefixRegex = /^(OIC\s*-\s*|OIC\s+)/i;
  if (oicPrefixRegex.test(cleaned)) {
    isOic = true;
    cleaned = cleaned.replace(oicPrefixRegex, '').trim();
  }
  const oicSuffixRegex = /\s*\(?OIC\)?\s*$/i;
  if (oicSuffixRegex.test(cleaned)) {
    isOic = true;
    cleaned = cleaned.replace(oicSuffixRegex, '').trim();
  }

  const abbreviationMap = {
    'RD': 'Regional Director',
    'ARD': 'Assistant Regional Director',
    'SDS': 'Schools Division Superintendent',
    'ASDS': 'Assistant Schools Division Superintendent'
  };

  const upperCleaned = cleaned.toUpperCase();
  if (abbreviationMap[upperCleaned]) {
    cleaned = abbreviationMap[upperCleaned];
  } else if (abbreviationMap[cleaned]) {
    cleaned = abbreviationMap[cleaned];
  }

  return { position_title: cleaned, is_oic: isOic };
};

export const getPositionTitleVariants = (title) => {
  if (!title) return [];
  const map = {
    'RD': 'Regional Director',
    'Regional Director': 'RD',
    'ARD': 'Assistant Regional Director',
    'Assistant Regional Director': 'ARD',
    'SDS': 'Schools Division Superintendent',
    'Schools Division Superintendent': 'SDS',
    'ASDS': 'Assistant Schools Division Superintendent',
    'Assistant Schools Division Superintendent': 'ASDS'
  };
  const other = map[title] || map[title.trim()];
  return other ? [title, other] : [title];
};

const POSITION_TITLE_DISPLAY = {
  RD: 'Regional Director',
  ARD: 'Assistant Regional Director',
  SDS: 'Schools Division Superintendent',
  ASDS: 'Assistant Schools Division Superintendent'
};

export const THIRD_LEVEL_POSITIONS = [
  'Secretary',
  'Undersecretary',
  'Assistant Secretary',
  'Director IV',
  'Director III',
  'Regional Director',
  'Assistant Regional Director',
  'Schools Division Superintendent',
  'Assistant Schools Division Superintendent',
  'RD',
  'ARD',
  'SDS',
  'ASDS'
];

export const displayPositionTitle = (positionTitle) => (
  POSITION_TITLE_DISPLAY[positionTitle] || positionTitle
);

export const cleanDesignationOrPosition = (str) => {
  if (!str || typeof str !== 'string') return '';
  let cleaned = str.trim();
  if (!cleaned || cleaned.toUpperCase() === 'N/A' || cleaned.toUpperCase() === 'NONE' || cleaned === '-') {
    return '';
  }

  // 1. Remove footnotes / superscripts / special trailing symbols (¹, ², ³, *, #, etc.)
  cleaned = cleaned.replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰*#†‡]/g, '');

  // 2. Remove parenthetical status notes like (excess), (concurrent), etc.
  cleaned = cleaned.replace(/\s*\(\s*excess\s*\)/gi, '');
  cleaned = cleaned.replace(/\s*\(\s*concurrent\s*\)/gi, '');

  // 3. Normalize OIC prefixes
  cleaned = cleaned.replace(/^OIC\s*-\s*/i, 'OIC ');
  cleaned = cleaned.replace(/^OIC\s+/i, 'OIC ');

  // 4. Clean multiple whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 5. Proper Title Casing while preserving Acronyms & Roman Numerals
  const words = cleaned.split(' ');
  const romanOrAcronym = new Set([
    'OIC', 'RD', 'ARD', 'SDS', 'ASDS', 'CESO', 'DEPED', 'RO', 'SDO', 'CO',
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'
  ]);
  const lowerWords = new Set(['of', 'the', 'in', 'and', 'for', 'to', 'a', 'an']);

  const casedWords = words.map((w, idx) => {
    const hasParen = w.startsWith('(') && w.endsWith(')');
    const inner = hasParen ? w.slice(1, -1) : w;
    const innerUpper = inner.toUpperCase();

    if (romanOrAcronym.has(innerUpper)) {
      return hasParen ? `(${innerUpper})` : innerUpper;
    }
    if (idx > 0 && lowerWords.has(inner.toLowerCase()) && !hasParen) {
      return inner.toLowerCase();
    }
    const capitalized = inner.charAt(0).toUpperCase() + inner.slice(1).toLowerCase();
    return hasParen ? `(${capitalized})` : capitalized;
  });

  return casedWords.join(' ').trim();
};

export const STANDARD_DESIGNATIONS = [
  'Secretary',
  'Undersecretary',
  'Assistant Secretary',
  'Director IV',
  'Director III',
  'Regional Director',
  'Assistant Regional Director',
  'Schools Division Superintendent',
  'Assistant Schools Division Superintendent',
  'OIC Secretary',
  'OIC Undersecretary',
  'OIC Assistant Secretary',
  'OIC Director IV',
  'OIC Director III',
  'OIC Regional Director',
  'OIC Assistant Regional Director',
  'OIC Schools Division Superintendent',
  'OIC Assistant Schools Division Superintendent'
];

export const getOptionalColumnExpression = async (table, alias, columns, fallback = 'NULL::TEXT') => {
  const cacheKey = `${table}:${alias}:${columns.join(',')}`;
  if (optionalColumnExpressionCache.has(cacheKey)) {
    return optionalColumnExpressionCache.get(cacheKey);
  }

  const colsRes = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = $1
  `, [table]);
  const available = new Set(colsRes.rows.map(r => r.column_name.toLowerCase()));
  const column = columns.find(col => available.has(col));
  const expression = column ? `${alias}."${column}"::TEXT` : fallback;
  optionalColumnExpressionCache.set(cacheKey, expression);
  return expression;
};

// If compressBufferTo96Dpi is needed, it should be imported here.
// import { compressBufferTo96Dpi } from '../utils/pdfUtils.js'; // Example
