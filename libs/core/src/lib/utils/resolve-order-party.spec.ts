import { BadRequestException } from '@nestjs/common';
import { resolveOrderParty } from './resolve-order-party';

describe('resolveOrderParty', () => {
  it('takes the requested party when the order has no lines yet', () => {
    expect(resolveOrderParty('vendorId', 'V', [], 'o')).toBe('V');
  });

  it('falls back to the party the existing lines carry', () => {
    expect(resolveOrderParty('vendorId', undefined, [null, 'V'], 'o')).toBe(
      'V',
    );
  });

  it('accepts a request that names the same party', () => {
    expect(resolveOrderParty('vendorId', 'V', ['V'], 'o')).toBe('V');
  });

  it('returns null when neither side names one', () => {
    expect(resolveOrderParty('vendorId', null, [undefined], 'o')).toBeNull();
  });

  it('refuses switching to another party', () => {
    expect(() => resolveOrderParty('customerId', 'B', ['A'], 'o1')).toThrow(
      new BadRequestException(
        'Order o1 already moved stock for customerId A and cannot switch to B',
      ),
    );
  });
});
