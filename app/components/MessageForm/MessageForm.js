"use client";

/* eslint-disable require-jsdoc */
import React from "react";

export default function MessageForm() {
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");

  const handleSubmit = (event) => {
    // event.preventDefault(); // Prevents default refresh by the browser - look this up before implementing it. It was suggested by copilot

    // send the message to the backend
    alert(
      `Message sent! Thank you for reaching out to me. I will get back to you as soon as possible.\nYou sent: ${message}`
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">
        Email
        <input
          name="email"
          type="email"
          id="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email Address"
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
