import { expect, it } from 'vitest';
import { resolveSwipe } from './useSwipeNavigate';

const base = { startX: 200, dy: 0, viewportWidth: 390 };

it('左滑下一張、右滑上一張', () => {
  expect(resolveSwipe({ ...base, dx: -80 })).toBe('next');
  expect(resolveSwipe({ ...base, dx: 80 })).toBe('prev');
});

it('距離不足或垂直為主時不換字', () => {
  expect(resolveSwipe({ ...base, dx: -40 })).toBeNull();
  expect(resolveSwipe({ ...base, dx: -80, dy: 60 })).toBeNull();
  expect(resolveSwipe({ ...base, dx: -80, dy: -60 })).toBeNull();
  expect(resolveSwipe({ ...base, dx: -80, dy: 40 })).toBe('next');
});

it('避開 iOS 邊緣返回手勢的起點', () => {
  expect(resolveSwipe({ ...base, startX: 12, dx: 120 })).toBeNull();
  expect(resolveSwipe({ ...base, startX: 380, dx: -120 })).toBeNull();
  expect(resolveSwipe({ ...base, startX: 24, dx: 120 })).toBe('prev');
});
