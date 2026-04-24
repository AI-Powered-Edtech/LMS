import { describe, expect, it } from 'vitest'

import i18n from '../index'

describe('i18n scaffold', () => {
  it('defaults to Indonesian', () => {
    expect(i18n.language).toBe('id')
  })

  it('resolves common.save to Simpan in Indonesian', () => {
    expect(i18n.t('common.save')).toBe('Simpan')
  })

  it('resolves common.save to Save in English after changeLanguage', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('common.save')).toBe('Save')
    await i18n.changeLanguage('id')
  })

  it('falls back to id for unknown language', async () => {
    await i18n.changeLanguage('fr')
    expect(i18n.t('common.cancel')).toBe('Batal')
    await i18n.changeLanguage('id')
  })
})
