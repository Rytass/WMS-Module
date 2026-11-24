import fc from 'fast-check';
import {
  absQuantity,
  addQuantity,
  compareQuantity,
  fromBaseQuantity,
  isNegativeQuantity,
  isPositiveQuantity,
  isZeroQuantity,
  minQuantity,
  negateQuantity,
  quantitiesEqual,
  subtractQuantity,
  sumQuantities,
  toBaseQuantity,
  toQuantityNumber,
} from './quantity';

/** A quantity with up to three decimals, the grain real stock uses. */
const thousandths = fc
  .integer({ min: -9_999_999, max: 9_999_999 })
  .map((n) => n / 1000);

describe('quantity', () => {
  describe('the float defects of #227', () => {
    it('0.1 * 3 is 0.3', () => {
      expect(0.1 * 3).not.toBe(0.3);
      expect(toBaseQuantity(0.1, 3)).toBe(0.3);
    });

    it('0.1 + 0.2 + 0.3 does not depend on order', () => {
      const orders = [
        [0.1, 0.2, 0.3],
        [0.3, 0.2, 0.1],
        [0.2, 0.1, 0.3],
        [0.3, 0.1, 0.2],
      ];

      for (const order of orders) {
        expect(sumQuantities(order)).toBe(0.6);
      }
    });

    it('accumulating 0.1 does not drift', () => {
      const tenths = Array.from({ length: 10 }, () => 0.1);

      expect(tenths.reduce((s, v) => s + v, 0)).not.toBe(1);
      expect(sumQuantities(tenths)).toBe(1);
      expect(tenths.reduce<number>((s, v) => addQuantity(s, v), 0)).toBe(1);
    });

    it('three shipments of 0.1 add up to a reservation of 0.3', () => {
      const shipped = [0.1, 0.1, 0.1].reduce<number>(
        (s, v) => addQuantity(s, v),
        0,
      );

      expect(compareQuantity(shipped, 0.3)).toBe(0);
      expect(subtractQuantity(0.3, shipped)).toBe(0);
    });
  });

  describe('inputs', () => {
    it('reads the strings a numeric column returns', () => {
      expect(addQuantity('0.1', '0.2')).toBe(0.3);
      expect(sumQuantities(['0.1000', 0.2, '0.3'])).toBe(0.6);
      expect(toQuantityNumber('12.340')).toBe(12.34);
      expect(quantitiesEqual('0.50', 0.5)).toBe(true);
    });

    it('sums nothing to 0', () => {
      expect(sumQuantities([])).toBe(0);
    });

    it('rejects text that is not a number', () => {
      expect(() => addQuantity('abc', 1)).toThrow();
    });
  });

  describe('arithmetic helpers', () => {
    it('negates without leaving -0', () => {
      expect(Object.is(negateQuantity(0), 0)).toBe(true);
      expect(Object.is(negateQuantity('0'), 0)).toBe(true);
      expect(negateQuantity(0.3)).toBe(-0.3);
      expect(negateQuantity(-2)).toBe(2);
    });

    it('takes absolute values and minimums', () => {
      expect(absQuantity('-0.3')).toBe(0.3);
      expect(minQuantity(0.3, '0.1')).toBe(0.1);
    });

    it('classifies sign and zero', () => {
      expect(isZeroQuantity('0.000')).toBe(true);
      expect(isZeroQuantity(0.1 + 0.2 - 0.3)).toBe(false);
      expect(isPositiveQuantity(0.0001)).toBe(true);
      expect(isPositiveQuantity(0)).toBe(false);
      expect(isNegativeQuantity('-0.0001')).toBe(true);
    });

    it('compares as decimals', () => {
      expect(compareQuantity(0.1, 0.2)).toBe(-1);
      expect(compareQuantity('0.20', 0.2)).toBe(0);
      expect(compareQuantity(3, 2.999)).toBe(1);
    });
  });

  describe('base unit conversion', () => {
    it('converts a line quantity to base units and back', () => {
      expect(toBaseQuantity(0.1, 12)).toBe(1.2);
      expect(fromBaseQuantity(1.2, 12)).toBe(0.1);
      expect(toBaseQuantity('2.5', '0.1')).toBe(0.25);
    });

    it('refuses a zero conversion factor instead of returning Infinity', () => {
      expect(() => fromBaseQuantity(1, 0)).toThrow(RangeError);
    });
  });

  describe('properties', () => {
    it('addition is commutative', () => {
      fc.assert(
        fc.property(thousandths, thousandths, (a, b) => {
          expect(addQuantity(a, b)).toBe(addQuantity(b, a));
        }),
      );
    });

    it('addition is associative', () => {
      fc.assert(
        fc.property(thousandths, thousandths, thousandths, (a, b, c) => {
          expect(addQuantity(addQuantity(a, b), c)).toBe(
            addQuantity(a, addQuantity(b, c)),
          );
        }),
      );
    });

    it('a sum does not depend on the order of its terms', () => {
      fc.assert(
        fc.property(
          fc.array(thousandths, { maxLength: 30 }),
          fc.infiniteStream(fc.nat()),
          (values, randoms) => {
            const shuffled = [...values];
            const it = randoms[Symbol.iterator]();

            for (let i = shuffled.length - 1; i > 0; i -= 1) {
              const j = it.next().value % (i + 1);

              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            expect(sumQuantities(shuffled)).toBe(sumQuantities(values));
          },
        ),
      );
    });

    it('a sum equals the integer sum of its thousandths', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: -9_999_999, max: 9_999_999 }), {
            maxLength: 50,
          }),
          (ints) => {
            expect(sumQuantities(ints.map((n) => n / 1000))).toBe(
              ints.reduce((s, n) => s + n, 0) / 1000,
            );
          },
        ),
      );
    });

    it('subtracting what was added restores the start', () => {
      fc.assert(
        fc.property(thousandths, thousandths, (a, b) => {
          expect(subtractQuantity(addQuantity(a, b), b)).toBe(a);
        }),
      );
    });

    it('toBase then fromBase restores the quantity', () => {
      fc.assert(
        fc.property(
          thousandths,
          fc.integer({ min: 1, max: 100_000 }).map((n) => n / 100),
          (quantity, factor) => {
            expect(
              fromBaseQuantity(toBaseQuantity(quantity, factor), factor),
            ).toBe(quantity);
          },
        ),
      );
    });

    it('accumulating 0.1 n times gives n / 10', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 500 }), (n) => {
          const accumulated = Array.from({ length: n }).reduce<number>(
            (s) => addQuantity(s, 0.1),
            0,
          );

          expect(accumulated).toBe(n / 10);
          expect(sumQuantities(Array.from({ length: n }, () => 0.1))).toBe(
            n / 10,
          );
        }),
      );
    });

    it('splitting a quantity into parts and summing them gives it back', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 9_999_999 }),
          fc.integer({ min: 1, max: 20 }),
          (thousands, parts) => {
            const total = thousands / 1000;
            const part = Math.floor(thousands / parts) / 1000;
            const rest = subtractQuantity(
              total,
              sumQuantities(Array.from({ length: parts - 1 }, () => part)),
            );

            expect(
              sumQuantities([
                ...Array.from({ length: parts - 1 }, () => part),
                rest,
              ]),
            ).toBe(total);
          },
        ),
      );
    });

    it('negation flips the comparison', () => {
      fc.assert(
        fc.property(thousandths, thousandths, (a, b) => {
          expect(compareQuantity(a, b)).toBe(
            -compareQuantity(negateQuantity(a), negateQuantity(b)) || 0,
          );
        }),
      );
    });
  });
});
