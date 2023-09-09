/* eslint-disable require-jsdoc */
"use server";

import { sendMail } from "@/app/utils/sendMail";

export async function messageAdam(formData) {
  try {
    const email = formData.get("email");
    const message = formData.get("message");
    const body = createEmailBody({ email, message });

    const result = await sendMail({
      fromAddress: "inbound@adambechtold.xyz",
      toAddress: "hi@adambechtold.xyz",
      subject: `New Message From ${email}`,
      body,
    });

    if (result.code !== 200) {
      return { message: "Something went wrong", code: 500, error: result };
    }
    return { message: "Message sent!", code: 200 };
  } catch (error) {
    console.error("something went wrong", error);
    return { message: "Something went wrong", code: 500, error };
  }
}

function createEmailBody({ email, message }) {
  return `
New Message from ${email}:

${message}`;
}
