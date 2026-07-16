import PageLoader from "@/components/PageLoader";
import NavPill from "@/components/NavPill";
import TraceLayer from "@/components/TraceLayer";
import NotchDivider from "@/components/ui/NotchDivider";
import Hero from "@/components/sections/Hero";
import EcosystemBeat from "@/components/sections/EcosystemBeat";
import ProductStory from "@/components/sections/ProductStory";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/sections/Footer";

/**
 * Page flow: the page opens DIRECTLY on the scroll-journey hero (loader
 * covers first-frame decode). The hero's held-black tail flows dark-into-dark
 * into EcosystemBeat (desktop: the R3F ecosystem scene unfolding on scroll;
 * touch/small screens: the classic BrandReveal converge), which notches to
 * the white ProductStory (suite highlight loop) → About → Contact → Footer.
 * WhiteOpening / ThreeIsBanner remain in the repo, unmounted.
 */
export default function Home() {
  return (
    <>
      <PageLoader />
      <NavPill />
      <TraceLayer />
      <main>
        <Hero />
        <EcosystemBeat />
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
