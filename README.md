# <img src="./frontend/public/logo.png" height="36" align="top" style="border-radius: 8px;"> JobTool — Your Personal AI Job Hunter

> **Imagine having a tireless personal assistant who searches the internet for jobs 24/7, reads every job description, compares it to your resume, and writes a custom application for you while you sleep.** 
> 
> **That is JobTool.** https://job-tool-alpha.vercel.app/

---

## 🤔 What is JobTool?

Finding a job can feel like a full-time job itself. You have to scroll through endless job boards, read hundreds of descriptions, and manually tweak your resume for every single application. 

**JobTool automates this entire process using Artificial Intelligence.**

Built with a gorgeous, modern "Neumorphic" design (available in both Light and Dark mode), JobTool is a cloud-based dashboard that does the heavy lifting for you. You just tell it what kind of job you want and upload your resume. The engine will automatically scour the internet for the best job openings, use AI to read the job requirements, and instantly tell you how good of a match you are!

---

## ✨ Magic Features

- **🤖 AI-Powered Matchmaker:** JobTool uses advanced AI to read your resume and compare it against live job postings, giving you a "Match Score" so you know exactly which jobs are worth your time.
- **🌍 Automated Global Sourcing:** It automatically pulls live job openings from 7 different platforms (including Adzuna, Arbeitnow, RemoteOK, and The Muse). 
- **📄 Multi-Role Resumes:** You can upload multiple resumes! Want to apply as a "Frontend Developer" and a "Product Manager"? Upload a resume for both, and JobTool handles the rest.
- **🎨 Stunning Neumorphic UI:** Designed with premium aesthetics in mind. Soft shadows, smooth gradients, and a sleek toggle between a bright Light Mode and a stealthy Dark Mode.
- **☁️ 100% Cloud Powered:** You don't need to keep your laptop open. The JobTool engine runs in the cloud (Vercel and Render), meaning it hunts for jobs for you even while you are offline.

---

## 🚀 How It Works (The Complete Journey)

Here is exactly what happens when you use JobTool:

1. **Upload & Setup:** First, you upload your base resume to the dashboard and type in the kind of job you are looking for (e.g., "Software Engineer").
2. **Hit RUN & Relax:** You click the massive "RUN" button and just wait. That's it! You can sit back and let the system take over.
3. **The Engine Hunts:** JobTool scours 7 different job platforms across the internet, pulling in hundreds of live, open job postings.
4. **AI Scanning & Matching:** The AI reads every single job description and scans your resume. It filters out the junk and only picks the absolute **top, best jobs** that perfectly fit your experience.
5. **Auto-Tailoring:** For every perfect match it finds, the AI completely rewrites your resume and drafts a custom Cover Letter designed specifically to beat that company's hiring system.
6. **You Apply:** You simply click "Apply" on the dashboard using your newly generated, perfectly tailored PDFs. 
7. **Get Hired!** Because your applications are now hyper-targeted and AI-optimized, all you have to do is check your email or wait for your phone to ring from recruiters asking for an interview!

---

## 🛠️ Under the Hood (For the Geeks!)

If you are a developer, here is the technology powering the magic:

- **Frontend:** Built with **Next.js (React)** and custom Vanilla CSS to achieve the beautiful Neumorphic design system. Hosted on **Vercel**.
- **Backend:** Built with **Python and FastAPI** for blazing fast performance. Hosted on **Render**.
- **Database:** Powered by **Neon PostgreSQL** to safely store your application history and resumes.
- **AI Brain:** Uses Large Language Models (LLMs) to parse unstructured resume data and intelligently score job descriptions.
- **PDF Generation:** Automatically generates perfectly formatted PDF cover letters using WeasyPrint.

---

## 💻 Want to run it yourself?

If you want to download this code and run it on your own computer:

### 1. Start the Backend (The Brain)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 2. Start the Frontend (The Dashboard)
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser and enjoy your automated job hunt!
