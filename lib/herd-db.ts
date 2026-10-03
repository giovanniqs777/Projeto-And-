import { getDb } from "@/db";

export function herdDb() {
  return getDb();
}

export function routeError(e: unknown) {
  console.error("Herd storage", e);
  // Drizzle wraps the driver error in a DrizzleQueryError; the Postgres error
  // (with the constraint name) is in `.cause`, not in the outer message.
  const message = [e, (e as { cause?: unknown })?.cause].map(String).join(" ");
  const isDuplicateTag =
    message.includes("cows_tag_unique") ||
    message.includes("duplicate key value") ||
    message.includes("UNIQUE");
  return Response.json(
    {
      error: isDuplicateTag
        ? "Esse brinco já está cadastrado."
        : "Não foi possível salvar ou carregar. Tente novamente.",
    },
    { status: 503 }
  );
}

export function safeWrite(r: Request) {
  const o = r.headers.get("origin");
  if (o && o !== new URL(r.url).origin) throw new Error("Origem inválida");
}
