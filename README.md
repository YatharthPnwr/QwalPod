# **Qwalpod**

Qwalpod is a high-fidelity, web-based recording studio designed for podcasters and content creators who demand quality. It enables real-time video conferencing while simultaneously uploading the highest-quality audio and video chunks to cloud, ensuring pristine recordings regardless of network conditions.

Built with reliability in mind, Qwalpod leverages a robust background processing pipeline to handle media consolidation securely in the cloud.

---

## ✨ Why QwalPod?

* **Studio-Quality Recording**: Captures high-resolution audio, video, and screen recordings directly from the user's device for top-notch quality.
* **Real-Time Collaboration**: video and audio communication powered by WebRTC.
* **Resilient Upload Architecture**: Media is split into chunks and uploaded securely using multipart strategies, preventing data loss during long sessions.
* **Automatic Processing on the Server**: Automated background jobs (powered by BullMQ and FFmpeg) consolidate media chunks into final downloadable format (WebM) automatically.
* **Screen Sharing**: Integrated screen sharing capabilities with dedicated recording tracks.

* **Secure Authentication**: Enterprise-level authentication integration via Clerk.

---

## 🛠 Tech Stack

Qwalpod is built on a modern, scalable stack designed for high concurrency and media processing.

* **Frontend**: Next.js 16 (App Router), React , Tailwind CSS
* **Backend & API**: Next.js APIs, Custom WebSocket Server (`ws`), 
* **Real-Time Communication**: WebRTC 
* **Database**: PostgreSQL, Prisma ORM
* **Storage**: AWS S3 / DigitalOcean Spaces (S3 Compatible)
* **Queue & Processing**: BullMQ (Redis), FFmpeg
* **Authentication**: Clerk
---


## 📦 Getting Started

### Prerequisites

* Node.js (v18+)
* PostgreSQL
* Redis (for BullMQ)
* FFmpeg installed on the host machine
* Docker installed on the host machine with redis:alpine image

### Installation

Clone the repository:

```bash
git clone https://github.com/yourusername/qwalpod.git
cd qwalpod
```

Install dependencies:

```bash
npm install
# or
yarn install
```

Set up environment variables:

Create a `.env` file in the root directory and add the following:

```env
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
NEXT_PUBLIC_AWS_REGION=
NEXT_PUBLIC_AWS_S3_BUCKET_NAME=
NEXT_PUBLIC_JS_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_WS_BACKEND_URL=ws://localhost:3000
DO_ENDPOINT=
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

Initialize the database:

```bash
npx prisma generate
npx prisma db push
```

Run the development server:

```bash
npm run dev

```
Start the redis image in docker on a new terminal:

```bash
docker run -d -p 6379:6379 redis:alpine
```

Run the bullMQ worker script in yet another terminal:
```bash
tsc -b tsconfig.json && node ./dist1/src/lib/bullMQ/consolidateFiles.js
```

The application will be available at **[http://localhost:3000](http://localhost:3000)**.

---

**If you like what you see, a Star is much appreciated! ❤️**
