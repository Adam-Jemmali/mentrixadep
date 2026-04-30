import { spawnSync } from "node:child_process";

const steps = [
  { label: "Production env", command: "npm", args: ["run", "env:verify"] },
  { label: "Lint", command: "npm", args: ["run", "lint"] },
  { label: "Unit tests", command: "npm", args: ["run", "test:ci"] },
  { label: "Stripe setup", command: "npm", args: ["run", "stripe:verify"] },
  { label: "E2E CI suite", command: "npm", args: ["run", "test:e2e:ci"] },
  { label: "Production build", command: "npm", args: ["run", "build"] },
];

for (const step of steps) {
  console.log(`\n=== ${step.label} ===`);
  const result = spawnSync(step.command, step.args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`\nRelease verification failed at: ${step.label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nRelease verification passed: lint + unit + e2e + build.");
