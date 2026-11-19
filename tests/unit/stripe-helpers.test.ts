import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  dollarsToCents,
  buildCheckoutLineItems,
  parseCheckoutMetadata,
  sanitizeReturnPath,
} from '../../app/lib/stripe-helpers.ts';

describe('dollarsToCents', () => {
  it('converts dollars cleanly to integer cents without floating-point drift', () => {
    assert.equal(dollarsToCents(150), 15000);
    assert.equal(dollarsToCents(19.99), 1999);
    assert.equal(dollarsToCents(0), 0);
  });

  it('rejects negative or non-finite values', () => {
    assert.throws(() => dollarsToCents(-5), /non-negative/);
    assert.throws(() => dollarsToCents(Number.NaN), /non-negative/);
  });
});

describe('buildCheckoutLineItems', () => {
  it('builds Stripe line items for production fee and optional add-ons', () => {
    const items = buildCheckoutLineItems({
      showTitle: 'The Wizard of Oz',
      studentName: 'Dorothy Gale',
      productionFeeDollars: 175.5,
      extraItems: [
        { name: 'Show T-Shirt', description: 'Youth M', amountDollars: 20, quantity: 2 },
        { name: 'Free Bonus', amountDollars: 0 }, // skipped
      ],
    });

    assert.equal(items.length, 2);
    assert.equal(items[0].price_data?.unit_amount, 17550);
    assert.equal(items[0].price_data?.product_data?.name, 'The Wizard of Oz — Production Fee');
    assert.match(items[0].price_data?.product_data?.description || '', /Dorothy Gale/);

    assert.equal(items[1].price_data?.unit_amount, 2000);
    assert.equal(items[1].quantity, 2);
  });

  it('throws when production fee is zero', () => {
    assert.throws(
      () =>
        buildCheckoutLineItems({
          showTitle: 'Free Show',
          studentName: 'Alex',
          productionFeeDollars: 0,
        }),
      /greater than \$0\.00/
    );
  });
});

describe('parseCheckoutMetadata', () => {
  it('parses valid tenant and audition metadata', () => {
    assert.deepEqual(
      parseCheckoutMetadata({
        tenant: 'cytfred',
        auditionId: '123',
        productionId: '94',
        studentId: '55',
      }),
      {
        tenant: 'cytfred',
        auditionId: 123,
        productionId: 94,
        studentId: 55,
      }
    );
  });

  it('returns null when required tenant or auditionId is missing or invalid', () => {
    assert.equal(parseCheckoutMetadata(null), null);
    assert.equal(parseCheckoutMetadata({ tenant: 'cytfred' }), null);
    assert.equal(parseCheckoutMetadata({ tenant: '', auditionId: '123' }), null);
    assert.equal(parseCheckoutMetadata({ tenant: 'cytfred', auditionId: 'abc' }), null);
    assert.equal(parseCheckoutMetadata({ tenant: 'cytfred', auditionId: '-1' }), null);
  });
});

describe('sanitizeReturnPath', () => {
  it('keeps safe relative paths and rejects open redirects', () => {
    assert.equal(sanitizeReturnPath('/settings'), '/settings');
    assert.equal(sanitizeReturnPath('https://evil.com'), '/');
    assert.equal(sanitizeReturnPath('//evil.com'), '/');
    assert.equal(sanitizeReturnPath(undefined), '/');
  });
});
