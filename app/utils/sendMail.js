import fetch from "node-fetch";

/**
 * Sends an email using the Mailjet API.
 * @param {Object} options - The email options.
 * @param {string} options.toAddress - The email address to send the email to.
 * @param {string} options.fromAddress - The email address to send the email from.
 * @param {string} options.subject - The subject of the email.
 * @param {string} options.body - The body of the email.
 */
export async function sendMail({ toAddress, fromAddress, subject, body }) {
  try {
    if (process.env.NODE_ENV === "development") {
      // console.log("Email not sent in development mode.");
      return {
        code: 200,
        data: "Email not sent in development mode.",
      };
      // throw new Error("Email not sent in development mode.");
    }
    const bodyJSON = JSON.stringify({
      Messages: [
        {
          From: {
            Email: fromAddress,
          },
          To: [
            {
              Email: toAddress,
              Name: "Adam Bechtold",
            },
          ],
          Subject: subject,
          TextPart: body,
        },
      ],
    });

    const authString = `${process.env.MAILJET_API_KEY}:${process.env.MAILJET_API_SECRET}`;
    const authStringBase64 = Buffer.from(authString).toString("base64");

    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authStringBase64}`,
      },
      body: bodyJSON,
    });

    const data = await response.text();

    if (data == "Not authorized") {
      throw new Error("Not authorized");
    }
    return {
      data,
      code: response.status,
    };
  } catch (error) {
    console.error("Error Sending Email", error);
    return {
      message: "Something went wrong",
      code: 500,
      error: error.toString(),
    };
  }
}
