import PageLoader from "@/components/PageLoader";
import NavPill from "@/components/NavPill";
import TraceLayer from "@/components/TraceLayer";
import Hero from "@/components/sections/Hero";
import EcosystemSequence from "@/components/sections/EcosystemSequence";
import VoidSequence from "@/components/sections/VoidSequence";
import LaunchpadCTA from "@/components/sections/LaunchpadCTA";

/**
 * Page flow: the page opens DIRECTLY on the scroll-journey hero (loader
 * covers first-frame decode). The hero's final journey frame IS the first frame
 * of EcosystemSequence's descent, so the two run as one unbroken shot: the orb
 * scrubs down into the floor, the activation fires GATED (unskippable), and the
 * hub settles into its idle loop, and Continue journey carries into the white
 * void and on to the Launchpad, which is the terminal state.
 *
 * THE MAIN PAGE IS THE FILM AND NOTHING ELSE. ProductStory, About, Contact and
 * Footer are unmounted — they sat BELOW the Launchpad, which is fixed,
 * full-viewport and kills scroll, so nobody could ever reach them. Their
 * content becomes the nav's own pages (Platform, Products, Why Lumin,
 * Company). The components stay in the repo, ready to move, alongside
 * EcosystemBeat, WhiteOpening and ThreeIsBanner.
 */
export default function Home() {
  return (
    <>
      <PageLoader />
      <NavPill />
      <TraceLayer />
      <main>
        <Hero />
        <EcosystemSequence />
        <VoidSequence />
      </main>
      <LaunchpadCTA />
    </>
  );
}
