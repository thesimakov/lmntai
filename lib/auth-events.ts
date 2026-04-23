import type { NextAuthOptions } from "next-auth";

import { PLAN_LIMITS } from "@/lib/token-manager";
import { prisma } from "@/lib/prisma";
import { ensureUserReferralCode } from "@/lib/referrals";
import { logAuthEvent } from "@/lib/request-log";

export const authEvents: NextAuthOptions["events"] = {
  async createUser({ user }) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tokenBalance: PLAN_LIMITS.FREE,
        tokenLimit: PLAN_LIMITS.FREE
      }
    });
    try {
      await ensureUserReferralCode(user.id);
    } catch {
      // ignore referral code collisions/transient issues; profile route will retry later.
    }
  },
  async signIn({ user, account, isNewUser }) {
    if (user.id) {
      try {
        await ensureUserReferralCode(user.id);
      } catch {
        // ignore, non-critical for sign in flow
      }
    }
    await logAuthEvent({
      userId: user.id,
      action: "sign_in",
      provider: account?.provider ?? null,
      email: user.email ?? null,
      metadata: { isNewUser: Boolean(isNewUser) }
    });
  },
  async signOut({ token }) {
    await logAuthEvent({
      userId: typeof token.userId === "string" ? token.userId : undefined,
      action: "sign_out",
      email: typeof token.email === "string" ? token.email : null
    });
  },
  async linkAccount({ user, account }) {
    await logAuthEvent({
      userId: user.id,
      action: "link_account",
      provider: account.provider,
      email: user.email ?? null,
      metadata: { providerAccountId: account.providerAccountId }
    });
  }
};
