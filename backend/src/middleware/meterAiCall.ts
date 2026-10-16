import { Request, Response, NextFunction } from 'express';
import { debitForUser, refundForUser } from '../services/aiCreditService';

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;

/**
 * Wrap an AI route so that:
 *
 *   1. Pro users are debited one credit before the handler runs,
 *   2. an out-of-credits Pro user gets a 402 with a purchase hint,
 *   3. a handler that responds with 4xx or 5xx gets the credit back,
 *   4. Free users pass through untouched.
 *
 * The refund decision is made on the response status code after the
 * handler resolves. That is the only signal available without threading
 * a return value through every error path in the controller, and it
 * matches how the frontend already reads outcomes. A 400 "title is
 * required" does not bill the user; a 200 does.
 */
export const meterAiCall =
  (reason: string, cost: number, handler: Handler): Handler =>
  async (req, res, next) => {
    const userId = req.user?.userId;
    if (!userId) return handler(req, res, next);

    const debit = await debitForUser(userId, reason, cost);

    if (!debit.applies) {
      // Free tier: no metering, no changes to the response.
      return handler(req, res, next);
    }

    if (!debit.ok) {
      res.status(402).json({
        error: 'You are out of AI credits',
        reason: 'out_of_credits',
        aiCreditsRemaining: 0,
        buy_credits_url: '/settings/billing',
      });
      return;
    }

    try {
      await handler(req, res, next);
      // The handler has now sent its response. A 4xx or 5xx means the
      // call did not produce a usable result, so give the credit back.
      if (res.statusCode >= 400) {
        await refundForUser(userId, reason + '.refund', cost);
      }
    } catch (error) {
      await refundForUser(userId, reason + '.refund', cost);
      throw error;
    }
  };
