#!/usr/bin/env node

const isRemote =
  process.argv.includes("--remote") ||
  process.env.SKILL_TREE_REMOTE === "1";

if (isRemote) {
  await import("./remote.js");
} else {
  await import("./local.js");
}
