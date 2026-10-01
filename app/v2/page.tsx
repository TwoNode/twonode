import { Opening } from "./components/Opening";
import { HowWeBuild } from "./components/HowWeBuild";
import { Industries } from "./components/Industries";
import { BiggerIdea } from "./components/BiggerIdea";
import { WhatWeBelieve } from "./components/WhatWeBelieve";
import { Proof } from "./components/Proof";
import { OurStory } from "./components/OurStory";
import { InsideTwoNode } from "./components/InsideTwoNode";
import { WhatsNext } from "./components/WhatsNext";

/**
 * The homepage reads as one continuous story (per the PRB), in the exact
 * section order the brief specifies. Do not reorder without re-reading
 * out/TwoNode Website.pdf §5–13 — the progression (who are these people? →
 * how do they think? → what industries? → what have they built? → what's
 * next?) is called out there as intentional.
 */
export default function V2HomePage() {
  return (
    <>
      <Opening />
      <HowWeBuild />
      <Industries />
      <BiggerIdea />
      <WhatWeBelieve />
      <Proof />
      <OurStory />
      <InsideTwoNode />
      <WhatsNext />
    </>
  );
}
