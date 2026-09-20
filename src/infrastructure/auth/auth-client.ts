"use client";

import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

/**
 * Cliente de autenticação usado apenas no navegador.
 * A URL pode ser omitida porque frontend e backend usam o mesmo domínio.
 */
export const authClient = createAuthClient({
  plugins: [organizationClient()],
});
