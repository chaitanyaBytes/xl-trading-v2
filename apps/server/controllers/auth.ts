import { SigninSchema } from "@repo/common";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, Response } from "express";
import {
  DEVELOPMENT_URL,
  JWT_SECRET,
  NODE_ENV,
  PRODUCTION_URL,
} from "../config";
import { sendToEmail } from "../utils/mail";

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, success } = SigninSchema.safeParse(req.body);

    if (!success) {
      res.status(411).json({
        success: false,
        error: `missing or invalid email`,
      });
      return;
    }

    const token = jwt.sign({ email: data?.email }, JWT_SECRET!);

    if (NODE_ENV === "production") {
      await sendToEmail(token);
    } else {
      console.log(
        `Please visit this link to login: 
            ${DEVELOPMENT_URL}/api/v1/signin/post?token=${token}`
      );
    }

    res.status(200).json({
      success: true,
      message: token,
    });
    return;
  } catch (error: any) {
    console.log("Error in signing up: ", error);
    res.status(500).json({
      success: false,
      error: `Error in signing up: ${error}`,
    });
  }
};

export const signin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, success } = SigninSchema.safeParse(req.body);

    if (!success) {
      res.status(411).json({
        success: false,
        error: `missing or invalid email`,
      });
      return;
    }

    const token = jwt.sign({ email: data?.email }, JWT_SECRET!);

    if (NODE_ENV === "production") {
      await sendToEmail(token);
    } else {
      console.log(
        `Please visit this link to login: 
              ${DEVELOPMENT_URL}/api/v1/auth/signin/post?token=${token}`
      );
    }

    res.status(200).json({
      success: true,
      message: token,
    });
    return;
  } catch (error: any) {
    console.log("Error in signing in: ", error);
    res.status(500).json({
      success: false,
      error: `Error in signing in: ${error}`,
    });
  }
};

export const setTokenCookie = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const token = req.query.token as string;

    if (!token) {
      res.status(400).json({
        success: false,
        error: "No token present",
      });
      return;
    }

    const { email } = jwt.verify(token, JWT_SECRET!) as JwtPayload;

    if (!email) {
      res.status(400).json({
        success: false,
        error: "Invalid token: no email found",
      });
      return;
    }

    res.cookie("token", token, {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    const redirectUrl =
      NODE_ENV === "production"
        ? `${PRODUCTION_URL}/dashboard`
        : `${DEVELOPMENT_URL}/dashboard`;

    res.redirect(redirectUrl);

    return;
  } catch (error: any) {
    console.error("Error in getting token: ", error);
    res.json({
      success: false,
      error: `Error: ${error.message}`,
    });
  }
};
