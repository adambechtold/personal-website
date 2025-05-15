import React from "react";
import PropTypes from "prop-types";

import styles from "./Projects.module.css";

const projects = [
  {
    title: "Trailhead",
    logo: {
      imgUrl: "/trailhead-logo.png",
      alt: "Trailhead logo",
    },
    description:
      "Never get lost. Create a GPS-enabled map while you're on the trail. No internet connection required.",
    link: "https://www.trailhead-maps.com",
    githubLink: "https://github.com/adambechtold/trailhead",
  },
  {
    title: "Taste Explorer",
    logo: {
      imgUrl: "/taste-explorer-logo.png",
      alt: "Taste Explorer logo",
    },
    description:
      "Explore the differences between your music taste and your friends'. Generate playlists that highlight the similarities and differences.",
    githubLink: "https://github.com/adambechtold/taste-explorer",
  },
];

/**
 * Renders a list of projects.
 *
 * @return {JSX.Element} The rendered list of projects.
 */
export default function Projects() {
  return (
    <div className={styles["all-projects-container"]}>
      {projects.map((project) => (
        <ProjectItem
          key={`${project.title}`}
          title={project.title}
          logo={project.logo}
          description={project.description}
          link={project.link}
          githubLink={project.githubLink}
        />
      ))}
    </div>
  );
}

/**
 * Renders an individual project item.
 *
 * @param {Object} props - The props for the component.
 * @param {string} props.title - The title of the project.
 * @param {Object} props.logo - The logo of the project.
 * @param {string} props.logo.imgUrl - The URL of the logo image.
 * @param {string} props.logo.alt - The alt text for the logo image.
 * @param {string} props.description - The description of the project.
 * @param {string} props.link - The link to the project.
 * @param {string} props.githubLink - The link to the project's GitHub repository.
 * @return {JSX.Element} The rendered project item.
 */
function ProjectItem({ title, logo, description, link, githubLink }) {
  const isUnderMaintenance = !link;

  const tryNowJsx = isUnderMaintenance ? (
    <span>Under Maintenance</span>
  ) : (
    <a href={link} className={styles["primary-link"]}>
      Try It Now
    </a>
  );

  return (
    <div className={styles["single-project-container"]} key={`${title}`}>
      <div className={styles["logo"]}>
        <img src={logo.imgUrl} alt={logo.alt} className={styles["logo-img"]} />
      </div>
      <div>{description}</div>
      <div className={styles["links-container"]}>
        {tryNowJsx}
        <a href={githubLink}>See The Code</a>
      </div>
    </div>
  );
}

ProjectItem.propTypes = {
  title: PropTypes.string.isRequired,
  logo: PropTypes.shape({
    imgUrl: PropTypes.string.isRequired,
    alt: PropTypes.string.isRequired,
  }).isRequired,
  description: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
  githubLink: PropTypes.string.isRequired,
};
