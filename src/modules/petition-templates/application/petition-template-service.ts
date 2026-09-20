import { prisma } from "@/infrastructure/database/prisma";
import { OFFICIAL_PETITION_TEMPLATES, getOfficialPetitionTemplate } from "../domain/official-templates";
import type { PetitionTemplateInput } from "../domain/petition-template.schema";
import { replacePetitionVariables } from "../domain/template-variables";

export async function listPetitionTemplates(input: {
  organizationId: string;
  query?: string;
  category?: string;
  origin?: "OFFICIAL" | "OFFICE";
  includeArchived?: boolean;
}) {
  const query = input.query?.trim().toLowerCase() ?? "";
  const category = input.category?.trim().toLowerCase() ?? "";

  const office = input.origin === "OFFICIAL" ? [] : await prisma.petitionTemplate.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.includeArchived ? {} : { status: "ACTIVE" }),
      ...(input.query?.trim() ? {
        OR: [
          { name: { contains: input.query.trim(), mode: "insensitive" } },
          { category: { contains: input.query.trim(), mode: "insensitive" } },
        ],
      } : {}),
      ...(input.category?.trim() ? { category: { equals: input.category.trim(), mode: "insensitive" } } : {}),
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      category: true,
      scope: true,
      status: true,
      currentVersion: true,
      updatedAt: true,
    },
  });

  const official = input.origin === "OFFICE" ? [] : OFFICIAL_PETITION_TEMPLATES.filter((template) => {
    const matchesQuery = !query || `${template.name} ${template.category} ${template.scope}`.toLowerCase().includes(query);
    const matchesCategory = !category || template.category.toLowerCase() === category;
    return matchesQuery && matchesCategory;
  });

  return { official, office };
}

export async function getPetitionTemplate(organizationId: string, templateId: string) {
  return prisma.petitionTemplate.findFirst({
    where: { id: templateId, organizationId },
    include: {
      versions: {
        orderBy: { version: "desc" },
        select: { id: true, version: true, name: true, category: true, scope: true, createdAt: true, createdBy: { select: { name: true } } },
      },
      createdBy: { select: { id: true, name: true } },
      updatedBy: { select: { id: true, name: true } },
    },
  });
}

export async function createPetitionTemplate(input: {
  organizationId: string;
  actorUserId: string;
  data: PetitionTemplateInput;
}) {
  return prisma.$transaction(async (tx) => {
    const template = await tx.petitionTemplate.create({
      data: {
        organizationId: input.organizationId,
        name: input.data.name,
        category: input.data.category,
        scope: input.data.scope,
        content: input.data.content,
        currentVersion: 1,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      },
    });

    await tx.petitionTemplateVersion.create({
      data: {
        organizationId: input.organizationId,
        templateId: template.id,
        version: 1,
        name: template.name,
        category: template.category,
        scope: template.scope,
        content: template.content,
        createdByUserId: input.actorUserId,
      },
    });

    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "petition_templates",
        action: "petition_template.created",
        entityType: "petition_template",
        entityId: template.id,
        metadata: { version: 1, name: template.name },
      },
    });

    return template;
  });
}

export async function updatePetitionTemplate(input: {
  organizationId: string;
  actorUserId: string;
  templateId: string;
  data: PetitionTemplateInput;
}) {
  const current = await prisma.petitionTemplate.findFirst({
    where: { id: input.templateId, organizationId: input.organizationId },
  });
  if (!current) throw new Error("PETITION_TEMPLATE_NOT_FOUND");
  if (current.status === "ARCHIVED") throw new Error("PETITION_TEMPLATE_ARCHIVED");

  const nextVersion = current.currentVersion + 1;
  return prisma.$transaction(async (tx) => {
    const updated = await tx.petitionTemplate.update({
      where: { id: current.id },
      data: {
        name: input.data.name,
        category: input.data.category,
        scope: input.data.scope,
        content: input.data.content,
        currentVersion: nextVersion,
        updatedByUserId: input.actorUserId,
      },
    });

    await tx.petitionTemplateVersion.create({
      data: {
        organizationId: input.organizationId,
        templateId: current.id,
        version: nextVersion,
        name: updated.name,
        category: updated.category,
        scope: updated.scope,
        content: updated.content,
        createdByUserId: input.actorUserId,
      },
    });

    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "petition_templates",
        action: "petition_template.updated",
        entityType: "petition_template",
        entityId: current.id,
        metadata: { previousVersion: current.currentVersion, version: nextVersion, name: updated.name },
      },
    });

    return updated;
  });
}

export async function setPetitionTemplateArchived(input: {
  organizationId: string;
  actorUserId: string;
  templateId: string;
  archived: boolean;
}) {
  const template = await prisma.petitionTemplate.findFirst({
    where: { id: input.templateId, organizationId: input.organizationId },
    select: { id: true, status: true, name: true },
  });
  if (!template) throw new Error("PETITION_TEMPLATE_NOT_FOUND");

  const nextStatus = input.archived ? "ARCHIVED" : "ACTIVE";
  if (template.status === nextStatus) return template;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.petitionTemplate.update({
      where: { id: template.id },
      data: { status: nextStatus, updatedByUserId: input.actorUserId },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "petition_templates",
        action: input.archived ? "petition_template.archived" : "petition_template.restored",
        entityType: "petition_template",
        entityId: template.id,
        metadata: { name: template.name },
      },
    });
    return updated;
  });
}

export async function getPetitionGenerationOptions(organizationId: string) {
  const [processes, clients] = await Promise.all([
    prisma.process.findMany({
      where: { organizationId, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
      take: 250,
      select: {
        id: true,
        internalCode: true,
        cnjFormatted: true,
        subject: true,
        clients: {
          orderBy: { isPrimary: "desc" },
          take: 1,
          select: { client: { select: { id: true, name: true, tradeName: true } } },
        },
      },
    }),
    prisma.client.findMany({
      where: { organizationId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      take: 500,
      select: { id: true, name: true, tradeName: true, taxIdRaw: true },
    }),
  ]);
  return { processes, clients };
}

function currentDatePtBr() {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

export async function generatePetitionDraft(input: {
  organizationId: string;
  organizationName: string;
  actorUserId: string;
  source: "OFFICIAL" | "OFFICE";
  templateId?: string;
  officialSlug?: string;
  processId?: string | null;
  clientId?: string | null;
}) {
  let templateId: string | null = null;
  let officialTemplateKey: string | null = null;
  let templateName: string;
  let templateVersion: number;
  let content: string;

  if (input.source === "OFFICIAL") {
    const official = getOfficialPetitionTemplate(input.officialSlug ?? "");
    if (!official) throw new Error("PETITION_TEMPLATE_NOT_FOUND");
    officialTemplateKey = official.slug;
    templateName = official.name;
    templateVersion = official.version;
    content = official.content;
  } else {
    const office = await prisma.petitionTemplate.findFirst({
      where: { id: input.templateId, organizationId: input.organizationId, status: "ACTIVE" },
    });
    if (!office) throw new Error("PETITION_TEMPLATE_NOT_FOUND");
    templateId = office.id;
    templateName = office.name;
    templateVersion = office.currentVersion;
    content = office.content;
  }

  const process = input.processId ? await prisma.process.findFirst({
    where: { id: input.processId, organizationId: input.organizationId },
    include: {
      clients: { orderBy: { isPrimary: "desc" }, include: { client: true } },
      parties: { orderBy: { createdAt: "asc" } },
    },
  }) : null;
  if (input.processId && !process) throw new Error("PROCESS_NOT_FOUND");

  let client = input.clientId ? await prisma.client.findFirst({
    where: { id: input.clientId, organizationId: input.organizationId },
  }) : null;
  if (input.clientId && !client) throw new Error("CLIENT_NOT_FOUND");

  if (process && client && !process.clients.some((link) => link.clientId === client?.id)) {
    throw new Error("PETITION_CLIENT_NOT_LINKED_TO_PROCESS");
  }
  if (!client && process) client = process.clients[0]?.client ?? null;

  const [oab, organizationProfile, user] = await Promise.all([
    prisma.lawyerOab.findFirst({
      where: { organizationId: input.organizationId, userId: input.actorUserId, isActive: true },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    }),
    prisma.organizationProfile.findUnique({ where: { organizationId: input.organizationId } }),
    prisma.user.findUnique({ where: { id: input.actorUserId }, select: { name: true } }),
  ]);

  const values: Record<string, string> = {
    "{{DATA_ATUAL}}": currentDatePtBr(),
    "{{ESCRITORIO_NOME}}": input.organizationName,
  };
  if (organizationProfile?.city) values["{{ESCRITORIO_CIDADE}}"] = organizationProfile.city;
  if (user?.name) values["{{ADVOGADO_NOME}}"] = user.name;
  if (oab) values["{{ADVOGADO_OAB}}"] = `${oab.state} ${oab.rawNumber}`;
  if (client) {
    values["{{CLIENTE_NOME}}"] = client.tradeName || client.name;
    values["{{CLIENTE_CPF_CNPJ}}"] = client.taxIdRaw;
  }
  if (process) {
    values["{{PROCESSO_NUMERO}}"] = process.cnjFormatted;
    values["{{PROCESSO_REFERENCIA}}"] = process.internalCode;
    if (process.division) values["{{PROCESSO_VARA}}"] = process.division;
    if (process.district) values["{{PROCESSO_COMARCA}}"] = process.district;
    if (process.processClass) values["{{PROCESSO_CLASSE}}"] = process.processClass;
    if (process.subject) values["{{PROCESSO_ASSUNTO}}"] = process.subject;
    if (process.parties[0]?.name) values["{{PARTE_CONTRARIA}}"] = process.parties[0].name;
  }

  const renderedContent = replacePetitionVariables(content, values);
  const unresolvedVariables = Array.from(new Set(renderedContent.match(/\{\{[A-Z0-9_]+\}\}/g) ?? []));

  const generation = await prisma.$transaction(async (tx) => {
    const created = await tx.petitionGeneration.create({
      data: {
        organizationId: input.organizationId,
        templateId,
        officialTemplateKey,
        templateSource: input.source,
        templateName,
        templateVersion,
        processId: process?.id ?? null,
        clientId: client?.id ?? null,
        renderedContent,
        generatedByUserId: input.actorUserId,
      },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "petition_templates",
        action: "petition_template.draft_generated",
        entityType: "petition_generation",
        entityId: created.id,
        metadata: {
          templateSource: input.source,
          templateId,
          officialTemplateKey,
          templateVersion,
          processId: process?.id ?? null,
          clientId: client?.id ?? null,
        },
      },
    });
    return created;
  });

  return { generation, renderedContent, unresolvedVariables, templateName, templateVersion };
}

export async function savePetitionGenerationFinalContent(input: {
  organizationId: string;
  actorUserId: string;
  generationId: string;
  content: string;
}) {
  const generation = await prisma.petitionGeneration.findFirst({
    where: { id: input.generationId, organizationId: input.organizationId },
    select: { id: true, templateName: true, finalContent: true },
  });
  if (!generation) throw new Error("PETITION_GENERATION_NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.petitionGeneration.update({
      where: { id: generation.id },
      data: { finalContent: input.content, lastEditedAt: new Date() },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "petition_templates",
        action: "petition_generation.final_content_saved",
        entityType: "petition_generation",
        entityId: generation.id,
        metadata: { templateName: generation.templateName, characterCount: input.content.length },
      },
    });
    return updated;
  });
}

export async function exportPetitionGeneration(input: {
  organizationId: string;
  actorUserId: string;
  generationId: string;
  content: string;
  contentHash: string;
}) {
  const generation = await prisma.petitionGeneration.findFirst({
    where: { id: input.generationId, organizationId: input.organizationId },
    select: { id: true, templateName: true, exportCount: true, processId: true, clientId: true },
  });
  if (!generation) throw new Error("PETITION_GENERATION_NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.petitionGeneration.update({
      where: { id: generation.id },
      data: {
        finalContent: input.content,
        lastEditedAt: new Date(),
        exportedAt: new Date(),
        exportCount: { increment: 1 },
      },
      select: { id: true, templateName: true, exportCount: true, exportedAt: true },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "petition_templates",
        action: "petition_generation.pdf_exported",
        entityType: "petition_generation",
        entityId: generation.id,
        metadata: {
          templateName: generation.templateName,
          processId: generation.processId,
          clientId: generation.clientId,
          contentHashSha256: input.contentHash,
          characterCount: input.content.length,
          exportNumber: generation.exportCount + 1,
          format: "PDF_A4",
        },
      },
    });
    return updated;
  });
}
