import { Request, Response } from 'express';
import { generateToken } from '../utils/jwt';

export const googleAuth = (req: Request, res: Response) => {
  // Handled by passport
};

export const githubAuth = (req: Request, res: Response) => {
  // Handled by passport
};

export const googleCallback = (req: Request, res: Response) => {
  const user = req.user as any;
  const token = generateToken({ userId: user.id, email: user.email });
  
  // Redirect to frontend with token
  res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
};

export const githubCallback = (req: Request, res: Response) => {
  const user = req.user as any;
  const token = generateToken({ userId: user.id, email: user.email });
  
  // Redirect to frontend with token
  res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Fetch full user data from database
    const pool = (await import('../config/database')).default;
    const result = await pool.query(
      'SELECT id, email, name, provider, avatar_url, created_at FROM users WHERE id = $1',
      [user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
};

export const logout = (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
};
