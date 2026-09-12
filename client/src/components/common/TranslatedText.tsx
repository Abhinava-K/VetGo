import React, { useState, useContext, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextStyle 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { translateTextDetailed, TranslationResult, normalizeLangCode } from '../../services/translateService';
import { LANGUAGES, useTranslation } from '../../i18n';
import { ThemeContext } from '../../context/ThemeContext';

interface TranslatedTextProps {
  text: string;
  style?: TextStyle | TextStyle[];
  targetLang?: string;
}

export default function TranslatedText({ text, style, targetLang }: TranslatedTextProps) {
  const { theme, isDark } = useContext(ThemeContext);
  const { i18n, t } = useTranslation();

  // Effective target language is the explicitly passed prop, or the user's chosen app language, or 'en'
  const activeLangCode = normalizeLangCode(targetLang || i18n.language || 'en');
  const targetLangObj = LANGUAGES.find(l => l.code === activeLangCode) || {
    code: activeLangCode,
    name: activeLangCode.toUpperCase(),
    native: activeLangCode,
    flag: '🌐'
  };

  const [isTranslated, setIsTranslated] = useState(false);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sameLangNotice, setSameLangNotice] = useState(false);

  // Reset translation if the text changes or active language changes
  useEffect(() => {
    setIsTranslated(false);
    setTranslationResult(null);
    setSameLangNotice(false);
  }, [text, activeLangCode]);

  const handleTranslate = async () => {
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }

    if (translationResult && translationResult.targetLang === activeLangCode && !translationResult.isSameLanguage) {
      setIsTranslated(true);
      return;
    }

    setLoading(true);
    setSameLangNotice(false);

    try {
      const res = await translateTextDetailed(text, activeLangCode);
      setTranslationResult(res);

      if (res.isSameLanguage) {
        setSameLangNotice(true);
        setIsTranslated(false);
      } else {
        setIsTranslated(true);
      }
    } catch (err) {
      console.warn(`Translation to ${activeLangCode} failed:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOriginal = () => {
    setIsTranslated(false);
    setSameLangNotice(false);
  };

  if (!text) return null;

  // Find detected source language name if available
  const detectedSourceCode = translationResult?.detectedLang ? normalizeLangCode(translationResult.detectedLang) : undefined;
  const detectedSourceObj = detectedSourceCode 
    ? LANGUAGES.find(l => l.code === detectedSourceCode) 
    : null;
  const sourceLabel = detectedSourceObj 
    ? `${detectedSourceObj.flag} ${detectedSourceObj.name}` 
    : detectedSourceCode ? detectedSourceCode.toUpperCase() : 'Original';

  return (
    <View style={styles.container}>
      {/* Text Container */}
      <View style={[
        styles.textWrapper,
        isTranslated && [
          styles.translatedBox,
          { 
            backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.06)',
            borderColor: theme.primary + '40'
          }
        ]
      ]}>
        <Text style={[style, isTranslated && styles.translatedTextHighlight]}>
          {isTranslated && translationResult ? translationResult.translatedText : text}
        </Text>

        {isTranslated && translationResult && (
          <View style={styles.translatedMetaBadge}>
            <Ionicons name="sparkles" size={13} color={theme.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.translatedMetaText, { color: theme.primary }]}>
              Translated to {targetLangObj.name} ({sourceLabel} ➔ {targetLangObj.flag} {targetLangObj.name})
            </Text>
          </View>
        )}
      </View>

      {/* Same Language Notice */}
      {sameLangNotice && (
        <View style={[styles.noticeBadge, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
          <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" style={{ marginRight: 4 }} />
          <Text style={[styles.noticeText, { color: theme.textSecondary }]}>
            Message is already in {targetLangObj.name}.
          </Text>
        </View>
      )}

      {/* Action Button: Translates to the active language chosen by the user */}
      <View style={styles.controlsRow}>
        {!isTranslated ? (
          <TouchableOpacity 
            style={[
              styles.primaryTranslateBtn, 
              { backgroundColor: `${theme.primary}12`, borderColor: theme.primary }
            ]}
            onPress={handleTranslate}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 6 }} />
            ) : (
              <Ionicons name="language-outline" size={15} color={theme.primary} style={{ marginRight: 6 }} />
            )}
            <Text style={[styles.translateBtnText, { color: theme.primary }]}>
              {loading ? `Translating to ${targetLangObj.name}...` : `🌐 Translate to ${targetLangObj.name}`}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[
              styles.showOriginalBtn, 
              { backgroundColor: isDark ? '#334155' : '#F3F4F6', borderColor: theme.border }
            ]}
            onPress={handleToggleOriginal}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-undo-outline" size={14} color={theme.text} style={{ marginRight: 4 }} />
            <Text style={[styles.showOriginalText, { color: theme.text }]}>
              Show Original
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  textWrapper: {
    paddingVertical: 2,
    borderRadius: 8,
  },
  translatedBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 2,
  },
  translatedTextHighlight: {
    lineHeight: 22,
  },
  translatedMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 4,
  },
  translatedMetaText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  noticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  noticeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryTranslateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  translateBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  showOriginalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  showOriginalText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
