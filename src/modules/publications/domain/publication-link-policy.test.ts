import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicationProcessCnjMatch } from "./publication-link-policy";

test("permite vínculo quando a publicação não traz CNJ utilizável", () => {
  assert.doesNotThrow(() => assertPublicationProcessCnjMatch({ publicationCnjNormalized: null, processCnjNormalized: "12345678901234567890" }));
});

test("permite vínculo quando os CNJs coincidem", () => {
  assert.doesNotThrow(() => assertPublicationProcessCnjMatch({ publicationCnjNormalized: "12345678901234567890", processCnjNormalized: "12345678901234567890" }));
});

test("bloqueia vínculo manual em processo de CNJ diferente", () => {
  assert.throws(() => assertPublicationProcessCnjMatch({ publicationCnjNormalized: "12345678901234567890", processCnjNormalized: "99999999999999999999" }), /PUBLICATION_PROCESS_CNJ_MISMATCH/);
});
