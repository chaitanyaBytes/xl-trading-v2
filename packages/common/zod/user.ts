import z from "zod";

export const SigninSchema = z.object({
  email: z.email(),
});
