import { useTranslation } from 'react-i18next'

/**
 * Default-namespace wrapper around `useTranslation()` so call-sites can write
 * `const { t } = useT(); t('common.save')` without repeating namespace args.
 */
export function useT() {
  return useTranslation()
}

export default useT
