import { spawn } from "node:child_process";

type ProvisionEvent = "bind_verified" | "verify_passed";

type TriggerPublishDomainProvisionInput = {
  host: string;
  projectId: string;
  ownerId: string;
  event: ProvisionEvent;
};

/**
 * Опциональный асинхронный хук на сервере:
 * позволяет после VERIFIED-привязки домена запустить certbot/acme-скрипт.
 *
 * Настройка:
 *   PUBLISH_DOMAIN_PROVISION_HOOK='bash /etc/lemnity/publish-domain-provision.sh'
 *
 * В скрипт передаются env:
 *   LMNT_PUBLISH_HOST, LMNT_PUBLISH_PROJECT_ID, LMNT_PUBLISH_OWNER_ID, LMNT_PUBLISH_EVENT
 */
export function triggerPublishDomainProvision(input: TriggerPublishDomainProvisionInput): void {
  const hook = process.env.PUBLISH_DOMAIN_PROVISION_HOOK?.trim();
  if (!hook) return;

  try {
    const child = spawn(
      "/bin/sh",
      ["-lc", hook],
      {
        detached: true,
        stdio: "ignore",
        env: {
          ...process.env,
          LMNT_PUBLISH_HOST: input.host,
          LMNT_PUBLISH_PROJECT_ID: input.projectId,
          LMNT_PUBLISH_OWNER_ID: input.ownerId,
          LMNT_PUBLISH_EVENT: input.event
        }
      }
    );
    child.unref();
  } catch (error) {
    console.error("[publish-domain] provision hook launch failed", error);
  }
}
