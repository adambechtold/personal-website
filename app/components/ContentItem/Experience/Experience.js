import React from "react";
import PropTypes from "prop-types";

import styles from "./Experience.module.css";

const experiences = [
  {
    title: "Product Manager",
    company: "Cosmos",
    dates: "(july 2019 - may 2023)",
  },
  {
    title: "Product Management Co-op",
    company: "Mavrck",
    dates: "(july 2018 - decmeber 2018)",
  },
  {
    title: "Bioinformatics Co-op",
    company: "Editas",
    dates: "(july 2017 - june 2018)",
  },
  {
    title: "Endoscopy R&D Co-op",
    company: "Boston Scientific",
    dates: "(january 2016 - september 2016)",
  },
];

/**
 * Renders a list of experiences.
 *
 * @return {JSX.Element} The rendered list of experiences.
 */
export default function Experience() {
  /**
   * Renders an individual experience item.
   *
   * @param {Object} props - The props for the component.
   * @param {string} props.title - The title of the experience.
   * @param {string} props.company - The company of the experience.
   * @param {string} props.dates - The dates of the experience.
   * @return {JSX.Element} The rendered experience item.
   */
  function ExperienceItem({ title, company, dates }) {
    return (
      <div className={styles.experienceItemContainer}>
        <div>
          <b> {title} </b> @ <b> {company} </b>
        </div>
        <div className={styles.dates}>
          <small> {dates} </small>
        </div>
      </div>
    );
  }

  ExperienceItem.propTypes = {
    title: PropTypes.string.isRequired,
    company: PropTypes.string.isRequired,
    dates: PropTypes.string.isRequired,
  };

  return (
    <>
      {experiences.map((experience) => (
        <ExperienceItem
          key={`${experience.title}-${experience.company}`}
          title={experience.title}
          company={experience.company}
          dates={experience.dates}
        />
      ))}
    </>
  );
}
