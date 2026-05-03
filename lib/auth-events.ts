import type { NextAuthOptions } from "next-auth";

import { getEffectiveMonthlyAllowance } from "@/lib/platform-plan-settings";
import { prisma } from "@/lib/prisma";
import { ensureUserReferralCode } from "@/lib/referrals";
import { logAuthEvent } from "@/lib/request-log";
import { ensureUserVirtualWorkspace } from "@/lib/user-virtual-storage";
import { sendWelcomeEmailAfterRegistration } from "@/lib/notisend-email";

export const authEvents: NextAuthOptions["events"] = {
  async createUser({ user }) {
    const freeLimit = await getEffectiveMonthlyAllowance("FREE");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tokenBalance: freeLimit,
        tokenLimit: freeLimit
      }
    });
    await ensureUserVirtualWorkspace(user.id);
    try {
      await ensureUserReferralCode(user.id);
    } catch {
      // ignore referral code collisions/transient issues; profile route will retry later.
    }
    const email = user.email?.trim();
    if (email) {
      try {
        await sendWelcomeEmailAfterRegistration({
          email,
          name: user.name ?? null
        });
      } catch (e) {
        console.error("[auth] welcome email (oauth) failed", e);
      }
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
