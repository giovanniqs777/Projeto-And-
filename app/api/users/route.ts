import { safeWrite } from "@/lib/herd-db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

function routeError(e: unknown) {
  console.error("Users route", e);
  return Response.json({ error: "Não foi possível completar a ação. Tente novamente." }, { status: 503 });
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw error;

    return Response.json(
      {
        users: data.users.map((u) => ({ id: u.id, email: u.email ?? "", createdAt: u.created_at })),
        currentUserId: user.id,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return routeError(e);
  }
}

const createSchema = z.object({ email: z.string().trim().email().max(200), password: z.string().min(6).max(128) });
const deleteSchema = z.object({ id: z.string().uuid() });

export async function POST(request: Request) {
  try {
    safeWrite(request);
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });

    const payload = (await request.json()) as { type?: string; data?: unknown };
    const admin = getSupabaseAdmin();

    if (payload.type === "create-user") {
      const v = createSchema.safeParse(payload.data);
      if (!v.success) return Response.json({ error: "Informe um e-mail válido e uma senha com pelo menos 6 caracteres." }, { status: 400 });
      const { error } = await admin.auth.admin.createUser({ email: v.data.email, password: v.data.password, email_confirm: true });
      if (error) {
        const duplicate = error.status === 422 || /already.*registered|already exists/i.test(error.message);
        return Response.json({ error: duplicate ? "Esse e-mail já tem uma conta." : "Não foi possível criar a conta." }, { status: 400 });
      }
      return Response.json({ created: true });
    }

    if (payload.type === "delete-user") {
      const v = deleteSchema.safeParse(payload.data);
      if (!v.success) return Response.json({ error: "Usuário inválido." }, { status: 400 });
      if (v.data.id === user.id) return Response.json({ error: "Você não pode remover sua própria conta por aqui." }, { status: 400 });
      const { error } = await admin.auth.admin.deleteUser(v.data.id);
      if (error) throw error;
      return Response.json({ deleted: true });
    }

    return Response.json({ error: "Ação inválida." }, { status: 400 });
  } catch (e) {
    return routeError(e);
  }
}
