import { positionKey } from './position-key';

describe('positionKey', () => {
  it('joins material, batch, location and loader with a pipe', () => {
    expect(
      positionKey({
        materialId: 'm',
        batchId: 'b',
        locationId: 'l',
        loaderId: 'r',
      }),
    ).toBe('m|b|l|r');
  });

  it('writes a missing location or loader as the empty string', () => {
    expect(
      positionKey({
        materialId: 'm',
        batchId: 'b',
        locationId: null,
        loaderId: null,
      }),
    ).toBe('m|b||');
  });

  it('keeps "no loader" distinct from "no location"', () => {
    const noLoader = positionKey({
      materialId: 'm',
      batchId: 'b',
      locationId: 'x',
      loaderId: null,
    });
    const noLocation = positionKey({
      materialId: 'm',
      batchId: 'b',
      locationId: null,
      loaderId: 'x',
    });

    expect(noLoader).not.toBe(noLocation);
  });
});
