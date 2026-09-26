import "server-only";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import type { SessionBinding } from "@/lib/session";

export const OWNER_ID = "owner";

export function ownerRow() {
  return db.user.findUnique({ where: { id: OWNER_ID } });
}

export async function isSetUp(): Promise<boolean> {
  return Boolean((await ownerRow())?.passwordHash);
}

/**
 * Claims the install for whoever finishes setup first. Both paths only succeed when
 * no password exists yet, so two simultaneous setups can't both win. Returns the new
 * session binding, or null if setup had already been completed.
 */
export async function completeSetup(input: {
  name: string;
  password: string;
  updateCheck: boolean;
}): Promise<SessionBinding | null> {
  const data = { name: input.name, passwordHash: await hashPassword(input.password), updateCheck: input.updateCheck };
  const select = { sessionEpoch: true } as const;
  // An owner row without a password exists after `compound-reset-password`.
  const { count } = await db.user.updateMany({ where: { id: OWNER_ID, passwordHash: null }, data });
  try {
    const { sessionEpoch } =
      count === 1
        ? await db.user.findUniqueOrThrow({ where: { id: OWNER_ID }, select })
        : await db.user.create({ data: { id: OWNER_ID, ...data }, select });
    return { passwordHash: data.passwordHash, epoch: sessionEpoch };
  } catch {
    return null;
  }
}
