import { Resend } from "resend";
import {
  DEVELOPMENT_URL,
  NODE_ENV,
  PRODUCTION_URL,
  RESEND_API_KEY,
} from "../config";

const resend = new Resend(RESEND_API_KEY);

export async function sendToEmail(email: string, token: string) {
  const url = NODE_ENV === "production" ? PRODUCTION_URL : DEVELOPMENT_URL;
  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: [email],
    subject: "This is your otp to login",
    html: `<center>
        <h1>Click on this link to sign in</h1>
        <a target=_blank href=${url}/api/v1/auth/sigin/post?token=${token}>here</a>
    </center>`,
  });

  return { data, error };
}
