import { prisma } from "@/lib/prisma";
import {
  dispatchFormSubmissionWebhook,
  type FormSubmissionWebhookPayload,
} from "@/lib/cms-form-submission-webhook";

/**
 * Dispatches a form submission webhook and logs the delivery attempt to WebhookDeliveryLog.
 * On failure: logs the error and schedules a retry window (5 min), instead of silent discard.
 */
export async function dispatchFormSubmissionWebhookWithLogging(params: {
  url: string;
  payload: FormSubmissionWebhookPayload;
  siteId: string;
  submissionId: string;
}): Promise<void> {
  let logId: string | null = null;
  try {
    const log = await prisma.webhookDeliveryLog.create({
      data: {
        siteId: params.siteId,
        submissionId: params.submissionId,
        url: params.url,
        status: "pending",
      },
      select: { id: true },
    });
    logId = log.id;
  } catch (e) {
    console.error("[webhook_queue] failed to create delivery log", e);
  }

  try {
    await dispatchFormSubmissionWebhook({ url: params.url, payload: params.payload });
    if (logId) {
      await prisma.webhookDeliveryLog
        .update({ where: { id: logId }, data: { status: "success" } })
        .catch(() => {});
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[cms_form_submission_webhook] delivery failed, logged for retry", {
      siteId: params.siteId,
      submissionId: params.submissionId,
      error,
    });
    if (logId) {
      await prisma.webhookDeliveryLog
        .update({
          where: { id: logId },
          data: {
            status: "failed",
            error,
            nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
          },
        })
        .catch(() => {});
    }
  }
}
