import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getLeftEdgeSwipeZoneWidth,
  isWithinLeftSwipeBackZone,
  shouldDismissHorizontalSwipe,
} from '../../hub/web/src/utils/gestures.ts'

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))

describe('chat swipe-back left-edge restriction', () => {
  it('computes a compact left-edge trigger zone proportional to viewport width', () => {
    assert.equal(getLeftEdgeSwipeZoneWidth(320), 48)
    assert.equal(getLeftEdgeSwipeZoneWidth(375), 53)
    assert.equal(getLeftEdgeSwipeZoneWidth(393), 55)
    assert.equal(getLeftEdgeSwipeZoneWidth(430), 60)
    assert.equal(getLeftEdgeSwipeZoneWidth(800), 72)
  })

  it('allows swipe-back only when touch starts within the left edge zone', () => {
    const width = 393
    const zone = getLeftEdgeSwipeZoneWidth(width)

    // Left edge starts are accepted (including slight bezel rounding down to -2px)
    assert.equal(isWithinLeftSwipeBackZone(-1, width), true)
    assert.equal(isWithinLeftSwipeBackZone(0, width), true)
    assert.equal(isWithinLeftSwipeBackZone(24, width), true)
    assert.equal(isWithinLeftSwipeBackZone(zone, width), true)

    // Middle, right half, and far-right edge starts are rejected
    assert.equal(isWithinLeftSwipeBackZone(zone + 1, width), false)
    assert.equal(isWithinLeftSwipeBackZone(120, width), false)
    assert.equal(isWithinLeftSwipeBackZone(200, width), false)
    assert.equal(isWithinLeftSwipeBackZone(width - 20, width), false)
    assert.equal(isWithinLeftSwipeBackZone(width - 2, width), false)
    assert.equal(isWithinLeftSwipeBackZone(Number.NaN, width), false)
  })

  it('only dismisses rightward horizontal swipes, never right-to-left swipes', () => {
    assert.equal(shouldDismissHorizontalSwipe({ dx: -150, dy: 4, width: 393, durationMs: 120 }), false)
    assert.equal(shouldDismissHorizontalSwipe({ dx: 0, dy: 0, width: 393, durationMs: 120 }), false)
    assert.equal(shouldDismissHorizontalSwipe({ dx: 130, dy: 12, width: 393, durationMs: 180 }), true)
  })

  it('ships left-edge-only swipe-back in the built web bundle', () => {
    const assetsDir = join(REPO_ROOT, 'hub/public/assets')
    const jsAssets = readdirSync(assetsDir).filter((name) => name.endsWith('.js'))
    assert.ok(jsAssets.length > 0, 'expected built JS bundle in hub/public/assets')
    const bundle = jsAssets.map((name) => readFileSync(join(assetsDir, name), 'utf8')).join('\n')

    assert.match(bundle, /function getLeftEdgeSwipeZoneWidth\(/)
    assert.match(bundle, /function isWithinLeftSwipeBackZone\(/)
    assert.match(bundle, /isWithinLeftSwipeBackZone\(startRelX,\s*width\)/)
    assert.doesNotMatch(bundle, /swipeDir\s*=\s*dx\s*>\s*0\s*\?\s*1\s*:\s*-1/)
  })
})
