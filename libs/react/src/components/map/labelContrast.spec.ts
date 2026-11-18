import { contrastRatio, parseHexColor, pickLabelTone } from './labelContrast';

describe('labelContrast', () => {
  it('parses short and long hex colours', () => {
    expect(parseHexColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHexColor('3b82f6')).toEqual({ r: 59, g: 130, b: 246 });
    expect(parseHexColor('red')).toBeNull();
  });

  it('measures WCAG contrast', () => {
    const white = { r: 255, g: 255, b: 255 };
    const black = { r: 0, g: 0, b: 0 };

    expect(contrastRatio(white, black)).toBeCloseTo(21, 0);
    expect(contrastRatio(black, white)).toBeCloseTo(21, 0);
  });

  it('puts dark labels on a pale floor plan, whatever the range colour', () => {
    const paper = { r: 240, g: 240, b: 240 };

    ['#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f59e0b'].forEach((color) => {
      expect(pickLabelTone(paper, parseHexColor(color))).toBe('dark');
    });
  });

  it('puts light labels on a dark background', () => {
    expect(
      pickLabelTone({ r: 30, g: 30, b: 30 }, parseHexColor('#3b82f6')),
    ).toBe('light');
    expect(pickLabelTone({ r: 20, g: 40, b: 90 }, null)).toBe('light');
  });
});
