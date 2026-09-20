export const INTERNAL_ORGANIZATION_SLUG = "jurisportal-internal";

export function canPermanentlyDeleteProcess(input: {
  isPlatformMaster: boolean;
  organizationSlug: string;
}) {
  return input.isPlatformMaster && input.organizationSlug === INTERNAL_ORGANIZATION_SLUG;
}
