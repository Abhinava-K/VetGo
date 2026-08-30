import React, { useState, useContext } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextStyle 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { translateText } from '../../services/translateService';
import { LANGUAGES, useTranslation } from '../../i18n';
import { ThemeContext } from '../../context/ThemeContext';

interface TranslatedTextProps {
  text: string;
  style?: TextStyle | TextStyle[];
  targetLang?: string;
}

export default function TranslatedText({ text, style, targetLang }: TranslatedTextProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useContext(ThemeContext);

  const [isTranslated, setIsTranslated] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeLangCode = targetLang || i18n.language || 'en';
  const activeLangObj = LANGUAGES.find(l => l.code === activeLangCode) || LANGUAGES[0];

  const handleToggleTranslate = async () => {
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }

    if (translatedContent) {
      setIsTranslated(true);
      return;
    }

    setLoading(true);
    try {
      const res = await translateText(text, activeLangCode);
      setTranslatedContent(res);
      setIsTranslated(true);
    } catch (err) {
      console.warn('Translation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!text) return null;

  return (
    <View style={styles.container}>
      <Text style={[style, isTranslated && styles.translatedTextHighlight]}>
        {isTranslated && translatedContent ? translatedContent : text}
      </Text>

      <TouchableOpacity 
        style={[styles.translateBtn, { backgroundColor: `${theme.primary}12`, borderColor: theme.primary }]}
        onPress={handleToggleTranslate}
        disabled={loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 5 }} />
        ) : (
          <Ionicons 
            name={isTranslated ? "refresh-outline" : "language-outline"} 
            size={14} 
            color={theme.primary} 
            style={{ marginRight: 4 }} 
          />
        )}
        <Text style={[styles.translateBtnText, { color: theme.primary }]}>
          {loading 
            ? (t('translating') || 'Translating...') 
            : isTranslated 
            ? (t('show_original') || 'Show Original') 
            : `${t('translate') || 'Translate'} (${activeLangObj.flag} ${activeLangObj.native})`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  translatedTextHighlight: {
    fontStyle: 'italic',
  },
  translateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  translateBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
