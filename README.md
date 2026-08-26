# Orbit Clear Advisor

Lovable Prompt — Satellite Launch Window Advisor (POC)

Copy everything below into Lovable as your project prompt.

Build a web app called "OrbitClear — Satellite Launch Window Advisor", a proof-of-concept school science project by Dharan (Grade 12). The app helps a satellite launch operator pick a safe date and time to launch a new satellite from a given ground location, without a collision or close pass with existing satellites already in orbit.

Core idea

The operator enters the launch site location (latitude, longitude) and a target launch date. The app checks that location/date against a database of existing satellites' predicted overhead passes, and recommends the safest launch time, with a clear plain-language explanation of why other time slots were rejected.

Pages / Tabs

Home / Launch Planner (default tab)

Traffic Data (view + upload satellite pass data)

How It Works / README — bilingual, Tamil and English side-by-side or with a language toggle

1. Data model — "Satellite Traffic Data"

Each record has:

satellite_name (text) — e.g. "ISS (ZARYA)", "NOAA-19", "STARLINK-3021", "CARTOSAT-3"

latitude (decimal, -90 to 90)

longitude (decimal, -180 to 180)

pass_datetime (date + time, ISO format) — when that satellite is overhead at that lat/long

optional: altitude_km, source (e.g. "NORAD", "simulated")

Seed data (important)

Generate 100–150 realistic mock rows on first load so the demo works immediately without any upload. Use a mix of well-known real satellite names (ISS, NOAA-15/18/19, Hubble, Starlink shells, Cartosat, INSAT, GSAT, etc.) with randomized but plausible lat/long/time values spread across the next 14 days, several passes per day per satellite, spread across different longitudes to simulate orbital ground tracks. Clearly label this as "simulated/demo data" in the UI (small badge), since it is not live NORAD data.

2. Excel upload (Traffic Data tab)

Add an "Upload Traffic Data (.xlsx)" button.

Expected columns (case-insensitive, flexible header matching): Satellite Name, Latitude, Longitude, Date, Time (or a combined DateTime column).

On upload: parse the file client-side (use a library like SheetJS/xlsx), validate rows, show a preview table with row count and any errors (bad lat/long, missing fields), and let the user choose "Append to existing data" or "Replace all data".

After a successful upload, show a success toast and update the in-memory/dataset used by the launch calculator immediately.

Also provide a "Download sample Excel template" button that gives a correctly formatted .xlsx with a couple of example rows, so it's obvious what format to feed in.

3. Launch Planner (main feature)

Form inputs:

Launch Site Latitude

Launch Site Longitude

Preferred Launch Date (date picker)

Optional: Launch site name/label (free text, just for display)

On submit, run a client-side calculation:

Define a proximity radius (e.g. ~500 km, configurable via an "advanced settings" collapsible) around the entered lat/long.

Define a conflict window (e.g. ±15 minutes) around each candidate launch time.

Scan the traffic dataset for satellites whose pass_datetime falls on the chosen date and whose lat/long falls within the proximity radius of the launch site.

Build a timeline for that day (00:00–23:59) marking "BLOCKED" windows (conflicts) vs "CLEAR" windows.

Recommend the best clear time slot (ideally the longest clear gap, or the earliest clear slot after a sensible daytime hour).

Output / result card

Show, in plain language:

✅ Recommended launch window: e.g. "10:00 AM – 10:45 AM on 24 Aug 2026 is clear for launch."

A reasoning breakdown table/list of nearby satellites and why times were rejected, e.g.:

"🛰️ ISS (ZARYA) will cross near your coordinates at 09:02 AM — too close, launch avoided."

"🛰️ NOAA-19 passes at 09:40 AM within 500 km — window blocked."

"✅ No satellite traffic detected between 10:00–10:45 AM — safe to launch."

A simple visual timeline (horizontal bar for the day, red = blocked, green = clear) — use a chart library.

A small table of "All passes considered for this date" (satellite name, time, distance from launch site).

Make it feel like a real mission-planning tool: clean, spacious, slightly technical/aerospace aesthetic.

4. How It Works / README tab (bilingual)

Add a tab titled "How it Works / இது எப்படி வேலை செய்கிறது" with a language toggle (English ⇄ Tamil) or side-by-side columns. Explain simply:

What the tool does (checks for satellite traffic conflicts before recommending a launch time)

How to enter launch coordinates

How to upload the Excel traffic file and the expected format

How the "safe window" is calculated (proximity radius + time buffer, explained in one line, not the code)

A note that this is a school demo/POC using simulated satellite data, not live tracking data

Credit line: "Project by Dharan — Grade 12"

Write natural, clear Tamil (not machine-literal), appropriate for a science exhibition audience — parents, teachers, judges.

5. Design

Space/aerospace theme: dark navy/black background, subtle stars or orbit-line motif, accent color (electric blue or cyan), clean sans-serif typography.

Fully responsive — this will be shown on a laptop at a school exhibition, possibly also on a tablet.

Smooth transitions between tabs, subtle loading state while "calculating" the launch window (even if it's instant, add a brief animated "Scanning orbital traffic..." moment for effect).

Footer: "OrbitClear — Satellite Launch Window Advisor · POC by Dharan"

6. Tech notes

This is a POC — all logic can run client-side (no need for a real backend unless Lovable's default Supabase integration makes persistence easy, in which case store the traffic dataset there so uploads persist across refresh).

Use a spreadsheet-parsing library for the Excel upload.

Keep the recommendation algorithm simple, transparent, and easy to explain to judges (no black-box ML — rule-based proximity + time-window checking, clearly documented in the README tab).

Build this now with smooth, polished UI.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://dharanoca.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1d1e8845-5cd5-49be-94dd-69967c7a255b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
