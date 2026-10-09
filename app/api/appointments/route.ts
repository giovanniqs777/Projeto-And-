import { herdDb, safeWrite, routeError } from "@/lib/herd-db";
import { appointments, cows, calves } from "@/db/schema";
import { and, eq, gte, isNotNull, or, sql, asc } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";
import { appointmentSchema, agendaToday } from "@/lib/appointments";
import { z } from "zod";

export async function GET() {
  try {
    const db = herdDb();
    const [appointmentRows, animalRows] = await Promise.all([
      db
        .select({
          id: appointments.id,
          animalId: sql<string>`coalesce(${appointments.cowId}, ${appointments.calfId})`,
          animalType: sql<"cow" | "calf">`case when ${appointments.cowId} is not null then 'cow' else 'calf' end`,
          kind: appointments.kind,
          date: appointments.date,
          notes: appointments.notes,
          sourceKey: appointments.sourceKey,
          animalName: sql<string>`coalesce(${cows.name}, ${calves.name})`,
          tag: sql<string>`coalesce(${cows.tag}, ${calves.tag})`,
        })
        .from(appointments)
        .leftJoin(cows, eq(cows.id, appointments.cowId))
        .leftJoin(calves, eq(calves.id, appointments.calfId))
        .where(and(gte(appointments.date, agendaToday()), eq(appointments.status, "pending"), or(isNotNull(cows.id), isNotNull(calves.id))))
        .orderBy(appointments.date, appointments.id),
      unionAll(
        db
          .select({ id: cows.id, type: sql<"cow" | "calf">`'cow'`.as("type"), name: cows.name, tag: cows.tag })
          .from(cows)
          .where(sql`${cows.status} not in ('Vendida','Óbito')`),
        db.select({ id: calves.id, type: sql<"cow" | "calf">`'calf'`.as("type"), name: calves.name, tag: calves.tag }).from(calves)
      ).orderBy(asc(sql`name`), asc(sql`tag`)),
    ]);
    return Response.json({ appointments: appointmentRows, animals: animalRows }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return routeError(e);
  }
}

export async function POST(request: Request) {
  try {
    safeWrite(request);
    const payload = (await request.json()) as { type?: string; data?: unknown };
    const db = herdDb();

    if (payload.type === "delete-appointment" || payload.type === "complete-appointment") {
      const parsed = z.object({ id: z.string().uuid() }).safeParse(payload.data);
      if (!parsed.success) return Response.json({ error: "Compromisso inválido." }, { status: 400 });
      const updated = await db
        .update(appointments)
        .set({ status: payload.type === "delete-appointment" ? "deleted" : "completed" })
        .where(and(eq(appointments.id, parsed.data.id), eq(appointments.status, "pending")))
        .returning({ id: appointments.id });
      if (!updated.length) return Response.json({ error: "Compromisso não encontrado na lista de pendentes." }, { status: 404 });
      return Response.json({ id: parsed.data.id });
    }

    if (payload.type === "update-appointment") {
      const parsed = appointmentSchema.extend({ id: z.string().uuid() }).safeParse(payload.data);
      if (!parsed.success) return Response.json({ error: "Confira o animal, o compromisso e a data prevista." }, { status: 400 });
      const a = parsed.data;
      const current = (
        await db
          .select({ cowId: appointments.cowId, calfId: appointments.calfId, sourceKey: appointments.sourceKey })
          .from(appointments)
          .where(and(eq(appointments.id, a.id), eq(appointments.status, "pending")))
      )[0];
      if (!current) return Response.json({ error: "Compromisso não encontrado na lista de pendentes." }, { status: 404 });
      const autoCalving = current.sourceKey?.startsWith("calving:");
      if (autoCalving && (a.kind !== "Parto" || a.animalType !== "cow" || a.animalId !== current.cowId))
        return Response.json({ error: "O parto previsto está vinculado à vaca cadastrada." }, { status: 400 });
      if (!autoCalving && a.kind === "Parto") return Response.json({ error: "Informe o parto previsto na ficha da vaca." }, { status: 400 });
      const animal = (
        a.animalType === "cow"
          ? await db.select({ id: cows.id }).from(cows).where(eq(cows.id, a.animalId))
          : await db.select({ id: calves.id }).from(calves).where(eq(calves.id, a.animalId))
      )[0];
      if (!animal) return Response.json({ error: "Animal não encontrado. Atualize a página." }, { status: 404 });
      await db.transaction(async (tx) => {
        await tx
          .update(appointments)
          .set({ cowId: a.animalType === "cow" ? a.animalId : null, calfId: a.animalType === "calf" ? a.animalId : null, kind: a.kind, date: a.date, notes: a.notes })
          .where(and(eq(appointments.id, a.id), eq(appointments.status, "pending")));
        if (autoCalving) await tx.update(cows).set({ expectedCalving: a.date }).where(eq(cows.id, a.animalId));
      });
      return Response.json({ id: a.id });
    }

    const parsed = appointmentSchema.safeParse(payload.data);
    if (payload.type !== "appointment" || !parsed.success || parsed.data.kind === "Parto")
      return Response.json({ error: "Escolha o animal, o compromisso e uma data de hoje em diante." }, { status: 400 });
    const a = parsed.data;
    const animal = (
      a.animalType === "cow"
        ? await db.select({ id: cows.id }).from(cows).where(eq(cows.id, a.animalId))
        : await db.select({ id: calves.id }).from(calves).where(eq(calves.id, a.animalId))
    )[0];
    if (!animal) return Response.json({ error: "Animal não encontrado. Atualize a página." }, { status: 404 });
    const id = crypto.randomUUID();
    await db.insert(appointments).values({
      id,
      cowId: a.animalType === "cow" ? a.animalId : null,
      calfId: a.animalType === "calf" ? a.animalId : null,
      kind: a.kind,
      date: a.date,
      notes: a.notes,
    });
    return Response.json({ id });
  } catch (e) {
    return routeError(e);
  }
}
