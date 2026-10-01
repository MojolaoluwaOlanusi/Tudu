import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

// @types/passport declares `Express.User` as an empty interface and types
// `Request.user` as `User | undefined`. We augment `Express.User` (instead of
// re-declaring `Request.user`) so `req.user` carries our JWT payload fields
// without clashing with the passport type declarations.
declare global {
  namespace Express {
    interface User {
      userId: string;
      email: string;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};
