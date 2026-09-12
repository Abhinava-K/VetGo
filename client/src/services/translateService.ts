import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory cache for instant session lookups without network latency
const memoryCache = new Map<string, string>();
const CACHE_PREFIX = '@vetgo_trans_v3_';

export interface TranslationResult {
  translatedText: string;
  detectedLang?: string;
  targetLang: string;
  isSameLanguage: boolean;
}

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
export const normalizeLangCode = (lang: string): string => {
  if (!lang) return 'en';
  return lang.toLowerCase().split('-')[0];
};

/**
 * Primary Provider: Google Translate GTX Endpoint
 */
const translateWithGoogleGTX = async (
  text: string, 
  targetLang: string
): Promise<{ text: string; detectedLang?: string } | null> => {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0]
        .map((segment: any) => (Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : ''))
        .join('');

      const detectedLang = typeof data[2] === 'string' ? data[2] : undefined;

      if (translated && translated.trim()) {
        return {
          text: decodeHTMLEntities(translated),
          detectedLang
        };
      }
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Secondary Provider: Google Dict-Chrome Endpoint (Clients5)
 */
const translateWithGoogleClients5 = async (
  text: string, 
  targetLang: string
): Promise<{ text: string; detectedLang?: string } | null> => {
  try {
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${targetLang}&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === 'string') {
      const translated = data[0][0];
      const detectedLang = typeof data[0][1] === 'string' ? data[0][1] : undefined;
      if (translated && translated.trim()) {
        return {
          text: decodeHTMLEntities(translated),
          detectedLang
        };
      }
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Tertiary Provider: Lingva Open-Source Translation Proxy
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
 * Quaternary Provider: MyMemory API (Filtered fallback with autodetect)
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
  const chunks = text.split(/(\n+|\. )/).filter(Boolean);
  const results: string[] = [];

  for (const chunk of chunks) {
    if (chunk.trim().length === 0 || chunk === '\n' || chunk === '. ') {
      results.push(chunk);
      continue;
    }

    const gtx = await translateWithGoogleGTX(chunk, targetLang);
    let translatedChunk = gtx?.text;
    if (!translatedChunk) {
      const c5 = await translateWithGoogleClients5(chunk, targetLang);
      translatedChunk = c5?.text;
    }
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
 * Comprehensive Dynamic Transcript Translation Function with Full Metadata
 */
export const translateTextDetailed = async (
  text: string, 
  targetLang: string = 'en'
): Promise<TranslationResult> => {
  if (!text || !text.trim()) {
    return {
      translatedText: text,
      targetLang,
      isSameLanguage: true
    };
  }

  const normLang = normalizeLangCode(targetLang);
  const trimmedText = text.trim();
  const cacheKey = getCacheKey(trimmedText, normLang);

  // 1. In-memory cache check
  if (memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey)!;
    return {
      translatedText: cached,
      targetLang: normLang,
      isSameLanguage: cached.toLowerCase() === trimmedText.toLowerCase()
    };
  }

  // 2. Persistent cache check
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      memoryCache.set(cacheKey, cached);
      return {
        translatedText: cached,
        targetLang: normLang,
        isSameLanguage: cached.toLowerCase() === trimmedText.toLowerCase()
      };
    }
  } catch {
    // Proceed to network fetch
  }

  let finalTranslation: string | null = null;
  let detectedLang: string | undefined = undefined;

  if (trimmedText.length > 1000) {
    finalTranslation = await translateInChunks(trimmedText, normLang);
  } else {
    // Primary: Google GTX
    const gtxRes = await translateWithGoogleGTX(trimmedText, normLang);
    if (gtxRes) {
      finalTranslation = gtxRes.text;
      detectedLang = gtxRes.detectedLang;
    }

    // Secondary: Google Clients5
    if (!finalTranslation) {
      const c5Res = await translateWithGoogleClients5(trimmedText, normLang);
      if (c5Res) {
        finalTranslation = c5Res.text;
        detectedLang = c5Res.detectedLang;
      }
    }

    // Tertiary: Lingva
    if (!finalTranslation) {
      finalTranslation = await translateWithLingva(trimmedText, normLang);
    }

    // Quaternary: MyMemory
    if (!finalTranslation) {
      finalTranslation = await translateWithMyMemory(trimmedText, normLang);
    }
  }

  const resultText = finalTranslation && finalTranslation.trim() ? finalTranslation : trimmedText;
  const isSameLanguage = resultText.toLowerCase() === trimmedText.toLowerCase();

  // Save to cache
  if (resultText !== trimmedText) {
    memoryCache.set(cacheKey, resultText);
    AsyncStorage.setItem(cacheKey, resultText).catch(() => {});
  }

  return {
    translatedText: resultText,
    detectedLang,
    targetLang: normLang,
    isSameLanguage
  };
};

/**
 * Simple string translation helper (backwards compatible)
 */
export const translateText = async (text: string, targetLang: string = 'en'): Promise<string> => {
  const result = await translateTextDetailed(text, targetLang);
  return result.translatedText;
};
