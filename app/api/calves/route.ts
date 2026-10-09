import { herdDb, safeWrite, routeError } from "@/lib/herd-db";
import { calves, appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calfSchema, readCalfFrame } from "@/lib/calves";
import { z } from "zod";
import { verifyDeletionPassword } from "@/lib/deletion-password";

export async function GET() {
  try {
    const db = herdDb();
    const [rows, passwordRows] = await Promise.all([
      db.select().from(calves).orderBy(calves.name),
      db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, "cow_deletion_password")),
    ]);
    return Response.json(
      {
        hasDeletionPassword: passwordRows.length > 0,
        calves: rows.map((c) => ({ ...c, photoFrame: readCalfFrame(c.photoFrame), bodyFrame: readCalfFrame(c.bodyFrame) })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return routeError(e);
  }
}

export async function POST(request: Request) {
  try {
    safeWrite(request);
    const payload = (await request.json()) as { type?: string; data?: unknown };
    const db = herdDb();

    if (payload.type === "delete-calf") {
      const parsed = z.object({ id: z.string().uuid(), password: z.string().max(128).optional() }).safeParse(payload.data);
      if (!parsed.success) return Response.json({ error: "Registro inválido." }, { status: 400 });
      const configured = (await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, "cow_deletion_password")))[0];
      if (!configured) return Response.json({ error: "Crie a senha de exclusão antes de excluir um bezerro." }, { status: 409 });
      if (!parsed.data.password || !(await verifyDeletionPassword(parsed.data.password, configured.value)))
        return Response.json({ error: "Senha incorreta. O cadastro não foi excluído." }, { status: 403 });
      const deleted = await db.delete(calves).where(eq(calves.id, parsed.data.id)).returning({ id: calves.id });
      if (!deleted.length) return Response.json({ error: "Bezerro não encontrado. Atualize a página." }, { status: 404 });
      return Response.json({ deleted: true });
    }

    const parsed = calfSchema.safeParse(payload.data);
    if (payload.type !== "calf" || !parsed.success) return Response.json({ error: "Confira os campos do cadastro do bezerro." }, { status: 400 });
    const c = parsed.data;
    const id = c.id || crypto.randomUUID();
    const row = {
      id,
      name: c.name,
      tag: c.tag,
      photo: c.photo,
      bodyPhoto: c.bodyPhoto,
      photoFrame: JSON.stringify(c.photoFrame),
      bodyFrame: JSON.stringify(c.bodyFrame),
      motherTag: c.motherTag,
      motherName: c.motherName,
      birth: c.birth,
      breed: c.breed,
      dailyMilk: c.dailyMilk,
      weaningDate: c.weaningDate,
      medicineDate: c.medicineDate,
      medicine: c.medicine,
      vaccinationDate: c.vaccinationDate,
    };
    const { id: _id, ...update } = row;
    await db.insert(calves).values(row).onConflictDoUpdate({ target: calves.id, set: update });
    return Response.json({ id });
  } catch (e) {
    return routeError(e);
  }
}
