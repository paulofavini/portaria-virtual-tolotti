// Edge function for admin to manage users (create, update role, delete)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AppRole = "admin" | "operador" | "sindico";

interface RequestBody {
  action: "list" | "create" | "update" | "delete";
  email?: string;
  password?: string;
  nome_completo?: string;
  role?: AppRole;
  user_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin");

    if (!roleRows || roleRows.length === 0) {
      return json({ error: "Forbidden — admin only" }, 403);
    }

    const body = (await req.json()) as RequestBody;

    if (body.action === "list") {
      const { data: users, error } = await admin.auth.admin.listUsers({ perPage: 200 });
      if (error) throw error;
      const ids = users.users.map((u) => u.id);
      const { data: profiles } = await admin.from("profiles").select("*").in("id", ids);
      const { data: rolesAll } = await admin.from("user_roles").select("user_id, role").in("user_id", ids);
      const merged = users.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        nome_completo: profiles?.find((p) => p.id === u.id)?.nome_completo ?? "",
        roles: (rolesAll ?? []).filter((r) => r.user_id === u.id).map((r) => r.role),
      }));
      return json({ users: merged });
    }

    if (body.action === "create") {
      if (!body.email || !body.password || !body.role) {
        return json({ error: "email, password e role obrigatórios" }, 400);
      }
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: { nome_completo: body.nome_completo ?? body.email },
      });
      if (createErr) throw createErr;
      const newId = created.user.id;
      // Update role: trigger created an "operador" role; replace with chosen
      await admin.from("user_roles").delete().eq("user_id", newId);
      await admin.from("user_roles").insert({ user_id: newId, role: body.role });
      if (body.nome_completo) {
        await admin.from("profiles").update({ nome_completo: body.nome_completo }).eq("id", newId);
      }
      return json({ ok: true, id: newId });
    }

    if (body.action === "update") {
      if (!body.user_id) return json({ error: "user_id obrigatório" }, 400);
      if (body.role) {
        await admin.from("user_roles").delete().eq("user_id", body.user_id);
        await admin.from("user_roles").insert({ user_id: body.user_id, role: body.role });
      }
      if (body.nome_completo !== undefined) {
        await admin.from("profiles").update({ nome_completo: body.nome_completo }).eq("id", body.user_id);
      }
      if (body.password) {
        const { error: pwErr } = await admin.auth.admin.updateUserById(body.user_id, {
          password: body.password,
        });
        if (pwErr) throw pwErr;
      }
      return json({ ok: true });
    }

    if (body.action === "delete") {
      if (!body.user_id) return json({ error: "user_id obrigatório" }, 400);
      if (body.user_id === userData.user.id) {
        return json({ error: "Você não pode remover seu próprio usuário" }, 400);
      }
      await admin.from("user_roles").delete().eq("user_id", body.user_id);
      await admin.from("profiles").delete().eq("id", body.user_id);
      const { error: delErr } = await admin.auth.admin.deleteUser(body.user_id);
      if (delErr) throw delErr;
      return json({ ok: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}