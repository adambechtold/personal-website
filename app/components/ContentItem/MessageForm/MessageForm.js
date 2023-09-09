"use client";

import React from "react";
import { useReducer } from "react";
import { messageAdam } from "@/app/actions";
import { messageReducer, INITIAL_STATE } from "./messageReducer";
import styles from "./MessageForm.module.css";
import SuccessfulSendEmoji from "./SuccessfulSendEmoji";

/* eslint-disable require-jsdoc */
export default function MessageForm() {
  const [messageState, messageDispatch] = useReducer(
    messageReducer,
    INITIAL_STATE
  );

  const [email, setEmail] = React.useState("test@test.com");
  const [message, setMessage] = React.useState("Test");

  async function onSubmit(formData) {
    messageDispatch({ type: "MESSAGE_START" });
    const response = await messageAdam(formData);

    if (response.code === 200) {
      // TODO: confirm the message was sent
      messageDispatch({ type: "MESSAGE_SUCCESS" });
      setEmail("");
      setMessage("");
    } else {
      messageDispatch({ type: "MESSAGE_ERROR" });
      console.log(
        `Something went wrong, try again! Message: ${response.message}}`
      );
    }
  }

  const form = (
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

  if (messageState.success) {
    return (
      <>
        {"✅ Message received! I'll reach out soon!"}
        <SuccessfulSendEmoji />
        <div className={styles.hide}>{form}</div>
      </>
    );
  }

  if (messageState.loading) {
    return (
      <>
        {"🔄 Sending"}
        <div className={styles.hide}>{form}</div>
      </>
    );
  }

  if (messageState.error) {
    return (
      <>
        {
          "❌ Something went wrong. Try using the email logo by my profile picture."
        }
        <div className={styles.hide}>{form}</div>
      </>
    );
  }

  return form;
}
