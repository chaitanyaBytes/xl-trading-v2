import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "../config";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const sessionToken = req.cookies?.token;

  if (!sessionToken) {
    res.status(401).json({
      success: false,
      error: "Not authenticated",
    });
    return;
  }

  const { email } = jwt.verify(sessionToken, JWT_SECRET!) as JwtPayload;

  if (!email) {
    res.status(401).json({
      success: false,
      error: "Invalid/expired session",
    });
    return;
  }

  (req as any).user = { email };
  next();
}
