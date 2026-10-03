import { herdDb, routeError, safeWrite } from "@/lib/herd-db";
import { cows, events } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

const optionalDate = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).default("");
const optionalNumber = (integer = false) =>
  z
    .string()
    .default("")
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0 && (!integer || Number.isInteger(Number(v)))));
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
    photoFrame: frame,
    bodyFrame: frame,
    dailyMilk: optionalNumber().refine((v) => v === "" || Number(v) <= 500),
    productionDate: optionalDate,
    productionNotes: z.string().max(5000).default(""),
    ultrasoundDate: optionalDate,
    ultrasoundResult: z.enum(["", "Prenha", "Vazia"]).default(""),
  })
  .refine((c) => Boolean(c.ultrasoundDate) === Boolean(c.ultrasoundResult), { message: "Informe data e resultado do ultrassom" });
const evt = z
  .object({
    cowId: z.string().uuid(),
    kind: z.enum(["Produção", "Inseminação", "Diagnóstico de gestação", "Ultrassom", "Parto", "Vacina", "Exame", "Tratamento", "Observação"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    value: z.number().min(0).max(500).nullable(),
    result: z.enum(["", "Prenha", "Vazia"]).default(""),
    notes: z.string().max(5000),
    due: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
    withdrawal: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  })
  .refine((x) => x.kind !== "Produção" || x.value !== null, { message: "Informe os litros de leite" })
  .refine((e) => e.kind !== "Ultrassom" || ["Prenha", "Vazia"].includes(e.result), { message: "Selecione o resultado do ultrassom" });

export async function GET() {
  try {
    const db = herdDb();
    const [c, e] = await Promise.all([
      db.select().from(cows).orderBy(cows.name),
      db
        .select({
          id: events.id,
          cowId: events.cowId,
          kind: events.kind,
          date: events.date,
          value: events.value,
          notes: events.notes,
          due: events.due,
          withdrawal: events.withdrawal,
          result: events.result,
        })
        .from(events)
        .orderBy(desc(events.date), events.id),
    ]);
    return Response.json(
      { cows: c.map((c) => ({ ...c, photoFrame: readFrame(c.photoFrame), bodyFrame: readFrame(c.bodyFrame) })), events: e },
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

    if (p.type === "delete-cow" || p.type === "delete-production") {
      const v = z.object({ id: z.string().uuid() }).safeParse(p.data);
      if (!v.success) return Response.json({ error: "Registro inválido." }, { status: 400 });
      if (p.type === "delete-cow") {
        await db.transaction(async (tx) => {
          await tx.delete(events).where(eq(events.cowId, v.data.id));
          await tx.delete(cows).where(eq(cows.id, v.data.id));
        });
      } else {
        await db.delete(events).where(and(eq(events.id, v.data.id), eq(events.kind, "Produção")));
      }
      return Response.json({ deleted: true });
    }

    if (p.type === "cow") {
      const v = cow.safeParse(p.data);
      if (!v.success) return Response.json({ error: "Confira os campos do cadastro." }, { status: 400 });
      const c = v.data;
      const id = c.id || crypto.randomUUID();
      if (c.dailyMilk !== "" && !c.productionDate) return Response.json({ error: "Informe a data da produção." }, { status: 400 });

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
      };
      const { id: _id, ...update } = row;

      await db.transaction(async (tx) => {
        await tx.insert(cows).values(row).onConflictDoUpdate({ target: cows.id, set: update });
        if (c.dailyMilk !== "")
          await tx.insert(events).values({ id: crypto.randomUUID(), cowId: id, kind: "Produção", date: c.productionDate, value: Number(c.dailyMilk), notes: c.productionNotes, due: "", withdrawal: "" });
        if (c.ultrasoundDate)
          await tx.insert(events).values({ id: crypto.randomUUID(), cowId: id, kind: "Ultrassom", date: c.ultrasoundDate, value: null, notes: "", due: "", withdrawal: "", result: c.ultrasoundResult });
      });
      return Response.json({ id });
    }

    const v = evt.safeParse(p.data);
    if (p.type !== "event" || !v.success) return Response.json({ error: "Confira os campos do registro." }, { status: 400 });
    const e = v.data;
    const id = crypto.randomUUID();
    await db.insert(events).values({
      id,
      cowId: e.cowId,
      kind: e.kind,
      date: e.date,
      value: e.value,
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
