import { Resend } from 'resend';

/**
 * Thin wrapper around the Resend SDK.
 *
 * Lazily constructed so a missing RESEND_API_KEY does not blow up the
 * whole app on import - only the reminder endpoint is affected, and it
 * will report a clear error if someone calls it without the key.
 */
let client: Resend | null = null;

const getClient = (): Resend | null => {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  client = new Resend(key);
  return client;
};

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Send an HTML email.
 *
 * The Resend Node SDK never throws for API errors - it returns
 * { data, error }. This wrapper turns both outcomes into a plain
 * { ok, id?, error? } so callers do not have to remember the shape.
 */
export const sendHtml = async (params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendResult> => {
  const resend = getClient();
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' };
  }

  const from = process.env.REMINDER_FROM_EMAIL;
  if (!from) {
    return { ok: false, error: 'REMINDER_FROM_EMAIL is not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
};
