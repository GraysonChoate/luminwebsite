import PageLoader from "@/components/PageLoader";
import NavPill from "@/components/NavPill";
import TraceLayer from "@/components/TraceLayer";
import NotchDivider from "@/components/ui/NotchDivider";
import Hero from "@/components/sections/Hero";
import EcosystemSequence from "@/components/sections/EcosystemSequence";
import VoidSequence from "@/components/sections/VoidSequence";
import ProductStory from "@/components/sections/ProductStory";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/sections/Footer";

/**
 * Page flow: the page opens DIRECTLY on the scroll-journey hero (loader
 * covers first-frame decode). The hero's final journey frame IS the first frame
 * of EcosystemSequence's descent, so the two run as one unbroken shot: the orb
 * scrubs down into the floor, the activation fires GATED (unskippable), and the
 * hub settles into its idle loop for a soft dwell. That notches to the white
 * ProductStory (suite highlight loop) → About → Contact → Footer.
 * EcosystemBeat (the old R3F scene), WhiteOpening and ThreeIsBanner remain in
 * the repo, unmounted.
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
        <NotchDivider />
        <ProductStory />
        <About />
        <NotchDivider color="var(--c-light)" bg="var(--c-cosmos)" />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
