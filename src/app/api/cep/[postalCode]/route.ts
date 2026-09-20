import { NextResponse } from "next/server";
import { digitsOnly } from "@/modules/clients/domain/tax-id";

export async function GET(_: Request, { params }: { params: Promise<{ postalCode: string }> }) {
  const { postalCode } = await params;
  const cep = digitsOnly(postalCode);
  if (cep.length !== 8) return NextResponse.json({ error: "INVALID_CEP" }, { status: 422 });

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { next: { revalidate: 86400 } });
    if (!response.ok) return NextResponse.json({ error: "CEP_PROVIDER_UNAVAILABLE" }, { status: 502 });
    const data = await response.json() as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
    if (data.erro) return NextResponse.json({ error: "CEP_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ street: data.logradouro ?? "", district: data.bairro ?? "", city: data.localidade ?? "", state: data.uf ?? "" });
  } catch (error) {
    console.error("[cep.lookup]", error);
    return NextResponse.json({ error: "CEP_PROVIDER_UNAVAILABLE" }, { status: 502 });
  }
}
