/* eslint-disable require-jsdoc */
import React from "react";

const experiences = [
  {
    title: "Director of Technology",
    organization: "Scout",
  },
  {
    title: "President",
    organization: "TAMID Group",
  },
  {
    title: "Research Assistant",
    organization: "Massachusetts General Hospital, Barret Lab",
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
            <i key={`${experience.title}-${experience.organization}`}>
              {experience.title} @ {experience.organization}
            </i>
            <br />
          </>
        ))}
      </p>
    </div>
  );
}
