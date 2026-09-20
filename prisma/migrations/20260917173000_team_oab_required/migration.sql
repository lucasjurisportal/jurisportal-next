-- Todo auxiliar ativo deve nascer com OAB. A OAB consome a cota comercial do plano.
-- Para bancos que chegaram a aplicar a primeira versão da equipe, tentamos recuperar
-- os dados já existentes em lawyer_oab antes de endurecer as colunas.
UPDATE "team_member_profile" AS profile
SET
  "oabState" = COALESCE(
    profile."oabState",
    (
      SELECT oab."state"
      FROM "lawyer_oab" AS oab
      WHERE oab."organizationId" = profile."organizationId"
        AND oab."userId" = profile."userId"
      ORDER BY oab."isActive" DESC, oab."createdAt" ASC
      LIMIT 1
    )
  ),
  "oabNumber" = COALESCE(
    profile."oabNumber",
    (
      SELECT oab."rawNumber"
      FROM "lawyer_oab" AS oab
      WHERE oab."organizationId" = profile."organizationId"
        AND oab."userId" = profile."userId"
      ORDER BY oab."isActive" DESC, oab."createdAt" ASC
      LIMIT 1
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "team_member_profile"
    WHERE "oabState" IS NULL
       OR BTRIM("oabState") = ''
       OR "oabNumber" IS NULL
       OR BTRIM("oabNumber") = ''
  ) THEN
    RAISE EXCEPTION 'Existem auxiliares sem OAB. Corrija os registros antes de concluir a migration de OAB obrigatoria.';
  END IF;
END $$;

ALTER TABLE "team_member_profile"
  ALTER COLUMN "oabState" SET NOT NULL,
  ALTER COLUMN "oabNumber" SET NOT NULL;

-- A tabela de equipe também é tenant-scoped e deve manter RLS como segunda barreira.
ALTER TABLE "team_member_profile" ENABLE ROW LEVEL SECURITY;
