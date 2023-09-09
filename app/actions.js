/* eslint-disable require-jsdoc */
"use server";

import { sendMail } from "@/app/utils/sendMail";

export async function messageAdam(formData) {
  try {
    const email = formData.get("email");
    const message = formData.get("message");
    const body = `
New Message from ${email}:

${message}`;

    sendMail({
      fromAddress: "inbound@adambechtold.xyz",
      toAddress: "hi@adambechold.xyz",
      subject: `New Message From ${email}`,
      body,
    });
    return { message: "Message sent!", code: 200 };
  } catch (error) {
    console.error("something went wrong", error);
    return { message: "Something went wrong" };
  }
}
