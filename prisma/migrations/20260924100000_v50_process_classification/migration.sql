-- Campos aditivos: preservar classe e assunto existentes sem reclassificacao automatica.
-- Tipo/area e livre, informado pelo escritorio; outros assuntos conservam a fonte.
ALTER TABLE "process" ADD COLUMN "caseType" TEXT;
ALTER TABLE "process" ADD COLUMN "otherSubjects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
