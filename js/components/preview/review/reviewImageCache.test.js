import { getReviewImage, rememberReviewImage } from './reviewImageCache';

describe('bounded review SVG cache', () => {
  it('reuses recent results, including failures, and evicts the least recently used result', () => {
    expect.hasAssertions();
    for (let index = 0; index < 128; index++) rememberReviewImage(`cache-${index}`, `<svg>${index}</svg>`);
    expect(getReviewImage('cache-0')).toBe('<svg>0</svg>');
    rememberReviewImage('unavailable', null);
    expect(getReviewImage('cache-1')).toBeUndefined();
    expect(getReviewImage('cache-0')).toBe('<svg>0</svg>');
    expect(getReviewImage('unavailable')).toBeNull();
  });
});
