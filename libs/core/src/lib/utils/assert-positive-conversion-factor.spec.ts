import { BadRequestException } from '@nestjs/common';
import { assertPositiveConversionFactor } from './assert-positive-conversion-factor';

describe('assertPositiveConversionFactor', () => {
  it.each([
    [12, 12],
    [0.5, 0.5],
    ['24', 24],
  ])('accepts %p and returns it as a number', (value, expected) => {
    expect(assertPositiveConversionFactor(value, 'BOX')).toBe(expected);
  });

  it.each([
    0,
    -3,
    '-1',
    '',
    'abc',
    Number.NaN,
    Number.POSITIVE_INFINITY,
    null,
    undefined,
    {},
  ])('refuses %p', (value) => {
    expect(() => assertPositiveConversionFactor(value, 'BOX')).toThrow(
      BadRequestException,
    );
  });

  it('names the unit and the value', () => {
    expect(() => assertPositiveConversionFactor(0, 'CASE')).toThrow(
      'conversionFactor of unit CASE must be a finite number greater than 0 (got 0)',
    );
  });
});
