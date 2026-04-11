import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function useDirection() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const rtlLangs = ['fa', 'ur'];
    const dir = rtlLangs.includes(i18n.language) ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const rtlLangs = ['fa', 'ur'];
  return rtlLangs.includes(i18n.language) ? 'rtl' : 'ltr';
}
