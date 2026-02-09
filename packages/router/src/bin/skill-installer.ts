#! /usr/bin/env node

import { install } from "@funstack/skill-installer";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

// Resolve the skill directory relative to this script's location.
// This script is at dist/bin/skill-installer.mjs, so go up two levels
// to reach the package root, then into skills/.
const __dirname = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(__dirname, "../../skills/funstack-router-knowledge");

console.log("Installing skill from:", skillDir);

await install(skillDir);
