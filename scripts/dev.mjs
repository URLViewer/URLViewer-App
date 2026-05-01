import { spawn } from "node:child_process";

const env = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => typeof value === "string"),
);
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn("yarn vite", {
  stdio: "inherit",
  env,
  shell: true,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
