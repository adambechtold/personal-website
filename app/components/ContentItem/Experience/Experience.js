import React from "react";
import PropTypes from "prop-types";

import styles from "./Experience.module.css";

const experiences = [
  {
    title: "Software Engineer",
    company: {
      name: "VibeIq",
      url: "https://www.vibeiq.com",
    },
    dates: "(march 2024 - present)",
  },
  {
    title: "Product Manager",
    company: {
      name: "Cosmos",
      url: "https://www.cosmos.space",
    },
    dates: "(july 2019 - may 2023)",
  },
  {
    title: "Product & Software Co-op",
    company: {
      name: "Mavrck",
      url: "https://www.mavrck.co",
    },
    dates: "(july 2018 - december 2018)",
  },
  {
    title: "Bioinformatics Co-op",
    company: {
      name: "Editas",
      url: "https://www.editasmedicine.com",
    },
    dates: "(july 2017 - june 2018)",
  },
  {
    title: "Endoscopy R&D Co-op",
    company: {
      name: "Boston Scientific",
      url: "https://www.bostonscientific.com",
    },
    dates: "(january 2016 - september 2016)",
  },
];

/**
 * Renders a list of experiences.
 *
 * @return {JSX.Element} The rendered list of experiences.
 */
export default function Experience() {
  return (
    <>
      {experiences.map((experience) => (
        <ExperienceItem
          key={`${experience.title}-${experience.company}`}
          title={experience.title}
          company={experience.company}
          dates={experience.dates}
          link={experience.link}
        />
      ))}
    </>
  );
}

/**
 * Renders an individual experience item.
 *
 * @param {Object} props - The props for the component.
 * @param {string} props.title - The title of the experience.
 * @param {string} props.company.name - The name of company of the experience.
 * @param {string} props.company.url - The link to the company.
 * @param {string} props.dates - The dates of the experience.
 * @return {JSX.Element} The rendered experience item.
 */
function ExperienceItem({ title, company, dates }) {
  return (
    <div className={styles.container} key={`${title}-${company.name}`}>
      <div>
        <b> {title} </b> @ <a href={company.url}>{company.name}</a>
      </div>
      <div className={styles.dates}>
        <small> {dates} </small>
      </div>
    </div>
  );
}

ExperienceItem.propTypes = {
  title: PropTypes.string.isRequired,
  company: PropTypes.shape({
    name: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
  }).isRequired,
  dates: PropTypes.string.isRequired,
};
