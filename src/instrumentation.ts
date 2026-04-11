export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { validateEnvAtStartup } = await import("@/lib/env");
    validateEnvAtStartup();
  } catch (e) {
    console.error("[instrumentation] validateEnvAtStartup failed:", e);
  }
}
