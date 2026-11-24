# StudyMate AI — Demo Video Script (~2 min 40 sec)

> **Recording Note:** Live on-device Gemini Nano (`Local AI`) and live Firebase AI Logic (`Cloud AI`) inference must be recorded manually on **Desktop Chrome 139+** with Chrome Prompt API flags enabled and a configured Firebase project (with AI Logic enabled in the Firebase Console).

---

## Recording Checklist (Before Pressing Record)
- [ ] Open StudyMate AI in **Desktop Chrome 139+** at `1280x800` or `1920x1080`.
- [ ] Confirm `chrome://flags/#prompt-api-for-gemini-nano` is enabled and **Local Gemini Nano** shows **Available** on the Dashboard.
- [ ] Prepare a short sample lecture PDF (2–5 pages, selectable text).
- [ ] Sign in with a test Google account (avoid exposing personal emails/bookmarks in browser chrome).
- [ ] Verify audio levels and hide DevTools/notifications.

---

## Script

### [0:00 – 0:25] Hook & Problem
**Visual:** Dashboard showing StudyMate AI workspace, live Hybrid Inference Status panel, and real study metrics.  
**Narration:**  
> "College students rely on AI to break down dense lectures and prep for exams, but most study apps send every note to the cloud—costing privacy, latency, and offline access. Meet **StudyMate AI**, built for the #BuildHybridAI 2026 Hackathon using **Firebase AI Logic** to combine on-device Chrome Gemini Nano with transparent cloud Gemini fallback."

### [0:25 – 1:00] On-Device Local AI Demo (Desktop Chrome 139+)
**Visual:** Navigate to **AI Study Assistant**, select **Computer Science** + **Balanced academic**, ask *"Explain dynamic programming vs. greedy algorithms with a simple example"*. Highlight the emerald **`Local AI`** badge (`gemini-nano (on-device)`). Click **Exam-oriented** transform.  
**Narration:**  
> "First, let's ask a concept question with our routing mode set to Prefer Local AI. Because Chrome's Prompt API and Gemini Nano are ready on this device, Firebase AI Logic executes locally—returning a structured explanation and stamping it truthfully with a **Local AI** badge. No prompt text left the laptop. I can even reshape the answer for exam prep with one click."

### [1:00 – 1:45] Local PDF Extraction & Cloud Consent Fallback
**Visual:** Open **Notes & PDF Reader**, upload a sample lecture PDF, select 2 pages, and click **Summarize Excerpt**. Then open **Settings**, switch to **Cloud AI Only** (or disable local consent), and trigger a grounded question showing the **Cloud AI Fallback Consent** modal, accepting it, and inspecting **`Cloud AI`** + **Fallback details**.  
**Narration:**  
> "In **Notes & PDF Reader**, PDFs are parsed completely inside the browser using `pdfjs-dist`—never auto-uploaded. I pick only the pages I want to study. When local inference isn't available—or when I switch to Cloud AI—StudyMate AI asks for explicit consent before sending only that selected excerpt to Firebase AI Logic, and clearly displays **Cloud AI** along with the exact model and fallback reason."

### [1:45 – 2:20] Schema-Validated Quiz & 3D Flashcards
**Visual:** Click **Create Quiz** from the excerpt, generate 3 questions (MCQ, True/False, Short Answer), submit answers to show deterministic scoring and **Retry incorrect**, then switch to **Flashcards** and flip a 3D card and save to Firestore.  
**Narration:**  
> "From the same notes excerpt, StudyMate AI generates schema-validated quizzes—scoring answers deterministically on the client—and builds interactive 3D flashcards. Signed-in students can explicitly save summaries, quiz scores, and decks to their private Cloud Firestore library protected by verified-email security rules."

### [2:20 – 2:40] Closing
**Visual:** Show **Study History** with `Local AI` and `Cloud AI` entries and return to **Dashboard**.  
**Narration:**  
> "Every session in Study History records the real execution mode used—never faking local inference. StudyMate AI is open source under Apache 2.0. Thanks for watching!"
