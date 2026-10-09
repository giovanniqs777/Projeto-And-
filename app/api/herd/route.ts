import { herdDb, routeError, safeWrite } from "@/lib/herd-db";
import { cows, events, appSettings, appointments } from "@/db/schema";
import { calves as calvesTable } from "@/db/schema";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { hashDeletionPassword, verifyDeletionPassword } from "@/lib/deletion-password";
import { z } from "zod";

const deletionPassword = z.string().min(6).max(128);
const optionalDate = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).default("");
const optionalNumber = (integer = false) =>
  z
    .string()
    .default("")
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0 && (!integer || Number.isInteger(Number(v)))));
const milkVolume = z.number().min(0).max(500).nullable().optional();
const totalMilk = (morning: number | null | undefined, afternoon: number | null | undefined) =>
  Math.round(((morning ?? 0) + (afternoon ?? 0)) * 100) / 100;
const frame = z
  .object({ zoom: z.number().min(1).max(4), x: z.number().min(0).max(100), y: z.number().min(0).max(100), fit: z.enum(["contain", "cover"]) })
  .default({ zoom: 1, x: 50, y: 50, fit: "contain" });
function readFrame(value: unknown) {
  try {
    return frame.parse(value ? JSON.parse(String(value)) : undefined);
  } catch {
    return { zoom: 1, x: 50, y: 50, fit: "contain" as const };
  }
}
const cow = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(100),
    tag: z.string().trim().min(1).max(50),
    breed: z.string().min(1).max(80),
    birth: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
    status: z.enum(["Lactante", "Prenha", "Em lactação", "Seca", "Novilha", "Vendida", "Óbito"]),
    father: z.string().max(200),
    mother: z.string().max(200),
    notes: z.string().max(5000),
    photo: z.string().regex(/^(\/api\/photos\/[a-f0-9-]+)?$/),
    bodyPhoto: z.string().regex(/^(\/api\/photos\/[a-f0-9-]+)?$/).default(""),
    milkProduction: optionalNumber(),
    calvings: optionalNumber(true),
    lastCalving: optionalDate,
    insemination: optionalDate,
    expectedCalving: optionalDate,
    lastExam: optionalDate,
    examResult: z.string().max(5000).default(""),
    medicine: z.string().max(5000).default(""),
    medicineDate: optionalDate,
    age: z.string().max(100).default(""),
    feedConsumption: optionalNumber(),
    dryOffDate: optionalDate,
    photoFrame: frame,
    bodyFrame: frame,
    milkMorning: optionalNumber().refine((v) => v === "" || Number(v) <= 500),
    milkAfternoon: optionalNumber().refine((v) => v === "" || Number(v) <= 500),
    dailyMilk: optionalNumber().refine((v) => v === "" || Number(v) <= 500),
    productionDate: optionalDate,
    productionNotes: z.string().max(5000).default(""),
    ultrasoundDate: optionalDate,
    ultrasoundResult: z.enum(["", "Prenha", "Vazia"]).default(""),
  })
  .refine((c) => Boolean(c.ultrasoundDate) === Boolean(c.ultrasoundResult), { message: "Informe data e resultado do ultrassom" });
const evt = z
  .object({
    id: z.string().uuid().optional(),
    cowId: z.string().uuid(),
    kind: z.enum(["Produção", "Inseminação", "Diagnóstico de gestação", "Ultrassom", "Parto", "Vacina", "Exame", "Tratamento", "Observação"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    value: z.number().min(0).max(500).nullable(),
    morning: milkVolume,
    afternoon: milkVolume,
    result: z.enum(["", "Prenha", "Vazia"]).default(""),
    notes: z.string().max(5000),
    due: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
    withdrawal: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  })
  .refine((x) => x.kind !== "Produção" || x.morning != null || x.afternoon != null || (x.morning === undefined && x.afternoon === undefined && x.value !== null), {
    message: "Informe os litros de leite",
  })
  .refine((e) => e.kind !== "Ultrassom" || ["Prenha", "Vazia"].includes(e.result), { message: "Selecione o resultado do ultrassom" });

export async function GET() {
  try {
    const db = herdDb();
    const [cowRows, eventRows, passwordRows, calfCountRows] = await Promise.all([
      db.select().from(cows).orderBy(cows.name),
      db
        .select({
          id: events.id,
          cowId: events.cowId,
          kind: events.kind,
          date: events.date,
          value: events.value,
          morning: events.morning,
          afternoon: events.afternoon,
          notes: events.notes,
          due: events.due,
          withdrawal: events.withdrawal,
          result: events.result,
        })
        .from(events)
        .orderBy(desc(events.date), events.id),
      db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, "cow_deletion_password")),
      db.select({ count: count() }).from(calvesTable),
    ]);
    return Response.json(
      {
        cows: cowRows.map((c) => ({ ...c, photoFrame: readFrame(c.photoFrame), bodyFrame: readFrame(c.bodyFrame) })),
        events: eventRows,
        hasDeletionPassword: passwordRows.length > 0,
        calfCount: calfCountRows[0]?.count ?? 0,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return routeError(e);
  }
}

export async function POST(r: Request) {
  try {
    safeWrite(r);
    const p = (await r.json()) as { type?: string; data?: unknown };
    const db = herdDb();

    if (p.type === "set-deletion-password") {
      const v = z.object({ password: deletionPassword }).safeParse(p.data);
      if (!v.success) return Response.json({ error: "Use uma senha de 6 a 128 caracteres." }, { status: 400 });
      const hashed = await hashDeletionPassword(v.data.password);
      const inserted = await db
        .insert(appSettings)
        .values({ key: "cow_deletion_password", value: hashed })
        .onConflictDoNothing({ target: appSettings.key })
        .returning({ key: appSettings.key });
      if (!inserted.length) return Response.json({ error: "A senha de exclusão já foi criada." }, { status: 409 });
      return Response.json({ hasDeletionPassword: true });
    }

    if (p.type === "delete-cow" || p.type === "delete-production" || p.type === "delete-ultrasound") {
      const v = z.object({ id: z.string().uuid(), password: z.string().max(128).optional() }).safeParse(p.data);
      if (!v.success) return Response.json({ error: "Registro inválido." }, { status: 400 });
      if (p.type === "delete-cow") {
        const configured = (await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, "cow_deletion_password")))[0];
        if (!configured) return Response.json({ error: "Crie a senha de exclusão antes de excluir uma vaca." }, { status: 409 });
        if (!v.data.password || !(await verifyDeletionPassword(v.data.password, configured.value)))
          return Response.json({ error: "Senha incorreta. O cadastro não foi excluído." }, { status: 403 });
        await db.transaction(async (tx) => {
          await tx.delete(events).where(eq(events.cowId, v.data.id));
          await tx.delete(cows).where(eq(cows.id, v.data.id));
        });
      } else {
        await db.delete(events).where(and(eq(events.id, v.data.id), eq(events.kind, p.type === "delete-ultrasound" ? "Ultrassom" : "Produção")));
      }
      return Response.json({ deleted: true });
    }

    if (p.type === "cow") {
      const v = cow.safeParse(p.data);
      if (!v.success) return Response.json({ error: "Confira os campos do cadastro." }, { status: 400 });
      const c = v.data;
      const id = c.id || crypto.randomUUID();
      const hasShifts = c.milkMorning !== "" || c.milkAfternoon !== "";
      const hasMilk = hasShifts || c.dailyMilk !== "";
      if (hasMilk && !c.productionDate) return Response.json({ error: "Informe a data da produção." }, { status: 400 });

      const row = {
        id,
        name: c.name,
        tag: c.tag,
        breed: c.breed,
        birth: c.birth,
        status: c.status,
        father: c.father,
        mother: c.mother,
        notes: c.notes,
        photo: c.photo,
        bodyPhoto: c.bodyPhoto,
        milkProduction: c.milkProduction,
        calvings: c.calvings,
        lastCalving: c.lastCalving,
        insemination: c.insemination,
        expectedCalving: c.expectedCalving,
        lastExam: c.lastExam,
        examResult: c.examResult,
        medicine: c.medicine,
        medicineDate: c.medicineDate,
        age: c.age,
        photoFrame: JSON.stringify(c.photoFrame),
        bodyFrame: JSON.stringify(c.bodyFrame),
        feedConsumption: c.feedConsumption,
        dryOffDate: c.dryOffDate,
      };
      const { id: _id, ...update } = row;
      const calvingKey = `calving:${id}`;

      await db.transaction(async (tx) => {
        await tx.insert(cows).values(row).onConflictDoUpdate({ target: cows.id, set: update });

        if (c.expectedCalving) {
          await tx
            .insert(appointments)
            .values({ id: crypto.randomUUID(), cowId: id, kind: "Parto", date: c.expectedCalving, notes: "Data provável do parto", sourceKey: calvingKey })
            .onConflictDoUpdate({
              target: appointments.sourceKey,
              set: {
                date: sql`excluded.date`,
                status: sql`case when ${appointments.date} <> excluded.date then 'pending' else ${appointments.status} end`,
              },
            });
        } else {
          await tx.delete(appointments).where(eq(appointments.sourceKey, calvingKey));
        }

        if (hasMilk) {
          const morning = c.milkMorning === "" ? null : Number(c.milkMorning);
          const afternoon = c.milkAfternoon === "" ? null : Number(c.milkAfternoon);
          await tx.insert(events).values({
            id: crypto.randomUUID(),
            cowId: id,
            kind: "Produção",
            date: c.productionDate,
            value: hasShifts ? totalMilk(morning, afternoon) : Number(c.dailyMilk),
            morning,
            afternoon,
            notes: c.productionNotes,
            due: "",
            withdrawal: "",
          });
        }
        if (c.ultrasoundDate) {
          await tx.insert(events).values({
            id: crypto.randomUUID(),
            cowId: id,
            kind: "Ultrassom",
            date: c.ultrasoundDate,
            value: null,
            notes: "",
            due: "",
            withdrawal: "",
            result: c.ultrasoundResult,
          });
        }
      });
      return Response.json({ id });
    }

    const v = evt.safeParse(p.data);
    if (p.type === "update-ultrasound") {
      if (!v.success || !v.data.id || v.data.kind !== "Ultrassom") return Response.json({ error: "Confira o registro de ultrassom." }, { status: 400 });
      const e = v.data;
      const updated = await db
        .update(events)
        .set({ date: e.date, result: e.result, notes: e.notes, due: e.due, withdrawal: e.withdrawal })
        .where(and(eq(events.id, e.id!), eq(events.cowId, e.cowId), eq(events.kind, "Ultrassom")))
        .returning({ id: events.id });
      if (!updated.length) return Response.json({ error: "Ultrassom não encontrado. Atualize a página." }, { status: 404 });
      return Response.json({ id: e.id });
    }
    if (p.type === "update-production") {
      if (!v.success || !v.data.id || v.data.kind !== "Produção" || (v.data.morning == null && v.data.afternoon == null))
        return Response.json({ error: "Informe os volumes da produção." }, { status: 400 });
      const e = v.data;
      const updated = await db
        .update(events)
        .set({ date: e.date, value: totalMilk(e.morning, e.afternoon), morning: e.morning ?? null, afternoon: e.afternoon ?? null, notes: e.notes, due: e.due, withdrawal: e.withdrawal })
        .where(and(eq(events.id, e.id!), eq(events.cowId, e.cowId), eq(events.kind, "Produção")))
        .returning({ id: events.id });
      if (!updated.length) return Response.json({ error: "Produção não encontrada. Atualize a página." }, { status: 404 });
      return Response.json({ id: e.id });
    }
    if (p.type !== "event" || !v.success) return Response.json({ error: "Confira os campos do registro." }, { status: 400 });
    const e = v.data;
    const id = crypto.randomUUID();
    const production = e.kind === "Produção";
    const hasShifts = e.morning != null || e.afternoon != null;
    await db.insert(events).values({
      id,
      cowId: e.cowId,
      kind: e.kind,
      date: e.date,
      value: production && hasShifts ? totalMilk(e.morning, e.afternoon) : e.value,
      morning: production ? e.morning ?? null : null,
      afternoon: production ? e.afternoon ?? null : null,
      notes: e.notes,
      due: e.due,
      withdrawal: e.withdrawal,
      result: e.kind === "Ultrassom" ? e.result : "",
    });
    return Response.json({ id });
  } catch (e) {
    return routeError(e);
  }
}
