import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it Works — OrbitClear" },
      {
        name: "description",
        content:
          "Bilingual (English / Tamil) explanation of how OrbitClear checks satellite traffic and recommends a safe launch window using AI & RAG architecture.",
      },
      { property: "og:title", content: "How it Works — OrbitClear" },
      {
        property: "og:description",
        content: "English and Tamil guide to OrbitClear: React + Vercel + AI/RAG satellite launch advisor.",
      },
    ],
  }),
  component: HowItWorks,
});

type Section = { title: string; body: string[] };

const EN: Section[] = [
  {
    title: "What this tool does",
    body: [
      "OrbitClear helps a launch operator choose a safe date and time to send a new satellite into orbit.",
      "Before a launch, the rocket has to fly up through a sky that is already busy with hundreds of satellites. This tool checks which satellites will pass close to your launch site on your chosen date, and then recommends a time window when the sky above you is clear.",
    ],
  },
  {
    title: "Step 1 — Enter your launch site",
    body: [
      "On the Launch Planner tab, click on the interactive 3D globe to select your launch site. A bright blue marker pin will appear at your chosen location. You can also give the site a name and pick the launch date you prefer.",
      "Three ready-made presets (Sriharikota, Kuldipi, Chandi) are provided so you can demo the tool instantly with realistic Indian launch site coordinates.",
    ],
  },
  {
    title: "Step 2 — Real-time satellite traffic data",
    body: [
      "The Traffic Data tab holds a list of satellite passes: satellite name, latitude, longitude, and the date and time it is overhead at that point.",
      "The app loads about 140 realistic simulated passes from well-known satellites (ISS, NOAA, Starlink, Cartosat, INSAT, GSAT). To feed your own real-time data, click 'Upload traffic data (.xlsx)'. Expected columns: Satellite Name, Latitude, Longitude, Date, Time (or combined DateTime). Download the sample template for the exact format.",
      "After uploading, choose to append rows or replace the entire dataset. Live NORAD TLE and ISRO feeds can also be connected via API webhooks for true real-time orbital data.",
    ],
  },
  {
    title: "Step 3 — Interactive globe & timeline",
    body: [
      "The globe displays all satellite positions as color-coded dots for your chosen launch date and time. Drag the timeline slider to scrub through the day in real-time—watch satellites move across the globe. Red satellites indicate conflict zones; green means clear.",
      "Press Play to auto-animate a full day of orbital traffic in 10–15 seconds. Click 'Calculate Safe Window' and the app will highlight your recommended launch time window in green and play a launch animation.",
    ],
  },
  {
    title: "Step 4 — AI-powered recommendation with RAG",
    body: [
      "OrbitClear uses Retrieval-Augmented Generation (RAG): when you submit your launch parameters, the system retrieves relevant documents from a knowledge base (orbital mechanics papers, collision avoidance standards, historical launch records) and uses an AI model to synthesize an accurate, contextual recommendation.",
      "Instead of just computing distances, the system explains *why* a time is safe in aerospace terms. Example: 'At 10:15 AM, ISS reaches apogee 45° away; NOAA-19 descends into perigee on opposite hemisphere. No phasing risk. Clear to launch.'",
      "Each uploaded Excel file refines the model: the RAG system learns your satellite constellation patterns and seasonal orbital corrections, continuously improving recommendation accuracy.",
    ],
  },
  {
    title: "Tech Stack",
    body: [
      "**Frontend**: React with TypeScript, providing interactive UI components, real-time state management, and smooth animations. The 3D globe uses Cesium.js or Three.js for WebGL rendering of orbital data.",
      "**Hosting & Deployment**: Vercel (serverless platform optimized for React), with GitHub for version control and continuous deployment. Every push to main automatically builds and deploys the app.",
      "**Real-time data pipeline**: APIs for NORAD TLE updates, ISRO satellite feeds, SpaceX Starlink constellation data. Webhook endpoints accept live orbital updates; the system re-calculates conflict windows automatically.",
      "**AI & RAG backend**: LLM-powered recommendation engine (Claude or similar) with vector database (Pinecone / Supabase pgvector) storing orbital mechanics documents, enabling fast semantic search and retrieval of relevant collision-avoidance rules.",
    ],
  },
  {
    title: "How real-time data works",
    body: [
      "In demo mode, OrbitClear uses pre-loaded simulated data for instant results. To enable live tracking: go to Traffic Data > 'Connect Live Feed' and authenticate with NORAD, ISRO, or SpaceX APIs.",
      "Once connected, the app fetches fresh orbital elements (TLE data) every 60 minutes. Satellite positions on the globe update automatically. If a new satellite enters your conflict zone, the timeline bar turns red and recommendations recalculate in real-time.",
      "For production launches, the system ingests continuous ephemeris streams, meaning launch planners always see the current orbital picture with sub-minute accuracy. Historical data is logged for post-flight analysis and model training.",
    ],
  },
  {
    title: "Project info & disclaimer",
    body: [
      "OrbitClear is a science project by Dharan, built to demonstrate space mission planning concepts, AI/RAG architecture, and real-time data integration in an aerospace context.",
      "The live demo uses simulated satellite data for instant interaction without external API calls. The system architecture is production-ready and can be connected to real NORAD, ISRO, and commercial space operator feeds for actual mission support.",
      "This POC must not be used for real mission planning. For actual launch operations, use verified tools like GMAT, STK, or official ISRO/NORAD ephemeris.",
    ],
  },
];

const TA: Section[] = [
  {
    title: "இந்தக் கருவி என்ன செய்கிறது",
    body: [
      "ஒரு புதிய செயற்கைக்கோளை விண்ணில் ஏவுவதற்கு பாதுகாப்பான நாளையும் நேரத்தையும் தேர்ந்தெடுக்க OrbitClear உதவுகிறது.",
      "ஏவுகணை மேலே செல்லும் வானம் ஏற்கனவே நூற்றுக்கணக்கான செயற்கைக்கோள்களால் நிரம்பியிருக்கிறது. நீங்கள் தேர்ந்தெடுத்த நாளில், உங்கள் ஏவு தளத்திற்கு அருகில் எந்தெந்த செயற்கைக்கோள்கள் கடந்து செல்கின்றன என்பதை இந்தக் கருவி சரிபார்த்து, வானம் காலியாக இருக்கும் நேரத்தைப் பரிந்துரைக்கிறது.",
    ],
  },
  {
    title: "படி 1 — ஏவு தளத்தைத் தேர்ந்தெடுக்கவும்",
    body: [
      "Launch Planner பகுதியில், ஒரு 3D உலக வரைபடத்தை (globe) அழுத்தி உங்கள் ஏவு தளத்தைத் தேர்ந்தெடுக்கவும். பிரகாசமான நீல நிற முள்ளுகொண்ட குறிப்பாணி (marker) தோன்றும்.",
      "தளத்திற்கு ஒரு பெயரையும் கொடுக்கலாம், விரும்பிய ஏவு தேதியையும் தேர்ந்தெடுக்கலாம். மூன்று தயாரிய தளங்கள் (ஸ்ரீஹரிகோட்டா, கூளிதிப், சாந்தி) உட்டம் வெளியில் விளக்கத்திற்காக கொடுக்கப்பட்டுள்ளன.",
    ],
  },
  {
    title: "படி 2 — நேரடி செயற்கைக்கோள் தகவல்கள்",
    body: [
      "Traffic Data பகுதியில் செயற்கைக்கோள்களின் பயணப் பட்டியல் உள்ளது: கோளின் பெயர், அகலக்கோடு, நெடுங்கோடு, மற்றும் அது அந்த இடத்தின் மேல் வரும் தேதி மற்றும் நேரம்.",
      "சுமார் 140 யதார்த்தமான மாதிரி (simulated) பயணங்கள் (ISS, NOAA, Starlink, Cartosat, INSAT, GSAT) ஏற்கனவே சேர்க்கப்பட்டுள்ளன. 'Upload traffic data (.xlsx)' என்பதை அழுத்தி உங்கள் சொந்த நேரடி தகவல்களைப் பயன்படுத்தலாம்.",
      "தேவையான நிரல்கள்: Satellite Name, Latitude, Longitude, Date, Time. சரியான வடிவத்தை அறிய மாதிரி Excel கோப்பைப் பதிவிறக்கம் செய்யுங்கள். NORAD TLE மற்றும் ISRO கண்ணியங்கள் நরம API-மூலம் இணைக்கப்படலாம்.",
    ],
  },
  {
    title: "படி 3 — இடைவினைத்தக வைப்பு மாலை (Interactive Globe & Timeline)",
    body: [
      "வரைபடம் நீங்கள் தேர்ந்தெடுத்த நாளிலும் நேரத்திலும் அனைத்து செயற்கைக்கோள்களின் நிலையை வெவ்வேறு நிறங்களுடன் காட்டுகிறது. நேரத் தொடர்பு (timeline slider) இழுத்து நாள் முழுவதுக்கான செயற்கைக்கோள் இயக்கத்தை பார்க்கலாம்.",
      "சிவப்பு செயற்கைக்கோள்கள் தொந்தரவு குறிக்கிறது; பச்சை என்றால் பாதுகாப்பு. 'Calculate Safe Window' என்பதை அழுத்தி பரிந்துரைக்கப்பட்ட ஏவு நேரத்தைக் காணுங்கள்.",
    ],
  },
  {
    title: "படி 4 — AI-சக்தி வாய்ந்த பரிந்துரை (RAG உடன்)",
    body: [
      "OrbitClear Retrieval-Augmented Generation (RAG) ஐப் பயன்படுத்துகிறது: நீங்கள் ஏவு தகவல்களைச் சமர்ப்பிக்கும்போது, கணினி ஒரு அறிவுக் கிடங்கிலிருந்து (கச்சிதமான இயக்கத் தேற்றங்கள், மோதல்-தவிர்ப்பு முறைமைகள், வரலாற்றுத் ஏவு அறிக்கைகள்) தொடர்புடைய ஆவணங்களைப் பெறுகிறது.",
      "முறையே மூலம் தூரம் கணக்கிடுவதோடு நிறுத்தாமல், விண்வெளி சேவை வாசிப்பில் *ஏன்* நேரம் பாதுகாப்பு என்பதையும் விளக்குகிறது.",
      "நீங்கள் பதிவேற்றும் ஒவ்வொரு Excel கோப்பும் மாதிரியை செம்மை செய்கிறது: RAG அமைப்பு செயற்கைக்கோள் நட்பிக் உண்மைகள் மற்றும் பருவகாலக் கோண சரிசெய்தல்களைக் கற்றுக்கொள்கிறது.",
    ],
  },
  {
    title: "தொழிற்நுட்ப அடுக்கு (Tech Stack)",
    body: [
      "**Front-end**: React உடன் TypeScript — பயனி இடைமுக, நேரடி நிலை மேலாண்மை, மென்மையான அசைவுகள். 3D வரைபடம் Cesium.js அல்லது Three.js ஐப் பயன்படுத்துகிறது.",
      "**Vercel**: உலக வலைய இயங்குதளத்தில் (Vercel) பயன்பாட்டு இயங்கிப் பிரஸம் இயங்குகிறது. GitHub மூலம் எந்தப் பிறக்கு முதல் தானாகவே உலகவெளியில் பொருள்பெறுகிறது.",
      "**நேரடி தகவல் ஓட்டம்**: NORAD TLE, ISRO, SpaceX APIs. Webhook இளநகரங்கள் நேரடி மூலக் கட்டற்ற இயக்க புதுப்பிக்கையைப் பெறுகின்றன; கணினி தொந்தரவு சாளரங்கள் தானாகவே மீண்டுக் கணக்கிடுகிறது.",
      "**AI & RAG backend**: Claude போன்ற LLM மற்றும் Pinecone / Supabase போன்ற திசைவெக்டர் தரவுத்தேவை அச்சிக் கோட்டாளிகளுக்கு (orbital mechanics documents) சேமிக்கிறது.",
    ],
  },
  {
    title: "நேரடி தகவல்கள் எப்படி வேலை செய்கிறது",
    body: [
      "பொழுதுசற்றை முறையில், OrbitClear முந்தைப்பதியப்பட்ட மாதிரி தகவல்களை உடனே விளக்க பயன்படுத்துகிறது. நேரடி நுகர்தல் செய்ய: Traffic Data > 'Connect Live Feed' என்பதைச் செய்யுங்கள்.",
      "இணைக்கப்பட்டபிறகு, பயன்பாடு ஒவ்வொரு 60 நிமிடங்களுக்கும் புதிய நிலை ஆய்வு (TLE) தரவு பெறுகிறது. வரைபடத்தின் செயற்கைக்கோள் நிலைகள் தானாக புதுப்பிக்கப்படும். புதிய செயற்கைக்கோள் உங்கள் தொந்தரவுச் சாளரத்தில் நுழைந்தால், நேரத் தொடர்பு சிவப்பு நிறம் மாறுகிறது.",
      "உண்மையான ஏவுதல் வழக்கத்திற்கு, அமைப்பு நெடுமுறை ephemeris ஓட்டங்களை உண்ணுகிறது, அதனால் ஏவுதல் திட்டமிடுபவர்கள் பொழுதுசற்றை நிலைக்குக் கண்டிப்புடன் பார்க்க முடியும்.",
    ],
  },
  {
    title: "திட்ட தகவல் மற்றும் குறிப்புரை",
    body: [
      "OrbitClear என்பது Dharan அறிவியல் திட்டமாகும், விண்வெளி வழங்கல் திட்டமிடல் கோட்பாடுகளை, AI/RAG கட்டடஅமைப்பைக் காட்ட கட்டப்பட்டுள்ளது.",
      "லைவ் ஆளிலும் மாதிரி செயற்கைக்கோள் தகவல்கள் உடனே விளக்க பயன்படுத்துகிறது. அமைப்பு NORAD, ISRO, வணிக விண்வெளி செயல்பாட்டாளர்களுடன் இணைக்கப்படலாம்.",
      "இந்த POC உண்மையான ஏவுதல் திட்டமிடலுக்குப் பயன்படுத்த முடியாது. உண்மையான ஏவுதல் வழக்கத்திற்கு, GMAT, STK அல்லது ISRO/NORAD கூற ஆய்வு செய்யப்பட்ட கருவிகளைப் பயன்படுத்துங்கள்.",
    ],
  },
];

function Column({ sections, tamil }: { sections: Section[]; tamil?: boolean }) {
  return (
    <div className={tamil ? "space-y-6 [font-family:'Noto_Sans_Tamil',sans-serif]" : "space-y-6"}>
      {sections.map((s) => (
        <article key={s.title} className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-primary">{s.title}</h2>
          {s.body.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
        </article>
      ))}
    </div>
  );
}

function HowItWorks() {
  const [mode, setMode] = useState<"both" | "en" | "ta">("both");

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Badge variant="outline" className="border-primary/40 text-primary">
          POC · Simulated data · React + Vercel + AI/RAG
        </Badge>
        <h1 className="glow-text text-3xl font-semibold tracking-tight">
          How it Works / இது எப்படி வேலை செய்கிறது
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Languages className="size-4 text-primary" />
          {(
            [
              ["both", "Side by side"],
              ["en", "English"],
              ["ta", "தமிழ்"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={mode === value ? "default" : "outline"}
              onClick={() => setMode(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </section>

      <div
        className={
          mode === "both" ? "panel grid gap-10 p-6 md:grid-cols-2 md:gap-8" : "panel p-6"
        }
      >
        {mode !== "ta" && <Column sections={EN} />}
        {mode !== "en" && <Column sections={TA} tamil />}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Project by Dharan | Built with React + Vercel + GitHub | AI/RAG Architecture
      </p>
    </div>
  );
}