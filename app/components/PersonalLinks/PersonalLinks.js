import React from "react";
import Image from "next/image";
import styles from "./PersonalLinks.module.css";
import PropTypes from "prop-types";

/**
 * Renders a list of links for more information about Adam Bechtold.
 * @return {JSX.Element} PersonalLinks component.
 */
export default function PersonalLinks() {
  /**
   * Renders a link with an icon.
   * @param {Object} props - The props for the Link component.
   * @param {string} props.href - The URL for the link.
   * @param {string} props.src - The URL for the icon image.
   * @param {string} props.alt - The alt text for the icon image.
   * @return {JSX.Element} Link component.
   */
  function Link({ href, src, alt }) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        <Image src={src} alt={alt} width={32} height={32} priority />
      </a>
    );
  }

  Link.propTypes = {
    href: PropTypes.string.isRequired,
    src: PropTypes.string.isRequired,
    alt: PropTypes.string.isRequired,
  };

  return (
    <div className={styles.container}>
      <Link
        href="https://www.linkedin.com/in/adamcbechtold/"
        src="/icons/icon-linkedin.png"
        alt="LinkedIn Logo"
      />
      <Link
        href="https://github.com/adambechtold"
        src="/icons/icon-github.png"
        alt="GitHub Logo"
      />
      <Link
        href="mailto:adamcbechtold@gmail.com"
        src="/icons/icon-email.png"
        alt="Email Icon"
      />
    </div>
  );
}
