/**
 * TPC-AIOS bootstrap — how the planes wire together, in one place.
 *
 * Skeleton: this is a DEMONSTRATION repo. The seams are real but it is not wired to actually
 * run end-to-end (the embedding seam throws, and you must point OPENAI_BASE_URL at a local
 * endpoint). Read it to see the assembly, not to execute it.
 */

import { initializeProviders } from './providers/registry.js';
import { registerBuiltinTools } from './tools/index.js';
import { initMemoryFromEnv } from './memory/index.js';
import { runAgent, VIN, registerDelegation } from './agent/index.js';

/** Wire the planes: provider (env-driven) → tools → delegation → memory. */
export async function boot(): Promise<void> {
  initializeProviders(); // OpenAI-compatible provider; reads OPENAI_BASE_URL / OPENAI_API_KEY
  registerBuiltinTools(); // echo / web_fetch / memory_search (source: 'core')
  registerDelegation(); // delegate_to_agent — the multi-agent seam
  await initMemoryFromEnv(); // sqlite (default) or inmemory
}

/** Ask the one agent. Identity is implicit ('local'); the tool gate is fail-closed. */
export async function ask(input: string) {
  return runAgent(VIN, input);
}

// Example (uncomment once a local OpenAI-compatible endpoint + embedder are configured):
// await boot();
// console.log((await ask('Summarize the architecture in 3 bullets.')).answer);

export { VIN } from './agent/vin.js';
