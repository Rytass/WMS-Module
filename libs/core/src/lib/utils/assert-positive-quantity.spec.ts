import { BadRequestException } from '@nestjs/common';
import {
  assertPositiveQuantity,
  assertPositiveQuantityIfPresent,
} from './assert-positive-quantity';

describe('assertPositiveQuantity', () => {
  it.each([1, 0.1, '2', '0.5'])('accepts %p', (value) => {
    expect(() => assertPositiveQuantity(value, 'quantity')).not.toThrow();
  });

  it.each([
    null,
    undefined,
    0,
    -1,
    '-3',
    Number.NaN,
    Number.POSITIVE_INFINITY,
    'abc',
  ])('refuses %p', (value) => {
    expect(() => assertPositiveQuantity(value, 'quantity')).toThrow(
      BadRequestException,
    );
  });

  it('names the field and the value without a context', () => {
    expect(() => assertPositiveQuantity(-5, 'targetShippedQuantity')).toThrow(
      'targetShippedQuantity must be a number greater than 0 (got -5)',
    );
  });

  it('appends the context when one is given', () => {
    expect(() => assertPositiveQuantity(0, 'quantity', 'item #2')).toThrow(
      'quantity must be a number greater than 0 (got 0, item #2)',
    );
  });
});

describe('assertPositiveQuantityIfPresent', () => {
  it('allows an absent value', () => {
    expect(() =>
      assertPositiveQuantityIfPresent(undefined, 'quantity'),
    ).not.toThrow();
  });

  it('checks a present value', () => {
    expect(() => assertPositiveQuantityIfPresent(3, 'quantity')).not.toThrow();
    expect(() => assertPositiveQuantityIfPresent(null, 'quantity')).toThrow(
      BadRequestException,
    );
  });
});
