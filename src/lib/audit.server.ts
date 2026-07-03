// Auditoria server-side (best-effort) gravando em public.audit_logs (schema remoto).
// Substitui os inserts diretos em audit_logs espalhados pelo código legado.
// NUNCA lança: uma falha de auditoria não pode quebrar o fluxo de negócio.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database, Json } from "@/integrations/supabase/types.remote";

// supabaseAdmin é tipado com o schema legado (./types). Aqui re-tipamos para o
// schema remoto (anti-corruption boundary). `as unknown as` não é `any`.
const db = supabaseAdmin as unknown as SupabaseClient<Database>;

export type AuditActor = "user" | "system";

export interface AuditEntry {
  sellerId: string;
  action: string;
  actor?: AuditActor;
  target?: string | null;
  detail?: Json;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const { error } = await db.from("audit_logs").insert({
      seller_id: entry.sellerId,
      actor: entry.actor ?? "user",
      action: entry.action,
      target: entry.target ?? null,
      detail: entry.detail ?? {},
    });
    if (error) {
      console.warn(`[audit] falha ao gravar '${entry.action}': ${error.message}`);
    }
  } catch (err) {
    console.warn(`[audit] exceção ao gravar '${entry.action}':`, err);
  }
}
