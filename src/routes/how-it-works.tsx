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
          "Bilingual (English / Tamil) explanation of how OrbitClear checks satellite traffic and recommends a safe launch window.",
      },
      { property: "og:title", content: "How it Works — OrbitClear" },
      {
        property: "og:description",
        content: "English and Tamil guide to using the OrbitClear launch window advisor.",
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
      "On the Launch Planner tab, type the latitude and longitude of your launch site (for example Sriharikota is 13.72, 80.23). You can also give the site a name, and pick the launch date you prefer.",
      "Three ready-made presets are provided so you can demo the tool quickly.",
    ],
  },
  {
    title: "Step 2 — The traffic data",
    body: [
      "The Traffic Data tab holds a list of satellite passes: satellite name, latitude, longitude, and the date and time it is overhead at that point.",
      "The app already loads about 140 simulated passes so it works instantly. To use your own data, click 'Upload traffic data (.xlsx)'. The expected columns are: Satellite Name, Latitude, Longitude, Date, Time (a single DateTime column also works). Download the sample template to see the exact format. After uploading you can either append the rows or replace the whole dataset.",
    ],
  },
  {
    title: "Step 3 — How the safe window is calculated",
    body: [
      "The rule is simple and fully transparent: any satellite pass that comes within the proximity radius (500 km by default) of your launch site blocks the clock for a time buffer of ±15 minutes around that pass.",
      "Everything left over is a clear window. The app draws the whole day as a red/green bar and recommends the longest clear stretch after your earliest acceptable hour. Both the radius and the time buffer can be changed under Advanced settings.",
      "There is no machine learning and no hidden model — it is a straightforward distance-and-time check that anyone can verify by hand.",
    ],
  },
  {
    title: "Please note",
    body: [
      "This is a school science project and a proof of concept. It uses simulated satellite pass data, not live NORAD or ISRO tracking data, so it must not be used for real mission planning.",
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
    title: "படி 1 — ஏவு தளத்தைப் பதிவு செய்யுங்கள்",
    body: [
      "Launch Planner பகுதியில், உங்கள் ஏவு தளத்தின் அகலக்கோடு (latitude) மற்றும் நெடுங்கோட்டு (longitude) மதிப்புகளைத் தட்டச்சு செய்யுங்கள். எடுத்துக்காட்டாக ஸ்ரீஹரிகோட்டா 13.72, 80.23.",
      "தளத்திற்கு ஒரு பெயரையும் கொடுக்கலாம், விரும்பிய ஏவு தேதியையும் தேர்ந்தெடுக்கலாம். விரைவான செயல்விளக்கத்திற்கு மூன்று தயார் நிலை தளங்கள் கொடுக்கப்பட்டுள்ளன.",
    ],
  },
  {
    title: "படி 2 — செயற்கைக்கோள் தகவல்கள்",
    body: [
      "Traffic Data பகுதியில் செயற்கைக்கோள்களின் பயணப் பட்டியல் உள்ளது: கோளின் பெயர், அகலக்கோடு, நெடுங்கோடு, மற்றும் அது அந்த இடத்தின் மேல் வரும் தேதி மற்றும் நேரம்.",
      "உடனே பயன்படுத்தும் வகையில் சுமார் 140 மாதிரி (simulated) பயணங்கள் ஏற்கனவே சேர்க்கப்பட்டுள்ளன. உங்கள் சொந்த தகவல்களைப் பயன்படுத்த 'Upload traffic data (.xlsx)' என்பதை அழுத்துங்கள்.",
      "தேவையான நிரல்கள்: Satellite Name, Latitude, Longitude, Date, Time. சரியான வடிவத்தை அறிய மாதிரி Excel கோப்பைப் பதிவிறக்கம் செய்யுங்கள். பதிவேற்றிய பிறகு, பழைய தகவலுடன் சேர்க்கவோ அல்லது முழுவதும் மாற்றவோ முடியும்.",
    ],
  },
  {
    title: "படி 3 — பாதுகாப்பான நேரம் எப்படிக் கணக்கிடப்படுகிறது",
    body: [
      "விதி மிகவும் எளிமையானது: உங்கள் ஏவு தளத்திலிருந்து 500 கி.மீ. தூரத்திற்குள் ஒரு செயற்கைக்கோள் கடந்து சென்றால், அந்த நேரத்தைச் சுற்றி ±15 நிமிடங்கள் 'தடை செய்யப்பட்ட' நேரமாகக் கருதப்படுகிறது.",
      "மீதமுள்ள நேரம் அனைத்தும் பாதுகாப்பான நேரம். நாள் முழுவதும் சிவப்பு (தடை) மற்றும் பச்சை (பாதுகாப்பு) கோடாகக் காட்டப்பட்டு, மிக நீளமான பாதுகாப்பான இடைவெளி பரிந்துரைக்கப்படுகிறது. தூரம் மற்றும் நேர இடைவெளியை Advanced settings-ல் மாற்றிக்கொள்ளலாம்.",
      "இதில் எந்த மறைமுகமான கணினி கற்றல் (machine learning) மாதிரியும் இல்லை — தூரமும் நேரமும் மட்டுமே அடிப்படை. யாரும் கையால் சரிபார்க்க முடியும்.",
    ],
  },
  {
    title: "கவனிக்க வேண்டியது",
    body: [
      "இது ஒரு பள்ளி அறிவியல் திட்டம் மற்றும் கருத்து விளக்க மாதிரி (POC). இதில் பயன்படுத்தப்படும் தகவல்கள் மாதிரியாக உருவாக்கப்பட்டவை — நேரடி NORAD அல்லது ISRO கண்காணிப்புத் தகவல்கள் அல்ல. எனவே உண்மையான ஏவுதல் திட்டமிடலுக்கு இதைப் பயன்படுத்தக்கூடாது.",
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
          POC · Simulated data
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

      <p className="text-center text-sm text-muted-foreground">Project by Dharan — Grade 12</p>
    </div>
  );
}
