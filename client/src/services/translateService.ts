import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory cache for instant session lookups without network latency
const memoryCache = new Map<string, string>();
const CACHE_PREFIX = '@vetgo_trans_v2_';

/**
 * Generate a cache key based on transcript hash and target language
 */
const getCacheKey = (text: string, targetLang: string): string => {
  let hash = 0;
  const str = `${targetLang}:${text.trim()}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `${CACHE_PREFIX}${targetLang}_${Math.abs(hash)}`;
};

/**
 * Clean HTML entity codes and unwanted escape sequences from API responses
 */
const decodeHTMLEntities = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
};

/**
 * Normalize language codes (e.g. 'hi-IN' -> 'hi', 'bn' -> 'bn')
 */
const normalizeLangCode = (lang: string): string => {
  if (!lang) return 'en';
  return lang.toLowerCase().split('-')[0];
};

/**
 * Primary Provider: Free Google Translate GTX Endpoint
 * Highly accurate neural machine translation for Indic & global languages (bn, hi, kn, mr, ta, te, en)
 */
const translateWithGoogleGTX = async (text: string, targetLang: string): Promise<string | null> => {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0]
        .map((segment: any) => (Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : ''))
        .join('');

      if (translated && translated.trim()) {
        return decodeHTMLEntities(translated);
      }
    }
    return null;
  } catch (err) {
    return null;
  }
};

/**
 * Secondary Provider: Lingva Open-Source Translation Proxy
 */
const translateWithLingva = async (text: string, targetLang: string): Promise<string | null> => {
  const mirrors = [
    `https://lingva.ml/api/v1/auto/${targetLang}/${encodeURIComponent(text)}`,
    `https://lingva.pussthecat.org/api/v1/auto/${targetLang}/${encodeURIComponent(text)}`
  ];

  for (const url of mirrors) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (response.ok) {
        const data = await response.json();
        if (data && data.translation) {
          return decodeHTMLEntities(data.translation);
        }
      }
    } catch {
      continue;
    }
  }
  return null;
};

/**
 * Tertiary Provider: MyMemory API (Filtered fallback with autodetect)
 */
const translateWithMyMemory = async (text: string, targetLang: string): Promise<string | null> => {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${targetLang}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (data && data.responseData && data.responseData.translatedText) {
      const translated = data.responseData.translatedText;
      if (
        typeof translated === 'string' &&
        !translated.startsWith('MYMEMORY WARNING') &&
        !translated.includes('QUERY LENGTH LIMIT EXCEEDED')
      ) {
        return decodeHTMLEntities(translated);
      }
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Split long transcripts into smaller chunks for safer translation requests
 */
const translateInChunks = async (text: string, targetLang: string): Promise<string> => {
  // Split by double line breaks or sentences if text is very long
  const chunks = text.split(/(\n+|\. )/).filter(Boolean);
  const results: string[] = [];

  for (const chunk of chunks) {
    if (chunk.trim().length === 0 || chunk === '\n' || chunk === '. ') {
      results.push(chunk);
      continue;
    }

    let translatedChunk = await translateWithGoogleGTX(chunk, targetLang);
    if (!translatedChunk) {
      translatedChunk = await translateWithLingva(chunk, targetLang);
    }
    if (!translatedChunk) {
      translatedChunk = await translateWithMyMemory(chunk, targetLang);
    }
    results.push(translatedChunk || chunk);
  }

  return results.join('');
};

/**
 * Main Dynamic Transcript Translation Function
 * Real-time translation engine with dual-layer caching and multi-tier engine waterfall.
 */
export const translateText = async (text: string, targetLang: string = 'en'): Promise<string> => {
  if (!text || !text.trim()) return text;

  const normLang = normalizeLangCode(targetLang);
  const trimmedText = text.trim();
  const cacheKey = getCacheKey(trimmedText, normLang);

  // 1. Instant check: In-memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // 2. Check persistent AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      memoryCache.set(cacheKey, cached);
      return cached;
    }
  } catch {
    // Proceed to network fetch if cache read fails
  }

  let finalTranslation: string | null = null;

  // Handle long transcripts (> 1000 characters) by chunking safely
  if (trimmedText.length > 1000) {
    finalTranslation = await translateInChunks(trimmedText, normLang);
  } else {
    // 3. Multi-tier waterfall fetch
    finalTranslation = await translateWithGoogleGTX(trimmedText, normLang);

    if (!finalTranslation) {
      finalTranslation = await translateWithLingva(trimmedText, normLang);
    }

    if (!finalTranslation) {
      finalTranslation = await translateWithMyMemory(trimmedText, normLang);
    }
  }

  const resultText = finalTranslation && finalTranslation.trim() ? finalTranslation : trimmedText;

  // 4. Save successful translation to both memory and AsyncStorage
  if (resultText !== trimmedText) {
    memoryCache.set(cacheKey, resultText);
    AsyncStorage.setItem(cacheKey, resultText).catch(() => {});
  }

  return resultText;
};

