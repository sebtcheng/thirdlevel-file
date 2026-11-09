import { devLogger, initDevDiagnostics } from "./dev-logger";

initDevDiagnostics();

devLogger.setContextProvider(() => {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("user") : null;
    if (!raw) return { user: null };
    const u = JSON.parse(raw);
    return {
      user: u ? { id: String(u.id || u.tlo_id || ""), role: String(u.role || "") } : null,
    };
  } catch {
    return { user: null };
  }
});
