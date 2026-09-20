export type BillingCycle = "annual" | "monthly";

export type PlanSlug =
  | "free"
  | "essencial"
  | "estrategico"
  | "premium"
  | "executivo"
  | "alta-corte";

export type CapabilityKey =
  | "clients.basic"
  | "processes.basic"
  | "agenda.basic"
  | "tasks.basic"
  | "deadlines.manual"
  | "documents.basic"
  | "petitionTemplates.basic"
  | "finance.basic"
  | "djen.monitoring"
  | "notifications.email"
  | "publications.workflow"
  | "reports.basic"
  | "reports.advanced"
  | "team.members"
  | "team.activity"
  | "audit.full"
  | "ai.publicationSummary"
  | "ai.explicitDateExtraction"
  | "ai.clientUpdate"
  | "ai.managementSummary"
  | "communications.clientEmail"
  | "communications.whatsapp"
  | "calendar.google"
  | "processPortfolio.oabImport"
  | "processMonitoring.external"
  | "courtCredentials"
  | "courtDocuments";

export type FeatureReadiness = "launch" | "external" | "validation" | "future";

export type PlanLimit = number | "unlimited";

export type PlanPricing = {
  launchMonthly: number;
  standardMonthly: number;
  annualMonthsCharged: number;
};

export type InternalAiPolicy = {
  monthlyUnits: number;
};

export type PlanDefinition = {
  slug: PlanSlug;
  name: string;
  description: string;
  users: number;
  oabs: number;
  clientsLimit: PlanLimit;
  registeredProcessLimit: PlanLimit;
  monitoredProcessLimit: number;
  storageLimitGb: number;
  freeMonths?: number;
  featured?: boolean;
  inheritedFrom?: string;
  pricing: PlanPricing;
  capabilities: readonly CapabilityKey[];
  publicLaunchFeatures: readonly string[];
  internalAi: InternalAiPolicy;
};

export type CommercialPeriod = "launch" | "standard";
