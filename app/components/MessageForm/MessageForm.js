"use client";

import React from "react";
import { messageAdam } from "../../actions";

/* eslint-disable require-jsdoc */
export default function MessageForm() {
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");

  async function onSubmit(formData) {
    const response = await messageAdam(formData);

    if (response.code === 200) {
      // TODO: confirm the message was sent
      setEmail("");
      setMessage("");
    } else {
      alert(`Something went wrong, try again! Message: ${response.message}}`);
    }
  }

  return (
    <form action={onSubmit}>
      <label htmlFor="email">
        Your Email Address
        <input
          name="email"
          type="email"
          id="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
        />
      </label>
      <label htmlFor="message">
        Message
        <textarea
          name="message"
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Let me know what you're up to!"
          required
        />
      </label>
      <button type="submit">Send</button>
    </form>
  );
}
