import { QUEUE_NAMES, SigninSchema, streamHelpers } from "@repo/common";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, Response } from "express";
import {
  COOKIE_EXPIRY,
  DEVELOPMENT_URL,
  JWT_SECRET,
  NODE_ENV,
  PRODUCTION_URL,
  TOKEN_EXPIRY,
} from "../config";
import { sendToEmail } from "../utils/mail";
import prisma from "@repo/db";

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const validInput = SigninSchema.safeParse(req.body);

    if (!validInput.success) {
      res.status(411).json({
        success: false,
        error: `missing or invalid email`,
      });
      return;
    }

    const email = validInput.data?.email;

    const existingUser = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: "User already exists",
      });
      return;
    }

    const newUser = await prisma.user.create({
      data: {
        email: email,
        availableBalance: "5000000000",
        lockedBalance: "0",
        totalBalance: "5000000000",
        decimals: 6,
        lastLoggedIn: new Date(),
      },
    });

    const token = jwt.sign({ email: email }, JWT_SECRET!, {
      expiresIn: TOKEN_EXPIRY,
    });

    if (NODE_ENV === "production") {
      const { data, error } = await sendToEmail(email, token);
      if (error) {
        console.log("Error in sending email: ", error);
      }
    } else {
      console.log(
        `Please visit this link to login: 
            ${DEVELOPMENT_URL}/api/v1/auth/signin/post?token=${token}`
      );
    }

    res.status(200).json({
      success: true,
      user: newUser,
      message:
        NODE_ENV === "production"
          ? "Email sent. Check your inbox for magic link"
          : token,
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
    const validInput = SigninSchema.safeParse(req.body);

    if (!validInput.success) {
      res.status(411).json({
        success: false,
        error: `missing or invalid email`,
      });
      return;
    }

    const email = validInput.data?.email;

    const existingUser = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (!existingUser) {
      res.status(400).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    const user = await prisma.user.update({
      where: {
        email: email,
      },
      data: {
        lastLoggedIn: new Date(),
      },
    });

    const token = jwt.sign({ email: email }, JWT_SECRET!, {
      expiresIn: TOKEN_EXPIRY,
    });

    if (NODE_ENV === "production") {
      const { data, error } = await sendToEmail(email, token);
      if (error) {
        console.log("Error in sending email: ", error);
      }
    } else {
      console.log(
        `Please visit this link to login: 
        ${DEVELOPMENT_URL}/api/v1/auth/signin/post?token=${token}`
      );
    }

    res.status(200).json({
      success: true,
      user: user,
      message:
        NODE_ENV === "production"
          ? "Email sent. Check your inbox for magic link"
          : token,
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

    const existingUser = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (!existingUser) {
      res.status(400).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    const sessionToken = jwt.sign({ email }, JWT_SECRET!, {
      expiresIn: COOKIE_EXPIRY,
    });

    res.cookie("token", sessionToken, {
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
