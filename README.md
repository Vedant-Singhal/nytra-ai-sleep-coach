# Nytra 🌙

*Democratizing mental health literacy & burnout prevention through sleep.*

## About The Project
Sleep is the foundational pillar of mental health, yet it is often the first casualty of burnout, anxiety, and depression. Nytra is a holistic, AI-powered sleep and mental wellness ecosystem built to act as a first line of defense. By transforming your phone into a cognitive health Command Center, Nytra helps you understand the physiological causes behind declining mental wellness and provides immediate, evidence-based interventions. 

Built for **Track 2: Neuroscience & Mental Health**.

## Core Features
* **Motion-Based Sleep Tracking:** Passively monitors nightly rest to map out sleep and awake phases using custom differential decay heuristics.
* **AI Sleep Coach (Nytra Chat):** Personalized, evidence-based therapeutic support and sleep hygiene literacy without the stigma of traditional therapy.
* **The Sleep Lab:** Modular, CBT-inspired cognitive exercises (Word Shuffler, Category Cascade, Breath-Sync Circle) designed to interrupt anxious rumination and facilitate sleep onset.
* **Peer Support Community:** A feed where users can share progress and streaks, fostering accountability and reducing isolation.
* **Clinical Handoff:** Generates highly detailed, locally rendered PDF reports (via client-side generation) to empower users to advocate for themselves at the doctor's office.

## Tech Stack
* **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Lucide Icons
* **Backend Data & Auth:** Supabase
* **AI Engine:** Anthropic API (Claude)
* **Client-Side PDF Generation:** `html2canvas` & `jspdf`
* **Language:** TypeScript

## Getting Started

### Prerequisites
Make sure you have Node.js installed, as well as an active Supabase project and an Anthropic API Key.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Vedant-Singhal/Nytra.git
   ```

2. **Navigate to the web app directory:**
   ```bash
   cd Nytra/sleep_tracker_web
   ```
   *(Or if you are just in the `sleep_tracker_web` folder directly: `cd sleep_tracker_web`)*

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Set up environment variables:**
   Create a `.env.local` file in the root of the web directory and add your keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## Ethical AI Focus
What can AI therapy do, and what can it absolutely not replace?
Nytra’s AI excels at pattern recognition, emotional triage, and delivering immediate cognitive behavioral frameworks at 3 AM when human therapists are asleep. However, it *cannot* replace the nuanced empathy of a human professional or diagnose clinical disorders. To bridge this, Nytra heavily incorporates its **Clinical Handoff** feature to get users to a real doctor with actual data.

## License
Distributed under the MIT License. See `LICENSE` for more information.