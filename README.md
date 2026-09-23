# MasjidCheckIn 🕌

A modern, mobile-first **Smart Mosque Attendance System**. Congregants (Jamaah) record their attendance using:

- **Geofencing** — GPS validation against the mosque's coordinates & radius.
- **Facial Recognition** — face descriptor matching against registered users.
- **Scene Verification** — MobileNet embeddings that confirm the photo was taken
  inside the mosque (and not a blacklisted area).

> ⚡ **All AI processing runs on the backend.** The frontend only handles the UI,
> camera capture, GPS validation, and data submission — keeping it fast on
> low-end smartphones.

---

## 🛠️ Tech Stack

| Layer          | Technology                                                                 |
| -------------- | -------------------------------------------------------------------------- |
| Framework      | Next.js (App Router)                                                       |
| Styling        | Tailwind CSS, Framer Motion, Lucide React                                  |
| Backend        | Vercel (Route Handlers / Serverless Functions)                             |
| DB & Storage   | Supabase (PostgreSQL + Storage)                                            |
| AI (backend)   | `@vladmandic/face-api`, `@tensorflow/tfjs`, `@tensorflow-models/mobilenet` |

---

## 🗂️ Project Structure

```
app/
  layout.tsx          # Root layout, fonts, theme init, metadata
  globals.css         # Theme tokens, glassmorphism, skeleton utilities
  page.tsx            # Home screen (time, next prayer, status, CTA)
  attend/page.tsx     # Attendance flow (GPS → Face → Scene → Success)
components/
  CameraScanner.tsx   # Webcam capture + framing guide + auto-capture
  StepsIndicator.tsx  # Horizontal progress stepper
  ThemeToggle.tsx     # Light/dark mode switch
  Skeleton.tsx        # Reusable shimmer placeholder
lib/
  supabase.ts         # Supabase client helpers (browser + service role)
  api.ts              # recognizeFace / verifyScene (mock + real paths)
  config.ts           # Mosque settings + MOCK_AI flag
  prayerTimes.ts      # Sample prayer times + helpers
  utils.ts            # cn, haversine, formatting helpers
```

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.local.example .env.local
#   → fill in your Supabase URL / keys

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🧪 Demo Mode

By default, `MOCK_AI` is `true` (see `lib/config.ts`). This simulates the
face/scene recognition responses so the **entire UI flow is fully demoable**
without a backend.

Once the Phase 3 route handlers are deployed, set `MOCK_AI` to `false`.

---

## 🗄️ Database Schema (Supabase)

| Table               | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `settings`          | Mosque name, latitude, longitude, geofence radius              |
| `users`             | id, name, created_at, face_descriptor (json)                   |
| `attendance`        | id, user_id, prayer_name, timestamp, scene_score, location_status |
| `scene_references`  | id, type (valid/invalid), image_url, descriptor (json)         |

---

## 📅 Roadmap

- **Phase 1** ✅ Project setup & config
- **Phase 2** ✅ Frontend UI (mobile-first)
- **Phase 3** ⏳ Backend AI APIs (`/api/recognize-face`, `/api/verify-scene`)
- **Phase 4** ⏳ Supabase integration & data persistence
- **Phase 5** ⏳ User registration, admin dashboard, reports

---

## 🎨 Design Language

- **Deep Navy** (`#0A1526`) background with **Gold** (`#D9A94E`) accents.
- Typography: *Plus Jakarta Sans* (body) + *Marcellus* (headings).
- Glassmorphism sticky headers, card-based layout, skeleton loaders.
- Dark mode is the default; light mode is fully supported via the toggle.
