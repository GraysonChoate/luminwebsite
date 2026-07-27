/**
 * All landing-page copy slots — first draft, approved for scaffold 2026-07-06.
 * Every string is a placeholder subject to refinement. Slot IDs match the copy brief.
 * ABOUT_BODY was trimmed from the draft to meet its 260-char slot limit.
 */

export const NAV = {
  // Four tabs. "Contact" went because LET'S TALK sits two inches away doing the
  // same job. "About" became "Company", and "Why Lumin" is new — the 30-years/
  // same-20% thesis is the strongest argument on the page and had nowhere to
  // send anyone who wanted more of it. Destinations are placeholders; those
  // sections do not exist yet.
  items: [
    { label: "Platform", anchor: "#platform" },
    { label: "Products", anchor: "#products" },
    { label: "Why Lumin", anchor: "#why" },
    { label: "Company", anchor: "#about" },
  ],
  // "For You" (#for-you) removed with the Business Type Selector — restore both together.
  cta1: "See Demo",
  cta2: "Let's Talk",
};

export const HERO = {
  indicator: "Scroll to explore",
};

/**
 * The 8-beat scroll journey. Captions ride on top of the footage — short,
 * no product names (product detail lives in the ecosystem section).
 * frames = [start, end] index ranges inside the concatenated sequence
 * (measured during clip assembly). Beat 8 has no footage yet: it maps to the
 * held black closing frames, so its caption ships now and the clip drops in
 * later without restructuring.
 */
export const JOURNEY = {
  // 478 filmed frames (f_001–f_478), 7 beats. The old bloom bridge (f_479–599)
  // was removed — the ecosystem is now its own standalone section, so the hero
  // no longer needs a match-cut tail.
  frameCount: 478,
  beats: [
    { id: "check-in", caption: "Every visit becomes a signal.", frames: [0, 69] },
    { id: "consultation", caption: "Leads turn into relationships.", frames: [69, 134] },
    { id: "assessment", caption: "Coaching starts with context.", frames: [134, 200] },
    { id: "training-floor", caption: "The environment becomes intelligent.", frames: [200, 265] },
    { id: "station", caption: "Unused space becomes an experience.", frames: [265, 330] },
    { id: "studio", caption: "Classes move as one connected system.", frames: [330, 396] },
    { id: "fuel", caption: "Progress continues beyond the workout.", frames: [396, 477] },
  ],
};

export const OPENING = {
  eyebrow: "Lumin",
  statement: ["One connected system", "for how people move."],
};

export const PARTNERS = {
  headline: ["Trusted by operators, trainers,", "and clinicians who move fitness forward."],
  // Placeholder tiles until real partner marks are approved
  logoCount: 12,
};

export const PRODUCT = {
  eyebrow: "How Lumin Works",
  steps: [
    "Trainer by Lumin runs your training practice, start to finish",
    "Studio by Lumin programs group fitness across every location",
    "Academy by Lumin turns your SOPs into full training courses",
    "Connect by Lumin keeps your sales team and leads in sync",
    "Fuel by Lumin extends coaching into nutrition, session to plate",
    "Insights by Lumin shows you what's working and what's next",
  ],
};

export const REVEAL = {
  eyebrow: "It all becomes",
  word: "lumin",
  tagline: "It's Your Move.",
};

export const SEGMENTS = {
  eyebrow: "Built for your business",
  headline: ["Every business moves differently.", "Find where you fit."],
  items: [
    {
      name: "Service-Based Fitness",
      headline: "Retention and revenue, built into every location.",
      body: "Trainer, Studio, Connect, and Insights by Lumin work as one system behind your operation. Trainers run better sessions. Managers see what's working. Members stay longer.",
      cta: "Explore for Studios",
    },
    {
      name: "Amenity-Based Fitness",
      headline: "A five-star amenity, without adding headcount.",
      body: "Station by Lumin turns any space into a self-guided fitness experience. No trainer needed, no staffing added. Your residents and guests get a premium amenity that runs itself.",
      cta: "Explore for Amenities",
    },
    {
      name: "Rehab & Clinical",
      headline: "Protocol adherence, made visible and measurable.",
      body: "Station by Lumin adds EMG integration and protocol intelligence to your clinic. Clinicians see adherence in real time. Documentation writes itself, so care stays the focus.",
      cta: "Explore for Clinics",
    },
  ],
};

export const ABOUT = {
  eyebrow: "Our Origin",
  headline: ["We started as a studio.", "Then we built the system", "underneath it all."],
  body: "Lumin began as a boutique fitness studio, built on the Three I's: Intelligent, Interactive, Individualized. So we became the system that runs underneath it all — grounded AI that keeps humans in control.",
};

export const CTA = {
  headline: ["Ready to make your move?", "Let's talk about your fit."],
  sub: "Tell us about your business, and we'll show you where Lumin fits.",
  fields: [
    { key: "firstName", label: "First name", required: true, half: true, type: "text" },
    { key: "lastName", label: "Last name", required: true, half: true, type: "text" },
    { key: "phone", label: "Phone", required: false, half: true, type: "tel" },
    { key: "email", label: "Email", required: true, half: true, type: "email" },
    { key: "company", label: "Business name", required: true, half: false, type: "text" },
    { key: "role", label: "Role or position", required: false, half: false, type: "text" },
  ],
  selectLabel: "What are you looking for?",
  selectPlaceholder: "Select an option",
  options: ["Product Demo", "Discovery Call", "Partnership Conversation", "Pricing & Pilot Info"],
  submit: "Request Call",
};

export const FOOTER = {
  headline: ["The operating system", "for what moves you next."],
};
