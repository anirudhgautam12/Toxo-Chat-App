import { Resend } from "resend";
import { ENV } from "./env.js";

let resendClient = null;

if (ENV.RESEND_API_KEY) {
  resendClient = new Resend(ENV.RESEND_API_KEY);
} else {
  console.warn("⚠️ RESEND_API_KEY is missing. Email service disabled.");
}

export { resendClient };

export const sender = {
  email: ENV.EMAIL_FROM,
  name: ENV.EMAIL_FROM_NAME,
};
