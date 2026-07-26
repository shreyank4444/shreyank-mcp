export type SkillCategory = "Expert" | "Proficient" | "Familiar";

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  highlights: string[];
  url?: string;
}

export interface Experience {
  company: string;
  location: string;
  title: string;
  period: string;
  projects: Project[];
}

export const profile = {
  name: "Shreyank S",
  location: "Bangalore, India",
  headline: "Full-Stack & Frontend Engineer",
  summary:
    "Full-Stack & Frontend Engineer with 3.5+ years of experience building and scaling production consumer products, real-time transaction flows, and AI-leveraged product workflows.",
  highlights: [
    "Promoted from Engineering Intern to Frontend Lead at Blocktheory.",
    "Shipped five live consumer and fintech products.",
    "Built an App Store-published lending platform serving 200+ active users with $1M+ in volume/collateral.",
    "Cut API infrastructure costs by 50% and improved web and mobile performance by 40%.",
  ],
  links: {
    linkedin: "https://www.linkedin.com/in/shreyank-s-82b706106",
    github: "https://github.com/shreyank4444",
    portfolio: "https://github.com/shreyank4444",
  },
} as const;

export const skills: Record<SkillCategory, string[]> = {
  Expert: [
    "React",
    "React Native (Expo)",
    "TypeScript",
    "JavaScript",
    "Next.js",
    "Redux",
    "Zustand",
    "HTML5",
    "CSS3",
    "Git",
  ],
  Proficient: [
    "Node.js",
    "REST APIs",
    "GraphQL",
    "WebSockets",
    "Ethers.js",
    "Web3.js",
    "Tailwind CSS",
    "Firebase",
    "Supabase",
    "Vercel",
  ],
  Familiar: ["Docker", "Chrome Extension APIs", "DeFi Application Architecture"],
};

export const experience: Experience[] = [
  {
    company: "Blocktheory",
    location: "Bangalore, India",
    title: "Frontend Lead",
    period: "2022 – Present",
    projects: [
      {
        name: "Surge Credit",
        description: "Consumer Bitcoin-backed lending and asset platform.",
        technologies: ["React Native", "Next.js", "TypeScript", "WebSockets", "REST APIs"],
        highlights: [
          "Co-owned consumer onboarding and discovery flows for a live App Store-published platform.",
          "Scaled to 200+ active users and approximately $1M+ in volume/collateral.",
          "Cut infrastructure costs by 50% through client caching and Node API query optimization.",
          "Improved web and mobile performance by 40% and delivered sub-second transaction alerts.",
        ],
      },
      {
        name: "Nexio",
        description: "Institutional credit and financial workflows.",
        technologies: ["React", "Next.js", "TypeScript", "GraphQL", "Node.js"],
        highlights: [
          "Built multi-step transaction and document verification surfaces with composable UI primitives.",
          "Instrumented funnel telemetry used daily by leadership.",
          "Supported 99.9% operational reliability through clean frontend and backend contracts.",
        ],
        url: "https://nexio.xyz",
      },
      {
        name: "Clink",
        description: "Digital checkout engine and payment flows.",
        technologies: ["React", "TypeScript", "Node.js", "USDC Payments"],
        highlights: [
          "Designed checkout flows with real-time payment confirmation, automated verification, and graceful error boundaries.",
        ],
        url: "https://clinkaway.com",
      },
      {
        name: "Frontier Wallet & Consumer Extensions",
        description: "Wallet and consumer extension experiences.",
        technologies: ["React", "Chrome Extension APIs", "TypeScript", "Web3"],
        highlights: [
          "Developed sandboxed dApp connection management, security guardrails, and responsive asset search.",
        ],
        url: "https://frontier.xyz",
      },
      {
        name: "BLIO",
        description: "High-performance analytics explorer.",
        technologies: ["React", "Next.js", "TypeScript", "GraphQL"],
        highlights: [
          "Built search, filtering, and visualization interfaces for live data feeds at 60 FPS with offline fallbacks.",
        ],
      },
    ],
  },
];

export const education = [
  {
    degree: "Bachelor of Engineering (B.E.) in Mechanical Engineering",
    institution: "University of Visvesvaraya College of Engineering (UVCE)",
    location: "Bangalore, India",
  },
  {
    degree: "Master of Science (M.Sc.) in Brewing and Distilling",
    institution: "Heriot-Watt University",
    location: "Edinburgh, UK",
  },
];
