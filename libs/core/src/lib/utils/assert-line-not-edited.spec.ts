import { BadRequestException } from '@nestjs/common';
import { assertLineNotEdited } from './assert-line-not-edited';

describe('assertLineNotEdited', () => {
  it('passes a line named by its id alone, or with fields left undefined', () => {
    expect(() =>
      assertLineNotEdited({ id: 'l1' }, 'Hold inventory order', 'release()'),
    ).not.toThrow();
    expect(() =>
      assertLineNotEdited(
        { id: 'l1', targetHeldQuantity: undefined },
        'Hold inventory order',
        'release()',
      ),
    ).not.toThrow();
  });

  it('refuses a removal and names the reversal', () => {
    expect(() =>
      assertLineNotEdited(
        { id: 'l1', removedAt: new Date(), targetHeldQuantity: -1 },
        'Hold inventory order',
        'release()',
      ),
    ).toThrow(
      new BadRequestException(
        'Hold inventory order item l1 has already moved stock and cannot be removed (removedAt, targetHeldQuantity); use release() instead',
      ),
    );
  });

  it('refuses any other field, null included, as a change', () => {
    expect(() =>
      assertLineNotEdited(
        { id: 'l1', locationId: null },
        'Allocate inventory order',
        'deallocate()',
      ),
    ).toThrow(
      'Allocate inventory order item l1 has already moved stock and cannot be changed (locationId); use deallocate() instead',
    );
  });
});
