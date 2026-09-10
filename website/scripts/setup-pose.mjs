/**
 * Puts the pose-tracking runtime in place for the live skeleton overlay.
 *
 * Both artefacts are large binaries that would bloat the repository, so they
 * are fetched here instead of committed: the WASM runtime is copied out of the
 * installed package, and the model is downloaded once from Google's model
 * storage. Re-running is cheap — existing files are left alone.
 */
import { cp, mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wasmSrc = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmDest = join(root, "public", "mediapipe", "wasm");
const modelDir = join(root, "public", "models");
const modelPath = join(modelDir, "pose_landmarker_lite.task");
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const exists = async (p) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

async function main() {
  if (!(await exists(wasmSrc))) {
    console.warn("[pose] @mediapipe/tasks-vision ist nicht installiert – übersprungen.");
    return;
  }

  await mkdir(wasmDest, { recursive: true });
  await cp(wasmSrc, wasmDest, { recursive: true });
  console.log("[pose] WASM-Runtime nach public/mediapipe/wasm kopiert.");

  if (await exists(modelPath)) {
    console.log("[pose] Modell liegt bereits vor.");
    return;
  }

  await mkdir(modelDir, { recursive: true });
  console.log("[pose] Lade Pose-Modell (~5.5 MB)…");
  const res = await fetch(MODEL_URL);
  if (!res.ok) {
    throw new Error(`Modell-Download fehlgeschlagen: HTTP ${res.status}`);
  }
  await writeFile(modelPath, Buffer.from(await res.arrayBuffer()));
  console.log("[pose] Modell nach public/models gespeichert.");
}

main().catch((err) => {
  // A missing overlay must not break install or build; the UI says so itself.
  console.warn(`[pose] Setup unvollständig: ${err.message}`);
});
