import argon2 from "argon2";

// Tuned for the constrained Cloudflare container CPU while staying within OWASP's
// argon2id guidance (>= 19 MiB memory, t >= 2). The library default (64 MiB / t=3 /
// p=4) is far heavier and was costing seconds per login on the container.
//
// NOTE: verify cost is governed by the params embedded in each *stored* hash, so
// existing accounts only get faster after their hash is regenerated — loginAction
// rehashes on the next successful login (see passwordNeedsRehash).
const HASH_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, HASH_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/** True if a stored hash uses heavier/older params than our current target. */
export function passwordNeedsRehash(hash: string): boolean {
  try {
    return argon2.needsRehash(hash, HASH_OPTIONS);
  } catch {
    return false;
  }
}
