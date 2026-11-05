export interface TenantOption {
  id: string;
}

export function chooseTenantId(
  tenants: readonly TenantOption[],
  preferredTenantId: string | null,
): string | null {
  return tenants.find((tenant) => tenant.id === preferredTenantId)?.id
    ?? tenants[0]?.id
    ?? null;
}
