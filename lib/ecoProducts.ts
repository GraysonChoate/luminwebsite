/**
 * The eleven ecosystem product briefs — the single source of truth for node
 * copy, shared by the /connect-hud prototype and the live ecosystem section.
 *
 * ── THE RULE THIS FILE EXISTS TO PROTECT ─────────────────────────────────
 * Each node opens ITS OWN brief. There is no product rail, tab strip, chip
 * selector or carousel inside an opened HUD, and there must never be one:
 * that mistake is what turned eleven cinematic node briefs into one combined
 * product directory. To see another product you return to the ecosystem and
 * pick another node. Data for all eleven lives here; only the selected one is
 * ever on screen.
 *
 * `position` is a percentage of the VIDEO FRAME, not of the page — the caller
 * maps it through the video's object-fit: cover rect.
 */

export type ProductHud = {
  id: string;
  label: string;
  suite: "Lumin Pro" | "Lumin One";
  accent: "blue" | "violet";
  position: { left: string; top: string };
  headline: string;
  brief: string;
  proofSignals: [string, string][];
  capabilities: { label: string; detail: string }[];
  intelligenceTitle: string;
  signalRows: [string, string][];
  footer: string[];
};

export const ECO_PRODUCTS: ProductHud[] =
 [
  {
    id: "command-center",
    label: "Command Center",
    suite: "Lumin Pro",
    accent: "blue",
    position: { left: "40.16%", top: "30.74%" },
    headline: "Run your team, not just your gym.",
    brief:
      "Command Center gives operators one coordinated layer for launches, buildouts, staff initiatives, and the operational projects that usually disappear between tools.",
    proofSignals: [
      ["Work Visibility", "Every initiative mapped"],
      ["Team Alignment", "Owners and next steps clear"],
      ["Operator Control", "Progress stays in view"],
    ],
    capabilities: [
      { label: "Operational Project Command", detail: "Projects, milestones, owners, and deadlines organized around the work fitness teams actually run." },
      { label: "Launch + Buildout Tracking", detail: "Campaigns, openings, facility changes, and rollouts move through one shared operating view." },
      { label: "Team Coordination", detail: "Managers see what is active, what is blocked, and who owns the next move." },
      { label: "Connected Work Layer", detail: "Operational work stays attached to the same Pro environment as the rest of the business." },
      { label: "Initiative Memory", detail: "Decisions, updates, and handoffs stay visible instead of living in scattered messages." },
      { label: "Executive Oversight", detail: "Leadership can scan priorities and intervene before small misses become expensive delays." },
    ],
    intelligenceTitle: "The work behind the business becomes visible and coordinated.",
    signalRows: [
      ["Active Work", "Launches, tasks, projects, and blockers organized in one place"],
      ["Ownership", "Every initiative has a responsible team member and next action"],
      ["Momentum", "Managers see what is moving and what needs attention"],
      ["Operating Memory", "Context survives shift changes, handoffs, and team growth"],
    ],
    footer: ["Project command", "Team oversight", "Launch tracking", "Operator visibility"],
  },
  {
    id: "academy",
    label: "Academy",
    suite: "Lumin Pro",
    accent: "blue",
    position: { left: "24.43%", top: "35.46%" },
    headline: "Turn every SOP into training your team can actually finish.",
    brief:
      "Academy transforms documents, manuals, and procedures into structured courses with modules, quizzes, AI-narrated videos, and completion tracking.",
    proofSignals: [
      ["Course Build", "Generated in minutes"],
      ["Knowledge Check", "Quizzes built in"],
      ["Team Readiness", "Progress visible"],
    ],
    capabilities: [
      { label: "Document Ingestion", detail: "Upload an SOP, manual, or process doc and turn it into a structured learning path." },
      { label: "AI Course Generation", detail: "Modules, lesson structure, slide content, and quizzes are created from the source material." },
      { label: "Narrated Video Modules", detail: "AI-narrated explainers give teams a more engaging path than another static PDF." },
      { label: "Pass/Fail Gates", detail: "Auto-generated checks verify whether the material actually landed." },
      { label: "Completion Tracking", detail: "Operators see individual and org-wide progress from one shared system." },
      { label: "Shared Lumin Login", detail: "Training lives inside the same operating layer instead of becoming another silo." },
    ],
    intelligenceTitle: "Training becomes structured, measurable, and repeatable.",
    signalRows: [
      ["Source Upload", "SOPs and documents become course material"],
      ["Module Builder", "Lessons, quizzes, and videos assemble automatically"],
      ["Verification", "Pass/fail gates confirm operational knowledge"],
      ["Progress View", "Managers see who is ready and who needs support"],
    ],
    footer: ["SOP ingestion", "AI course builder", "Quiz gates", "Completion tracking"],
  },
  {
    id: "asset-management",
    label: "Asset Management",
    suite: "Lumin Pro",
    accent: "blue",
    position: { left: "14.79%", top: "47.87%" },
    headline: "Know what you own, where it is, and what needs attention.",
    brief:
      "Asset Management creates a live operating record for the equipment, spaces, and facility assets that keep the business running.",
    proofSignals: [
      ["Asset Record", "Always current"],
      ["Service Status", "Visible instantly"],
      ["Facility Control", "No blind spots"],
    ],
    capabilities: [
      { label: "Equipment Inventory", detail: "Track facility assets, equipment, locations, and ownership context in one place." },
      { label: "Maintenance Status", detail: "See what is healthy, what needs service, and what is drifting toward downtime." },
      { label: "Service History", detail: "Keep maintenance records attached to the asset instead of buried in disconnected notes." },
      { label: "Location Awareness", detail: "Understand where every operational asset lives across rooms, facilities, or locations." },
      { label: "Operator Context", detail: "Facility decisions connect to the broader Lumin Pro operating layer." },
      { label: "Downtime Prevention", detail: "Teams can act before neglected assets turn into member-facing problems." },
    ],
    intelligenceTitle: "The physical business becomes part of the operating system.",
    signalRows: [
      ["Inventory", "Equipment and facility assets mapped into a live record"],
      ["Condition", "Status and service needs surfaced clearly"],
      ["Ownership", "Every asset has location and accountability context"],
      ["Readiness", "Operators spot maintenance risk before it hurts the experience"],
    ],
    footer: ["Asset inventory", "Service status", "Facility context", "Maintenance history"],
  },
  {
    id: "connect",
    label: "Connect",
    suite: "Lumin Pro",
    accent: "blue",
    position: { left: "32.14%", top: "47.87%" },
    headline: "Turn every conversation into a clearer path to conversion.",
    brief:
      "Connect is the fitness CRM built for high-velocity sales teams. It unifies prospect data, calls, texts, workflows, pipeline visibility, and AI-supported coaching so every rep knows who to contact, what to say, and what moves the deal forward.",
    proofSignals: [
      ["Speed to Lead", "Routed instantly"],
      ["Cadence Control", "Every step orchestrated"],
      ["Conversion Intelligence", "Coach what closes"],
    ],
    capabilities: [
      { label: "Unified Prospect Command", detail: "Every lead, owner, conversation, stage, and next step held in one sales operating layer." },
      { label: "Contextual Calling + Texting", detail: "Reps call and text from the platform with history, scripts, and outcomes attached." },
      { label: "Cadence Orchestration", detail: "Follow-up becomes a governed sequence of tasks, timing, scripts, and conversion stages." },
      { label: "Live Pipeline Intelligence", detail: "Managers see movement, stalls, rep activity, and close opportunities as they happen." },
      { label: "AI Conversion Review", detail: "Recent calls and texts are analyzed for language, timing, risk, and behaviors that convert." },
      { label: "Sales Team Command", detail: "Coach from real communication data instead of chasing updates or waiting for reports." },
    ],
    intelligenceTitle: "The sales floor becomes visible, coachable, and repeatable.",
    signalRows: [
      ["Source Sync", "Prospects and member context pulled from the system of record"],
      ["Next Best Step", "Owner, action, timing, and talk track surfaced in one view"],
      ["Rep Performance", "Calls, texts, workflow adherence, and response quality"],
      ["Conversion Signal", "Patterns that reveal what is actually moving the pipeline"],
    ],
    footer: ["Prospect sync", "Call + text cadences", "AI-reviewed conversations", "Manager-level visibility"],
  },
  {
    id: "loops",
    label: "Loops",
    suite: "Lumin Pro",
    accent: "blue",
    position: { left: "24.43%", top: "62.87%" },
    headline: "Your members already have the app. It is their wallet.",
    brief:
      "Loops turns referral, engagement, and member activation into wallet-first growth. No app download. No account creation. A branded pass lives where members already look.",
    proofSignals: [
      ["Activation", "Scan and save"],
      ["Reach", "Lock-screen native"],
      ["Referral Flow", "Tracked automatically"],
    ],
    capabilities: [
      { label: "Wallet Pass Activation", detail: "Members save a branded Apple or Google Wallet pass the moment they scan a QR code." },
      { label: "Lock-Screen Messaging", detail: "Push notifications arrive where members actually see them, without another app." },
      { label: "One-Tap Guest Passes", detail: "Members can share guest access with less friction and automatic referral tracking." },
      { label: "Walk-In Capture", detail: "AirDrop and QR-based capture help convert real-world interest into usable lead flow." },
      { label: "Browser Check-In", detail: "Front-desk scanning works without adding hardware complexity." },
      { label: "System Integration", detail: "Referral and engagement data connects back to member management systems." },
    ],
    intelligenceTitle: "Member advocacy becomes a measurable growth loop.",
    signalRows: [
      ["Pass Creation", "Member scans once and saves the branded pass"],
      ["Engagement", "Messages reach the lock screen without app friction"],
      ["Sharing", "Guest passes move through native phone behavior"],
      ["Attribution", "Referral activity ties back to member and lead outcomes"],
    ],
    footer: ["Wallet passes", "Lock-screen push", "Guest pass sharing", "Referral tracking"],
  },
  {
    id: "core",
    label: "Core",
    suite: "Lumin Pro",
    accent: "blue",
    position: { left: "38.65%", top: "68.70%" },
    headline: "The system that runs your gym. Finally intelligent.",
    brief:
      "Core is the AI-infused member management foundation for memberships, billing, scheduling, operations, and the shared data layer every other Lumin Pro product connects to.",
    proofSignals: [
      ["Foundation", "One operating record"],
      ["AI Layer", "Attention surfaced"],
      ["System Fit", "Connects without chaos"],
    ],
    capabilities: [
      { label: "Member Management", detail: "Memberships, billing, scheduling, and daily operations live in the operational backbone." },
      { label: "AI-Infused Operations", detail: "The system surfaces what needs attention before it becomes a member-facing problem." },
      { label: "Shared Data Layer", detail: "Every other Lumin Pro product can plug into the same operating foundation." },
      { label: "Existing System Connection", detail: "Core is designed around connection rather than forcing every operator into a risky rebuild." },
      { label: "Business Continuity", detail: "Operational context stays intact as more products activate." },
      { label: "Intelligent Backbone", detail: "The business gains a smarter foundation for sales, service, retention, and team operations." },
    ],
    intelligenceTitle: "The operational backbone becomes connected and aware.",
    signalRows: [
      ["Member Record", "Membership, billing, scheduling, and operations connected"],
      ["Business Signals", "Important attention points surfaced in context"],
      ["Data Layer", "Pro products share the same foundation"],
      ["Growth Path", "Start with one product and expand without rebuilding"],
    ],
    footer: ["Member management", "Billing + scheduling", "AI-infused operations", "Shared data foundation"],
  },
  {
    id: "move",
    label: "Move",
    suite: "Lumin One",
    accent: "violet",
    position: { left: "59.38%", top: "31.20%" },
    headline: "One movement platform. Infinite ways to express it.",
    brief:
      "Move is the engine behind personal training, group training, physical therapy, and AI coaching. One intelligent movement system adapts to how each member trains.",
    proofSignals: [
      ["Program Build", "Structured fast"],
      ["Adaptation", "Based on what happened"],
      ["Coach Control", "Human-led"],
    ],
    capabilities: [
      { label: "Personal Training Engine", detail: "AI generates structured programs while the coach reviews, guides, and owns the relationship." },
      { label: "Group Training Expression", detail: "One class can become a different experience for every member in the room." },
      { label: "Physical Therapy Protocols", detail: "Protocol-driven programming tracks adherence and preserves patient session history." },
      { label: "AI Coaching Mode", detail: "Real-time coaching can count reps, assess form, and adapt live through supported hardware." },
      { label: "Progression Intelligence", detail: "Programming adjusts to what members actually log, not only what was prescribed." },
      { label: "Unified Movement Profile", detail: "Training context follows the member across coaching formats." },
    ],
    intelligenceTitle: "Movement becomes adaptive across every coaching format.",
    signalRows: [
      ["Prescription", "Programs generated around goals and constraints"],
      ["Expression", "PT, group, clinical, and AI coaching use the same movement engine"],
      ["Logging", "Actual work completed informs what comes next"],
      ["Human Ceiling", "AI raises the floor while the coach sets the ceiling"],
    ],
    footer: ["Personal training", "Group training", "Physical therapy", "AI coach"],
  },
  {
    id: "studio",
    label: "Studio",
    suite: "Lumin One",
    accent: "violet",
    position: { left: "75.05%", top: "35.74%" },
    headline: "A connected class experience, personalized to the room.",
    brief:
      "Studio brings the Lumin One experience into group and class environments so programming, display, coaching context, and member participation feel connected.",
    proofSignals: [
      ["Class Flow", "Room synchronized"],
      ["Member Context", "Personalized inside group"],
      ["Coach Support", "More control on floor"],
    ],
    capabilities: [
      { label: "Connected Class Environment", detail: "The room, programming, display, and member experience work as one coordinated system." },
      { label: "Centralized Programming", detail: "Operators can maintain programming standards while still adapting to the people in class." },
      { label: "Live Kiosk Display", detail: "Timers, demos, and class flow become visible without pulling coaches out of the session." },
      { label: "Per-Member Customization", detail: "Group training can still respect individual goals, ability, and history." },
      { label: "Coach-Led Experience", detail: "Technology supports the coach instead of taking over the room." },
      { label: "Member Memory", detail: "Class participation can connect back to the broader member experience." },
    ],
    intelligenceTitle: "Group training feels coordinated, personal, and alive.",
    signalRows: [
      ["Class Plan", "Programming and timing structured before the session"],
      ["Room Display", "Members and coaches share the same visual flow"],
      ["Personalization", "Individual context stays present inside a group format"],
      ["Experience Loop", "Class activity informs the member journey"],
    ],
    footer: ["Class display", "Group personalization", "Coach support", "Connected programming"],
  },
  {
    id: "station",
    label: "Station",
    suite: "Lumin One",
    accent: "violet",
    position: { left: "84.74%", top: "47.78%" },
    headline: "Turn any TV into an intelligent training unit.",
    brief:
      "Station uses the Lumin Dock to make a screen intelligent: movement tracking, rep counting, form feedback, and interactive AI-coached workouts powered by Move.",
    proofSignals: [
      ["Hardware Layer", "Dock-powered"],
      ["Live Feedback", "Movement-aware"],
      ["Screen Utility", "Any TV upgraded"],
    ],
    capabilities: [
      { label: "Lumin Dock", detail: "Turns an ordinary TV into an AI training unit without a dedicated single-purpose machine." },
      { label: "Movement Tracking", detail: "Station tracks motion so the experience can respond to what the member is doing." },
      { label: "Rep Counting", detail: "The system helps count work in real time and maintain session structure." },
      { label: "Form Feedback", detail: "Members receive live guidance that makes the screen more than passive media." },
      { label: "AI-Coached Workouts", detail: "Interactive workouts are powered by the Move engine and adapted to the member." },
      { label: "Floor Sensor Extension", detail: "Station can also express on selectorized equipment through supported sensors." },
    ],
    intelligenceTitle: "The screen becomes an active coaching surface.",
    signalRows: [
      ["Input", "Movement and session behavior are detected"],
      ["Guidance", "AI coaching responds in real time"],
      ["Output", "Rep counts, demos, and feedback become visible"],
      ["Continuity", "Station activity connects back to Move"],
    ],
    footer: ["Lumin Dock", "Rep counting", "Form feedback", "AI workouts"],
  },
  {
    id: "market",
    label: "MRKT",
    suite: "Lumin One",
    accent: "violet",
    position: { left: "75.10%", top: "62.96%" },
    headline: "A marketplace for everything that supports the work.",
    brief:
      "MRKT is the connected marketplace for supplemental wellness: supplements, TRT, HRT, peptides, and related categories that support member progress and operator revenue.",
    proofSignals: [
      ["Wellness Surface", "Curated offers"],
      ["Member Context", "Connected to goals"],
      ["Revenue Path", "New channel opened"],
    ],
    capabilities: [
      { label: "Curated Wellness Marketplace", detail: "A premium surface for supplements and broader supplemental wellness categories." },
      { label: "Training Context", detail: "Offers can align with how the member trains, fuels, and progresses." },
      { label: "Operator Revenue Surface", detail: "The member experience creates a new path for relevant wellness revenue." },
      { label: "Member Journey Fit", detail: "Shopping sits inside the same Lumin One world rather than feeling bolted on." },
      { label: "Category Expansion", detail: "The platform can support adjacent wellness categories as the business grows." },
      { label: "Connected Experience", detail: "MRKT is designed to reflect the member's broader training and nutrition context." },
    ],
    intelligenceTitle: "Supplemental wellness becomes part of the connected member journey.",
    signalRows: [
      ["Context", "Member activity informs what feels relevant"],
      ["Offer Surface", "Curated products live inside the experience"],
      ["Conversion", "Operators gain a connected wellness revenue channel"],
      ["Continuity", "Marketplace behavior can inform the broader profile"],
    ],
    footer: ["Supplements", "TRT + HRT", "Peptides", "Wellness marketplace"],
  },
  {
    id: "fuel",
    label: "Fuel",
    suite: "Lumin One",
    accent: "violet",
    position: { left: "60.78%", top: "68.70%" },
    headline: "Nutrition coaching, with a real dietitian built in.",
    brief:
      "Fuel prescribes nutrition the way Move prescribes training: personalized, adaptive, familiar to track, and supported by registered dietitian coaching.",
    proofSignals: [
      ["Nutrition Plan", "Personalized"],
      ["Human Support", "RD-backed"],
      ["Training Context", "Connected"],
    ],
    capabilities: [
      { label: "Personalized Nutrition Prescription", detail: "Nutrition guidance adapts around the member's goals, profile, and training context." },
      { label: "Registered Dietitian Coaching", detail: "Real human RD support is built into the platform, not bolted on later." },
      { label: "Familiar Tracking", detail: "Members get a tracker experience they understand without losing expert guidance." },
      { label: "Move Connection", detail: "Fuel connects to training data so nutrition does not live in a separate silo." },
      { label: "Adaptive Guidance", detail: "The system can evolve as the member logs behavior and progress." },
      { label: "One Member Profile", detail: "Nutrition, movement, and the broader member experience stay connected." },
    ],
    intelligenceTitle: "Nutrition becomes part of the same adaptive coaching system.",
    signalRows: [
      ["Profile", "Goals, training, and nutrition context connect"],
      ["Prescription", "A personalized plan gives the member direction"],
      ["Coaching", "Registered dietitian support adds human accountability"],
      ["Progress", "Tracking informs the next recommendation"],
    ],
    footer: ["Nutrition prescription", "RD coaching", "Food tracking", "Move-connected"],
  },
];

export const ECO_PRODUCT_MAP = new Map(ECO_PRODUCTS.map((p) => [p.id, p]));
