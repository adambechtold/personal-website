/* eslint-disable require-jsdoc */
import React from "react";

import styles from "./Introduction.module.css";

export default function Introduction() {
  return (
    <div className={styles.container}>
      <p>
        {
          "I'm Adam, a technical Product Manager diving into the world of computational biology research."
        }
      </p>
      <p>
        {
          "After ~4 years in Climate Tech, I'm coming back to my biology roots to build on my experiences at Editas and Boston Scientific. I'm looking for roles that allow me to work closely with scientists, clinicians, and computational biologists to turbocharge their work. We're almost 1/4 through the "
        }
        <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC419918/">
          Century of Biology
        </a>
        {
          ", and there's still so much more to discover. Few words capture my imagination quite like these—"
        }
      </p>
      <div className={styles.quote}>
        <p>
          {
            "Imagine a flashy spaceship lands in your backyard. The door opens and you are invited to investigate everything to see what you can learn. The technology is clearly millions of years beyond what we can make."
          }
        </p>
        <p>This is biology.</p>
        <p>
          - Ben Hubert,{" "}
          <a href="https://berthub.eu/articles/posts/immune-system/">
            {'"Our Amazing Immune System"'}
          </a>
        </p>
      </div>
      <p>
        {
          "In the meantime, I'm taking courses in bioinformatics & biology, reading research papers, cooking dishes from recent trips to "
        }
        <a href="https://www.chilipeppermadness.com/recipes/mojo-picon/">
          Spain
        </a>
        {" and "}
        <a href="https://foreignfork.com/red-chimichurri/">Argentina</a>, and
        working on preventing others (and myself) from{" "}
        <a href="https://github.com/adambechtold/trailhead">
          getting lost in the woods so much.
        </a>
      </p>
    </div>
  );
}
