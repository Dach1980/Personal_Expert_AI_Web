import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseTenantId } from '../src/services/tenant-selection';

test('keeps the preferred tenant only when it is an active membership', () => {
  const tenants = [{ id: 'tenant-a' }, { id: 'tenant-b' }];
  assert.equal(chooseTenantId(tenants, 'tenant-b'), 'tenant-b');
  assert.equal(chooseTenantId(tenants, 'tenant-outside-memberships'), 'tenant-a');
});

test('selects the first available membership when no preference exists', () => {
  assert.equal(chooseTenantId([{ id: 'tenant-a' }], null), 'tenant-a');
  assert.equal(chooseTenantId([], null), null);
});
