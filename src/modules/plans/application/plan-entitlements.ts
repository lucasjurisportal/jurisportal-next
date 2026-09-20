import { planCatalog } from "../domain/plan.catalog";
import type { CapabilityKey, PlanDefinition, PlanSlug } from "../domain/plan.types";

export function getPlanBySlug(slug: PlanSlug): PlanDefinition {
  const plan = planCatalog.find((item) => item.slug === slug);
  if (!plan) throw new Error(`Plano não encontrado: ${slug}`);
  return plan;
}

export function hasCapability(plan: PlanDefinition, capability: CapabilityKey): boolean {
  return plan.capabilities.includes(capability);
}

export function planHasCapability(slug: PlanSlug, capability: CapabilityKey): boolean {
  return hasCapability(getPlanBySlug(slug), capability);
}

export function assertCapability(slug: PlanSlug, capability: CapabilityKey): void {
  if (!planHasCapability(slug, capability)) {
    throw new Error(`O plano ${slug} não possui a capacidade ${capability}.`);
  }
}
