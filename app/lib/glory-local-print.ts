// Le navigateur contacte uniquement le service d'impression de CET ordinateur.
// Ne jamais appeler cette URL depuis une API Next.js ou le VPS.
export const GLORY_PRINT_URL = "http://127.0.0.1:4319";

export async function gloryLocalPrint(payload: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    // Vérification préalable : aucune impression n'est lancée par /health.
    const healthResponse = await fetch(`${GLORY_PRINT_URL}/health`, {
      cache: "no-store", signal: controller.signal,
    });
    if (!healthResponse.ok) throw new Error("Service Glory Print indisponible.");
    const health = await healthResponse.json();
    if (!health?.ok || health?.protocol !== "TSPL") {
      throw new Error("Le service local ne répond pas comme une imprimante TSPL Glory.");
    }
    const response = await fetch(`${GLORY_PRINT_URL}/print/delivery-note`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || `Erreur Glory Print (${response.status}).`);
    }
    return result as { ok: true; printer?: string; jobId?: string };
  } catch (error) {
    if (error instanceof TypeError || (error instanceof DOMException && error.name === "AbortError")) {
      throw new Error("Connexion impossible à Glory Print sur cet ordinateur. Vérifiez le service local et les autorisations du navigateur pour localhost / réseau local. Aucune impression confirmée.");
    }
    throw error;
  } finally { clearTimeout(timeout); }
}

export function gloryPrintValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}
