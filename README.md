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

## 🚀 How It Works (Step-by-Step)

Using JobTool is as easy as 1-2-3:

1. **Upload Your Resume:** Head over to the dashboard and upload your standard PDF or Word resume. Tell JobTool what role that resume is for.
2. **Set Your Target:** Type in the keywords you want (e.g., "Software Engineer, Remote") and set how many jobs you want it to find.
3. **Hit RUN:** Click the massive "RUN" button. The Cloud Engine wakes up, searches the internet, filters out the bad jobs, and delivers the best matches straight to your dashboard!

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
