import { Request, Response } from 'express';
import pool from '../config/database';
import {
  createSubaccount,
  listBanks,
  PaystackError,
} from '../services/paystackService';

/**
 * Tudu's share of every paid template sale. See the note on
 * createSubaccount in paystackService for the direction.
 */
const TUDU_SHARE_PERCENT = 30;

const isValidBusinessName = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.trim().length <= 255;

const isValidBankCode = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= 20;

const isValidAccountNumber = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9]{10}$/.test(v);

/** GET /api/publisher/profile */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const row = await pool.query(
      'SELECT business_name, bank_name, account_number, account_name, ' +
        '       payout_status, created_at, updated_at ' +
        'FROM publisher_profiles WHERE user_id = $1',
      [userId]
    );

    if (row.rows.length === 0) {
      return res.json({ exists: false });
    }

    const p = row.rows[0];
    // Mask the account number to the last 3 digits.
    const masked = p.account_number.slice(0, 3) + '****' + p.account_number.slice(-3);
    res.json({
      exists: true,
      business_name: p.business_name,
      bank_name: p.bank_name,
      account_number: masked,
      account_name: p.account_name,
      payout_status: p.payout_status,
      created_at: p.created_at,
      updated_at: p.updated_at,
    });
  } catch (error) {
    console.error('Error reading publisher profile:', error);
    res.status(500).json({ error: 'Failed to fetch publisher profile' });
  }
};

/**
 * POST /api/publisher/profile - body: { business_name, bank_code, account_number }.
 *
 * Creates a Paystack subaccount with the 30% platform split and stores
 * the resolved account_name alongside the subaccount_code. Re-saving
 * creates a new subaccount and supersedes the old one (old one is not
 * deleted - any historical settlements it already received are gone).
 */
export const saveProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { business_name, bank_code, account_number } = (req.body ?? {}) as {
      business_name?: unknown;
      bank_code?: unknown;
      account_number?: unknown;
    };

    if (!isValidBusinessName(business_name)) {
      return res.status(400).json({ error: 'Business name is required' });
    }
    if (!isValidBankCode(bank_code)) {
      return res.status(400).json({ error: 'A valid bank is required' });
    }
    if (!isValidAccountNumber(account_number)) {
      return res.status(400).json({ error: 'Account number must be 10 digits' });
    }

    const banks = await listBanks();
    const bank = banks.find((b) => b.code === bank_code);
    if (!bank) return res.status(400).json({ error: 'Unknown bank code' });

    const sub = await createSubaccount({
      business_name: business_name.trim(),
      bank_code,
      account_number,
      percentage_charge: TUDU_SHARE_PERCENT,
      description: 'Tudu marketplace publisher',
    });

    await pool.query(
      `INSERT INTO publisher_profiles
        (user_id, business_name, bank_code, bank_name, account_number, account_name, subaccount_code, payout_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       ON CONFLICT (user_id) DO UPDATE SET
         business_name = EXCLUDED.business_name,
         bank_code = EXCLUDED.bank_code,
         bank_name = EXCLUDED.bank_name,
         account_number = EXCLUDED.account_number,
         account_name = EXCLUDED.account_name,
         subaccount_code = EXCLUDED.subaccount_code,
         payout_status = 'active',
         updated_at = NOW()`,
      [
        userId,
        business_name.trim(),
        bank_code,
        bank.name,
        account_number,
        sub.account_name || business_name.trim(),
        sub.subaccount_code,
      ]
    );

    res.json({
      ok: true,
      business_name: business_name.trim(),
      bank_name: bank.name,
      account_name: sub.account_name,
      payout_status: 'active',
    });
  } catch (error) {
    if (error instanceof PaystackError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Error saving publisher profile:', error);
    res.status(500).json({ error: 'Failed to save publisher profile' });
  }
};

/** GET /api/publisher/banks - Nigerian banks, for the account form. */
export const listBanksEndpoint = async (_req: Request, res: Response) => {
  try {
    const banks = await listBanks();
    res.json(banks.map((b) => ({ code: b.code, name: b.name })));
  } catch (error) {
    if (error instanceof PaystackError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Error listing banks:', error);
    res.status(500).json({ error: 'Failed to list banks' });
  }
};
