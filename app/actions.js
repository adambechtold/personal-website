/* eslint-disable require-jsdoc */
"use server";

export async function messageAdam(formData) {
  try {
    const email = formData.get("email");
    const message = formData.get("message");
    console.log(`Email: ${email}\nMessage: ${message}, Email: ${email}`);
    return { message: "Message sent!", code: 200 };
  } catch (error) {
    console.error("something went wrong", error);
    return { message: "Something went wrong" };
  }
}
