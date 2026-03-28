import { describe, expect, it } from 'vitest'
import type { Variants } from 'motion/react'

import { staggerContainer, staggerItem, fadeIn } from '../animations'

describe('animations', () => {
  describe('staggerContainer', () => {
    it('harus export staggerContainer variant object', () => {
      expect(staggerContainer).toBeDefined()
      expect(typeof staggerContainer).toBe('object')
    })

    it('harus memiliki state "hidden" dengan opacity 0', () => {
      const hidden = staggerContainer.hidden as Record<string, number>
      expect(hidden.opacity).toBe(0)
    })

    it('harus memiliki state "show" dengan opacity 1', () => {
      const show = staggerContainer.show as Record<string, number | Record<string, number>>
      expect(show.opacity).toBe(1)
    })

    it('harus memiliki stagger animation dengan staggerChildren 0.06', () => {
      const show = staggerContainer.show as Record<string, unknown>
      const transition = show.transition as Record<string, number>
      expect(transition.staggerChildren).toBe(0.06)
    })

    it('harus tipe Variants dari motion/react', () => {
      const variant: Variants = staggerContainer
      expect(variant).toBeDefined()
    })
  })

  describe('staggerItem', () => {
    it('harus export staggerItem variant object', () => {
      expect(staggerItem).toBeDefined()
      expect(typeof staggerItem).toBe('object')
    })

    it('harus memiliki state "hidden" dengan opacity 0', () => {
      const hidden = staggerItem.hidden as Record<string, number>
      expect(hidden.opacity).toBe(0)
    })

    it('harus memiliki state "hidden" dengan y offset 12', () => {
      const hidden = staggerItem.hidden as Record<string, number>
      expect(hidden.y).toBe(12)
    })

    it('harus memiliki state "show" dengan opacity 1', () => {
      const show = staggerItem.show as Record<string, number | Record<string, unknown>>
      expect(show.opacity).toBe(1)
    })

    it('harus memiliki state "show" dengan y offset 0', () => {
      const show = staggerItem.show as Record<string, number | Record<string, unknown>>
      expect(show.y).toBe(0)
    })

    it('harus memiliki transition dengan duration 0.3', () => {
      const show = staggerItem.show as Record<string, unknown>
      const transition = show.transition as Record<string, number | string>
      expect(transition.duration).toBe(0.3)
    })

    it('harus memiliki transition dengan easing "easeOut"', () => {
      const show = staggerItem.show as Record<string, unknown>
      const transition = show.transition as Record<string, number | string>
      expect(transition.ease).toBe('easeOut')
    })

    it('harus tipe Variants dari motion/react', () => {
      const variant: Variants = staggerItem
      expect(variant).toBeDefined()
    })
  })

  describe('fadeIn', () => {
    it('harus export fadeIn variant object', () => {
      expect(fadeIn).toBeDefined()
      expect(typeof fadeIn).toBe('object')
    })

    it('harus memiliki state "hidden" dengan opacity 0', () => {
      const hidden = fadeIn.hidden as Record<string, number>
      expect(hidden.opacity).toBe(0)
    })

    it('harus memiliki state "show" dengan opacity 1', () => {
      const show = fadeIn.show as Record<string, number | Record<string, unknown>>
      expect(show.opacity).toBe(1)
    })

    it('harus memiliki transition dengan duration 0.2', () => {
      const show = fadeIn.show as Record<string, unknown>
      const transition = show.transition as Record<string, number>
      expect(transition.duration).toBe(0.2)
    })

    it('harus faster daripada staggerItem (0.2 vs 0.3)', () => {
      const staggerShowTransition = staggerItem.show as Record<string, unknown>
      const staggerDuration = (staggerShowTransition.transition as Record<string, number>)
        .duration
      const fadeShowTransition = fadeIn.show as Record<string, unknown>
      const fadeDuration = (fadeShowTransition.transition as Record<string, number>).duration
      expect(fadeDuration).toBeLessThan(staggerDuration)
    })

    it('harus tipe Variants dari motion/react', () => {
      const variant: Variants = fadeIn
      expect(variant).toBeDefined()
    })
  })

  describe('animation presets comparison', () => {
    it('staggerItem harus lebih lambat daripada fadeIn', () => {
      const staggerTrans = staggerItem.show as Record<string, unknown>
      const staggerDur = (staggerTrans.transition as Record<string, number>).duration
      const fadeTrans = fadeIn.show as Record<string, unknown>
      const fadeDur = (fadeTrans.transition as Record<string, number>).duration
      expect(staggerDur).toBeGreaterThan(fadeDur)
    })

    it('fadeIn harus tidak memiliki y offset', () => {
      const hidden = fadeIn.hidden as Record<string, number | undefined>
      const show = fadeIn.show as Record<string, number | undefined>
      expect(hidden.y).toBeUndefined()
      expect(show.y).toBeUndefined()
    })

    it('staggerItem harus memiliki y offset animation', () => {
      const hidden = staggerItem.hidden as Record<string, number>
      const show = staggerItem.show as Record<string, number>
      expect(hidden.y).toBe(12)
      expect(show.y).toBe(0)
    })
  })
})
