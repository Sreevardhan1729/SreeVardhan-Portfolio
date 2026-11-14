// All site content lives here. Components only render it.
// DevRev numbers come from merged PRs on default branches, counted on 2026-11-11.

export type ExternalLink = {
  label: string
  href: string
}

// Dates are YYYY-MM or YYYY-MM-DD. DevRev periods come from the dates of the merged PRs behind each highlight.
export type Period = { start: string; end: string }

export type Experience = {
  role: string
  company: string
  companyUrl?: string
  location: string
  start: string
  end: string
  period?: Period
  summary?: string
  stats?: { value: string; label: string }[]
  highlights: { title?: string; text: string; period?: Period }[]
  tags: string[]
}

export type ProjectVisual =
  | {
      kind: "terminal"
      caption: string
      lines: { type: "shell" | "input" | "output"; text: string }[]
      prompt: string
    }
  | {
      kind: "pipeline"
      caption: string
      stages: { label: string; detail: string }[]
      backends: { label: string; detail: string }[]
    }
  | {
      kind: "pull-requests"
      caption: string
      repo: string
      pulls: { number: number; title: string; additions: number; deletions: number; href: string }[]
    }

export type FeaturedProject = {
  name: string
  kicker: string
  summary: string
  points: string[]
  tags: string[]
  links: ExternalLink[]
  visual: ProjectVisual
}

export type Project = {
  name: string
  description: string
  tags: string[]
  links: ExternalLink[]
}

export const portfolioData = {
  personal: {
    name: "Sree Vardhan Reddy",
    headline: "Software Engineer, previously at DevRev",
    tagline:
      "I build product features in React and TypeScript, and the Go and Python data systems behind them.",
    email: "itssreevardhan@gmail.com",
    photo: "/images/sree-vardhan-reddy.jpg",
    resume:
      "https://drive.google.com/file/d/1A9pcq4ArSuREJSgF7hr9oVLg6hfgRolg/view?usp=sharing",
    social: {
      github: "https://github.com/Sreevardhan1729",
      linkedin: "https://www.linkedin.com/in/sreevardhanreddy/",
      leetcode: "https://leetcode.com/u/Vardhan1729/",
    },
  },

  // Text wrapped in **double asterisks** is rendered as a highlight.
  about: [
    "I was a software engineer at **DevRev**, working across its analytics stack. On the frontend I shipped dashboard features in **React and TypeScript**. On the backend I worked on the **Go and Python** services that query, export and keep that data fresh, using Kafka, gRPC, Temporal and DuckDB.",
    "The work I enjoy most is finding the real cause of a problem instead of patching the symptom: ordering races between services, retry safety, and contracts that span many repositories. Between January and November 2026 I merged **168 pull requests across 10 repositories**, including 3 to DevRev's open-source query SDK, Meerkat.",
    "Outside work I build systems from scratch to understand how they work, like a **Redis-compatible database in C++** and an **LLM gateway in Go**. I also build AI-assisted developer tooling with Claude Code and Codex.",
  ],

  education: {
    degree: "B.Tech in Computer Science and Engineering",
    institution: "Indian Institute of Information Technology Kottayam",
    graduation: "May 2026",
    cgpa: "9.36 / 10",
  },

  experience: [
    {
      role: "Member of Technical Staff Intern",
      company: "DevRev",
      companyUrl: "https://devrev.ai",
      location: "Chennai",
      start: "Jan 2026",
      end: "Nov 2026",
      period: { start: "2026-01", end: "2026-11" },
      summary: "Full-stack work on DevRev's dashboards and the data platform behind them.",
      stats: [
        { value: "168", label: "merged PRs" },
        { value: "10", label: "repositories" },
        { value: "3", label: "open-source PRs" },
      ],
      highlights: [
        {
          title: "TypeScript strict mode.",
          text: "Moved shared and feature libraries of DevRev's web app to strict TypeScript across 23 PRs, fixing errors with real type narrowing instead of assertions, and removed about 1,700 lines of dead code.",
          period: { start: "2026-01", end: "2026-04-10" },
        },
        {
          title: "Real-time export progress.",
          text: "Shipped live progress for SQL data exports across 6 repositories: a new server-streaming gRPC API, progress events relayed through Temporal, and a progress bar in the desktop app.",
          period: { start: "2026-10-27", end: "2026-11-12" },
        },
        {
          title: "Data freshness.",
          text: "Built per-table data freshness in Go for the analytics query engine, tracking per-partition Kafka offsets and caught-up state so dashboards show when data was last refreshed.",
          period: { start: "2026-10", end: "2026-11" },
        },
        {
          title: "Multi-tab dashboards.",
          text: "Shipped multi-tab dashboards in React across 20 PRs (add, rename, delete, drag-to-reorder and per-tab URL filters) and rolled them out in 5 feature-flag stages, from dev to production GA.",
          period: { start: "2026-09", end: "2026-11" },
        },
        {
          title: "Multi-hop joins.",
          text: "Built multi-hop relationship joins for dashboard widgets, unifying foreign-key and custom-link joins into one hop-based contract, with the SQL generation contributed to open-source Meerkat.",
          period: { start: "2026-05", end: "2026-09" },
        },
        {
          title: "Build-time tracing.",
          text: "Built dev-instrument, an rspack loader that uses the TypeScript compiler API to trace exported functions into per-operation call trees, compiled out of production builds. A companion Claude Code skill reads the traces and found the root cause of a crash that code review had missed.",
          period: { start: "2026-05-22", end: "2026-06-11" },
        },
        {
          title: "Test reliability.",
          text: "Traced 44 always-failing Playwright tests to the content security policy blocking mocked fetches. After the fix, hosted-QA failures fell from 46 to 8, none of them related.",
          period: { start: "2026-09-25", end: "2026-11-11" },
        },
      ],
      tags: ["TypeScript", "React", "Go", "Python", "Kafka", "gRPC", "Temporal", "DuckDB", "Playwright"],
    },
    {
      role: "Software Engineer Intern",
      company: "AlgoUniversity (YC S21)",
      companyUrl: "https://algouniversity.com",
      location: "Remote",
      start: "Jun 2025",
      end: "Aug 2025",
      highlights: [
        {
          text: "Unified Crawl4AI scrapers with an auto-tagger, ingesting about 2.5k coding problems from 100+ pages and cutting triage time by about 80%.",
        },
        {
          text: "Containerized services on AWS EC2 with Docker health checks and rolling restarts, with 99%+ uptime observed over 30 days.",
        },
        {
          text: "Mentored 120+ students in full-stack development; 85%+ finished their capstone projects on schedule.",
        },
      ],
      tags: ["Python", "Crawl4AI", "Docker", "AWS EC2", "Django"],
    },
    {
      role: "Data Analyst Intern",
      company: "University of Massachusetts",
      companyUrl: "https://www.umass.edu",
      location: "Remote",
      start: "Oct 2024",
      end: "Jan 2025",
      highlights: [
        { text: "Evaluated a program by analyzing 100+ survey responses with t-tests and ANOVA." },
        { text: "Wrote Python preprocessing scripts and built 10+ interactive charts to report the findings." },
      ],
      tags: ["Python", "Statistics", "Data visualization"],
    },
    {
      role: "Research Intern",
      company: "NIT Trichy",
      companyUrl: "https://www.nitt.edu",
      location: "Tiruchirappalli",
      start: "Jun 2024",
      end: "Oct 2024",
      highlights: [
        { text: "Built a security analytics service with parsers and rule sets; its alerts API reached 97% precision." },
        { text: "Built a Python ETL pipeline that processes 2M+ records, with data-quality checks." },
        { text: "Built a KNN-based anomaly detector that flags 4 user-risk patterns, reducing false-positive alerts by 10%." },
      ],
      tags: ["Python", "NLP", "scikit-learn", "ETL"],
    },
  ] satisfies Experience[],

  featuredProjects: [
    {
      name: "ForgeDB",
      kicker: "C++ · Systems",
      summary:
        "A Redis-compatible in-memory database written from scratch in C++17. It speaks the RESP2 protocol, so the standard redis-cli works against it.",
      points: [
        "Single-threaded, non-blocking event loop on kqueue that serves many clients without locks, with per-client buffers for partial frames.",
        "Strings, lists, hashes and sets in a std::variant store, with TTLs expired both lazily and by an active sweep, plus Pub/Sub.",
        "Durable through fork() copy-on-write RDB snapshots (temp file, fsync, atomic rename) and an append-only log replayed on startup.",
      ],
      tags: ["C++17", "POSIX sockets", "kqueue", "RESP2", "GoogleTest", "CMake"],
      links: [{ label: "Source", href: "https://github.com/Sreevardhan1729/ForgeDB" }],
      visual: {
        kind: "terminal",
        caption: "redis-cli talking to ForgeDB",
        prompt: "127.0.0.1:6379>",
        lines: [
          { type: "shell", text: "redis-cli -p 6379" },
          { type: "input", text: "PING" },
          { type: "output", text: "PONG" },
          { type: "input", text: 'SET mykey "Hello Redis" EX 60' },
          { type: "output", text: "OK" },
          { type: "input", text: "TTL mykey" },
          { type: "output", text: "(integer) 60" },
          { type: "input", text: "GET mykey" },
          { type: "output", text: '"Hello Redis"' },
        ],
      },
    },
    {
      name: "AI Inference Gateway",
      kicker: "Go · Infrastructure",
      summary:
        "A reverse proxy for LLM APIs in Go, using only the standard library. It balances traffic across model backends, streams responses and protects the backends under load.",
      points: [
        "Smooth weighted round-robin with a per-backend circuit breaker (closed, open, half-open) that routes around failing backends.",
        "Per-API-key token buckets that charge an estimated token cost, and a bounded priority queue that sheds batch traffic first under backpressure.",
        "Streams SSE responses chunk by chunk and reconciles output tokens from the stream for per-key usage and cost, exported as Prometheus metrics.",
      ],
      tags: ["Go", "SSE", "Prometheus", "Rate limiting", "Load balancing"],
      links: [{ label: "Source", href: "https://github.com/Sreevardhan1729/ai-inference-gateway" }],
      visual: {
        kind: "pipeline",
        caption: "Request path through the gateway",
        stages: [
          { label: "Client", detail: "POST /v1/chat/completions" },
          { label: "Rate limiter", detail: "token bucket per API key" },
          { label: "Priority queue", detail: "1,000-job heap · 50 workers" },
          { label: "Load balancer", detail: "smooth WRR + circuit breaker" },
        ],
        backends: [
          { label: "Backend A", detail: "weight 1" },
          { label: "Backend B", detail: "weight 3" },
        ],
      },
    },
    {
      name: "Meerkat",
      kicker: "TypeScript · Open source",
      summary:
        "Contributions to DevRev's open-source TypeScript SDK that turns Cube-style queries into DuckDB SQL, in the browser or on Node.js.",
      points: [
        "Added filter conditions for link-type joins to the meerkat-core SQL builder.",
        "Fixed join conditions that went stale on aliased bridge tables.",
        "Patched high-severity js-yaml and tar vulnerabilities.",
      ],
      tags: ["TypeScript", "DuckDB", "SQL", "Nx"],
      links: [{ label: "Repository", href: "https://github.com/devrev/meerkat" }],
      visual: {
        kind: "pull-requests",
        caption: "Merged pull requests",
        repo: "devrev/meerkat",
        pulls: [
          {
            number: 293,
            title: "feat(meerkat-core): add join filter condition support for links",
            additions: 532,
            deletions: 54,
            href: "https://github.com/devrev/meerkat/pull/293",
          },
          {
            number: 299,
            title: "fix(meerkat-core): rewrite join conditions for aliased bridge tables",
            additions: 199,
            deletions: 26,
            href: "https://github.com/devrev/meerkat/pull/299",
          },
          {
            number: 300,
            title: "fix(snyk): patch high-severity js-yaml and tar vulnerabilities",
            additions: 592,
            deletions: 72,
            href: "https://github.com/devrev/meerkat/pull/300",
          },
        ],
      },
    },
  ] satisfies FeaturedProject[],

  projects: [
    {
      name: "Online Judge & AI Debugger",
      description:
        "A coding platform with a Docker-sandboxed executor (CPU and memory limits, five verdict types), a Django REST API for problems and submissions, and an error-diagnostics module that enriches stack traces.",
      tags: ["React", "Django", "Docker", "AWS EC2"],
      links: [
        { label: "Live", href: "https://coding-platform-sage.vercel.app/" },
        { label: "Source", href: "https://github.com/Sreevardhan1729/coding_platform" },
      ],
    },
    {
      name: "Intelligent RAG Agent",
      description:
        "A ReAct agent built with LangChain that answers questions over PDFs, websites and raw text through a RAG pipeline, deployed to EC2 by GitHub Actions.",
      tags: ["Python", "LangChain", "Flask", "Docker"],
      links: [{ label: "Source", href: "https://github.com/Sreevardhan1729/RAG-Agent" }],
    },
    {
      name: "Smart AI Job Matcher",
      description:
        "Extracts skills from a resume with a custom NLP model, ranks job descriptions by fit and lists the skills each applicant is missing.",
      tags: ["Python", "NLP", "Flask", "React"],
      links: [
        { label: "Live", href: "https://ai-job-fit.vercel.app/" },
        { label: "Source", href: "https://github.com/Sreevardhan1729/AIJobFit" },
      ],
    },
    {
      name: "Underwater Fish Disease Detection",
      description:
        "A Vision Transformer that detects fish diseases in underwater video with 90% accuracy, using OpenCV to locate the fish.",
      tags: ["PyTorch", "Computer vision", "OpenCV"],
      links: [{ label: "Source", href: "https://github.com/Sreevardhan1729/Fish_Disease_Detection" }],
    },
    {
      name: "BookBridge",
      description:
        "A book exchange platform with real-time chat and Google Books integration. I led the team of six that built it.",
      tags: ["Django", "SQL", "Google Books API"],
      links: [{ label: "Source", href: "https://github.com/Sreevardhan1729/Book-Bridge" }],
    },
    {
      name: "GuardianPulse",
      description: "A real-time location-sharing Android app for families, with Google sign-in and Firebase.",
      tags: ["Kotlin", "Firebase", "Google Maps"],
      links: [
        {
          label: "Source",
          href: "https://github.com/Sreevardhan1729/GuardianPulse-Family-Location-Insights",
        },
      ],
    },
  ] satisfies Project[],

  skills: [
    { group: "Languages", items: ["TypeScript", "Go", "Python", "C++", "SQL", "JavaScript", "Kotlin"] },
    {
      group: "Frontend",
      items: ["React", "Next.js", "TanStack Query", "React Hook Form", "Zod", "Highcharts", "Tailwind CSS"],
    },
    {
      group: "Backend & data",
      items: [
        "Kafka",
        "gRPC",
        "Protocol Buffers",
        "Temporal",
        "DuckDB",
        "Node.js",
        "Django",
        "FastAPI",
        "PostgreSQL",
        "Redis",
      ],
    },
    {
      group: "Infrastructure",
      items: ["Docker", "AWS EC2", "CircleCI", "GitHub Actions", "Nx", "Rspack", "Prometheus", "Grafana Loki", "Linux"],
    },
    { group: "Testing", items: ["Playwright", "Vitest", "Jest", "Ginkgo", "GoogleTest", "Go race detector"] },
    {
      group: "AI & ML",
      items: ["Claude Code", "Codex", "MCP", "LangChain", "PyTorch", "scikit-learn", "OpenCV"],
    },
  ],

  achievements: [
    { value: "2,077", label: "LeetCode rating", detail: "Top 1.69% · 500+ problems", href: "https://leetcode.com/u/Vardhan1729/" },
    { value: "4★", label: "CodeChef", detail: "Max rating 1,827" },
    { value: "Specialist", label: "Codeforces", detail: "Max rating 1,545" },
    { value: "565th", label: "IICPC", detail: "Of 47,000+ participants" },
  ],
}
