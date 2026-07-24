import { education, experience, profile, skills, type SkillCategory } from "./profile.js";

export function getProfile() {
  return profile;
}

export function listSkills(category?: SkillCategory) {
  if (category) {
    return { [category]: skills[category] };
  }

  return skills;
}

export function listProjects() {
  return experience.flatMap((role) =>
    role.projects.map((project) => ({
      company: role.company,
      ...project,
    })),
  );
}

export function searchBackground(query: string, limit = 10) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const entries = [
    ...Object.entries(skills).flatMap(([category, items]) =>
      items.map((item) => ({ type: "skill", title: item, details: category })),
    ),
    ...experience.flatMap((role) => [
      {
        type: "experience",
        title: `${role.title} at ${role.company}`,
        details: `${role.period}; ${role.location}`,
      },
      ...role.projects.map((project) => ({
        type: "project",
        title: project.name,
        details: [project.description, ...project.technologies, ...project.highlights].join(" "),
      })),
    ]),
    ...education.map((item) => ({
      type: "education",
      title: item.degree,
      details: `${item.institution}; ${item.location}`,
    })),
  ];

  return entries
    .filter((entry) => `${entry.title} ${entry.details}`.toLocaleLowerCase().includes(normalizedQuery))
    .slice(0, limit);
}
