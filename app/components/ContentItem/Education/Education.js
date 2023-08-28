/* eslint-disable require-jsdoc */
import React from "react";

const experiences = [
  {
    title: "Director of Technology",
    organization: {
      name: "Scout",
      link: "https://scout.camd.northeastern.edu/",
    },
  },
  {
    title: "President",
    organization: {
      name: "TAMID Group",
      link: "https://nutamid.org/",
    },
  },
  {
    title: "Research Assistant",
    organization: {
      name: "Massachusetts General Hospital, Barret Lab",
      link: "https://www.affective-science.org/",
    },
  },
];

export default function Education() {
  return (
    <div>
      <p>
        <b>Northeastern University</b> <br />
        BS Computer Science, May 2019 <br />
        BS Computer Engineering, May 2019
      </p>
      <p>
        {experiences.map((experience) => (
          <>
            <i key={`${experience.title}-${experience.organization.name}`}>
              - {experience.title} @{" "}
              <a href={experience.organization.link}>
                {experience.organization.name}
              </a>
            </i>
            <br />
          </>
        ))}
      </p>
    </div>
  );
}
