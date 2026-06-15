export type SkillCategory =
  | "cloud"
  | "data"
  | "devops"
  | "fonctionnel"
  | "framework"
  | "langage"
  | "methode"
  | "soft_skill"

export type PracticeTone = "primary" | "success" | "warning" | "danger" | "accent"

export type PracticeTerritory = {
  id: string
  name: string
  slug: string
  description: string
  perimeter: string
  stackTags: string[]
  tone: PracticeTone
  x: number
  y: number
  rx: number
  ry: number
  skillNames: string[]
}

export type SkillNode = {
  id: string
  name: string
  category: SkillCategory
}

export const practices: PracticeTerritory[] = [
  {
    id: "9cfc4f83-7e66-4c68-a83f-b9410758e244",
    name: "Data Intelligence & Artificial Intelligence",
    slug: "data-ia",
    description:
      "Cadrage strategique IA, architectures RAG, traitement semantique, MLOps, automatisation cognitive des processus business.",
    perimeter:
      "Cadrage strategique, architectures RAG, traitement semantique, MLOps, automatisation cognitive des processus business.",
    stackTags: ["pgvector", "n8n", "Python", "Databricks", "LangChain"],
    tone: "primary",
    x: 39,
    y: 30,
    rx: 20,
    ry: 15,
    skillNames: [
      "Data Engineer",
      "Python",
      "Python API",
      "Machine Learning",
      "TensorFlow",
      "SQL",
      "PostgreSQL",
      "ETL/ELT",
      "Apache Airflow",
      "Data Viz",
      "Data Viz (Matplotlib/Seaborn)",
      "GCP (BigQuery, Dataflow)",
    ],
  },
  {
    id: "a66653ab-e46a-4dad-a32c-0841596860c4",
    name: "Digital & Cloud Engineering",
    slug: "digital-cloud",
    description:
      "Conception d'applications web denses a fort trafic, APIs serverless haute performance, architectures Cloud natives securisees.",
    perimeter:
      "Conception d'applications web denses a fort trafic, APIs serverless haute performance, architectures Cloud natives securisees.",
    stackTags: ["Next.js 15", "React", "Supabase", "TypeScript", "AWS", "Azure"],
    tone: "success",
    x: 73,
    y: 61,
    rx: 18,
    ry: 14,
    skillNames: [
      "Next.js",
      "React",
      "React.js",
      "TypeScript",
      "JavaScript",
      "Node.js",
      "FastAPI",
      "Microservices",
      "System Architecture",
      "AWS",
      "Azure",
      "Cloud Architect",
      "Tailwind CSS",
      "Tailwind",
      "SASS/CSS",
    ],
  },
  {
    id: "96ca89cf-f142-421f-8e38-9c16eafd1330",
    name: "Agile Product Management",
    slug: "agile-pm",
    description:
      "Cadrage de produits B2B complexes, design system flat & premium, direction de projets au forfait, conduite du changement.",
    perimeter:
      "Cadrage de produits B2B complexes, design system flat & premium, direction de projets au forfait, conduite du changement.",
    stackTags: ["Product Owner", "Scrum", "UX/UI Design", "Figma"],
    tone: "warning",
    x: 34,
    y: 75,
    rx: 18,
    ry: 13,
    skillNames: [
      "Agile/Scrum",
      "Kanban",
      "Roadmapping",
      "User Stories",
      "User Research",
      "Design Thinking",
      "Design System",
      "Figma",
      "Figma (Lecture)",
      "Prototyping",
      "Facilitation",
      "Mentoring",
      "Conflict Resolution",
    ],
  },
  {
    id: "d9054732-626f-4de8-8deb-8d1449715b36",
    name: "Cybersecurity & SecOps",
    slug: "cybersecurity",
    description:
      "Gouvernance SecOps, audit de code, durcissement des bases Supabase / PostgreSQL, architectures Cloud souveraines.",
    perimeter:
      "Gouvernance SecOps, audit de code, durcissement des bases Supabase / PostgreSQL, architectures Cloud souveraines.",
    stackTags: ["RLS Active", "Terraform", "SecNumCloud", "CI/CD"],
    tone: "danger",
    x: 76,
    y: 25,
    rx: 17,
    ry: 12,
    skillNames: [
      "Cybersécurité",
      "Cybersecurity",
      "SecOps",
      "Cloud Security",
      "Cloud Security (AWS/Azure)",
      "Penetration Testing",
      "SIEM",
      "Terraform",
      "CI/CD",
      "Docker",
      "Kubernetes",
      "Linux",
      "Git",
    ],
  },
  {
    id: "434f5796-0385-4935-a5aa-86454cf6ff66",
    name: "QA & Testing",
    slug: "qa-testing",
    description:
      "Assurance qualite, automatisation des tests fonctionnels et de performance, controle de la non-regression tout au long du cycle de developpement.",
    perimeter:
      "Automatisation des tests, tests de performance, controle qualite, reporting.",
    stackTags: ["Selenium", "Cypress", "JMeter", "Postman", "k6"],
    tone: "accent",
    x: 17,
    y: 48,
    rx: 15,
    ry: 12,
    skillNames: [
      "Test Strategy",
      "Selenium",
      "Cypress",
      "Jira",
      "CI/CD",
      "Docker",
      "Git",
      "Agile/Scrum",
    ],
  },
]

export const skills: SkillNode[] = [
  { id: "0211ac1b-520d-48fe-8014-b95eee14f32c", name: "Data Engineer", category: "data" },
  { id: "0548981f-e568-4099-b591-fed8a527c25d", name: "Linux", category: "devops" },
  { id: "05a87b80-9eb5-44be-b6c5-fb1e28efe029", name: "Design Thinking", category: "methode" },
  { id: "06cee7b2-1ab6-4591-a7e7-a93eddededdf", name: "React.js", category: "framework" },
  { id: "1684562f-55ae-46af-95ad-6dfd9e9d5160", name: "JavaScript", category: "langage" },
  { id: "20774b8c-374a-497e-af89-2f50220f6998", name: "Kubernetes", category: "devops" },
  { id: "22d522eb-4e2c-42d1-9f85-1e4566dde1f0", name: "Azure", category: "cloud" },
  { id: "26f8900b-ac30-4da1-ba7c-4fc98dcd1b47", name: "SecOps", category: "devops" },
  { id: "27382e98-6458-45dc-9a2a-daad6467ba94", name: "Machine Learning", category: "data" },
  { id: "30a6f9cc-fa52-46a3-8c4d-8c0c19b474ad", name: "Data Viz (Matplotlib/Seaborn)", category: "data" },
  { id: "318df965-7e82-4c3d-8e49-588cb2f3b650", name: "SASS/CSS", category: "langage" },
  { id: "37c1118e-a533-476b-847f-f882b7f677a9", name: "Python", category: "langage" },
  { id: "42cc6634-e0f4-4105-8ea0-ed8a10be0e9c", name: "Data Viz", category: "data" },
  { id: "44139f2d-43ec-4b4e-9fec-d16215f45cb4", name: "Cybersécurité", category: "cloud" },
  { id: "451f216d-e0da-4927-869d-6097e0d5dabf", name: "ETL/ELT", category: "data" },
  { id: "4e851263-0866-4f83-90bf-e35d1271c657", name: "FastAPI", category: "framework" },
  { id: "4ef1d4cc-fb57-4907-86b1-cba35c7fc100", name: "Microservices", category: "fonctionnel" },
  { id: "4fec9002-7b29-441f-b6a8-b971785e88a0", name: "Next.js", category: "framework" },
  { id: "516b1cfa-f382-4504-9e00-9317ebd852b2", name: "CI/CD", category: "devops" },
  { id: "539210b9-7ec7-4dd0-a57a-e6af0e6d42a2", name: "Tailwind CSS", category: "framework" },
  { id: "55b57413-e93b-4700-b0b8-7b45943d00a3", name: "Roadmapping", category: "fonctionnel" },
  { id: "5744c7f7-acf8-409f-97b7-2dca13211024", name: "Apache Airflow", category: "devops" },
  { id: "574d4df7-9d54-42cb-8874-33e577f5d68a", name: "Facilitation", category: "soft_skill" },
  { id: "5d37ca29-de94-49b5-85d7-3265c05986c7", name: "Cybersecurity", category: "fonctionnel" },
  { id: "60dde2a5-e53d-4669-bd6e-28c1d3e80430", name: "TensorFlow", category: "framework" },
  { id: "66ad3ff4-c6de-4c67-b6af-85641ebea94f", name: "Docker", category: "devops" },
  { id: "6c09ec39-363e-4945-aeaa-6470bd75ea0b", name: "Agile/Scrum", category: "methode" },
  { id: "7b352572-b941-44a8-99d9-6f852cfbe063", name: "Jira", category: "devops" },
  { id: "7dc2c478-e2ad-44eb-8b24-c7399226cbc8", name: "Cloud Security", category: "cloud" },
  { id: "7e19f32b-a489-4bf9-b453-c30aad211b48", name: "DevOps", category: "devops" },
  { id: "816bd54a-676d-4dbc-aa0f-bcb609bd6c0a", name: "Node.js", category: "framework" },
  { id: "82cc4c1f-5e5a-4473-8f26-3da4918ad189", name: "Lead Full-Stack", category: "fonctionnel" },
  { id: "87aec773-4c3b-4b64-89e9-76622fa471b9", name: "Mentoring", category: "soft_skill" },
  { id: "8b373c7f-e4d6-4d40-807c-053157d984ff", name: "Terraform", category: "devops" },
  { id: "8d7110b9-4468-4597-85b8-7f3a6d3debc8", name: "Kanban", category: "methode" },
  { id: "8e94cf28-2336-4dfb-b435-45a8fb893ea2", name: "Cypress", category: "devops" },
  { id: "946e4d7b-f575-4c3b-8fc9-fe1f6d93908e", name: "Cloud Architect", category: "cloud" },
  { id: "97356463-2bbc-4c13-abe7-eae463cbe564", name: "Cloud Security (AWS/Azure)", category: "cloud" },
  { id: "9aa6379c-df66-4740-93be-f4ad731302aa", name: "Design System", category: "fonctionnel" },
  { id: "9e6d2a79-c098-4f86-aead-f2792c73e137", name: "TypeScript", category: "langage" },
  { id: "9ed2f83b-404a-4262-8367-45825cab5e3e", name: "Figma (Lecture)", category: "devops" },
  { id: "a6157eec-93d9-4146-afdb-d3156c6ac6a2", name: "User Stories", category: "fonctionnel" },
  { id: "a908ad6f-6dc8-40cd-aab6-f641459e1f2b", name: "Selenium", category: "devops" },
  { id: "ae81820c-9f8b-4e05-93fb-f6a76fbfbcbf", name: "Git", category: "devops" },
  { id: "afc6656e-9eba-45ab-b314-5f2dfcd96081", name: "Prototyping", category: "fonctionnel" },
  { id: "b6b1e51b-825b-4fea-a882-09a015c56b61", name: "Test Strategy", category: "fonctionnel" },
  { id: "c3bbbd48-42d4-4268-a161-debd1313039c", name: "System Architecture", category: "fonctionnel" },
  { id: "c3ce3b7f-09de-4a92-ac70-49fde6c2d163", name: "AWS", category: "cloud" },
  { id: "c624d386-6a0f-41ec-aa52-b0636e45bfa5", name: "Figma", category: "devops" },
  { id: "c7eef783-24f0-401a-938c-3a30c52b21d4", name: "User Research", category: "fonctionnel" },
  { id: "cd906948-5c5d-4642-a590-95891f17c7a5", name: "Penetration Testing", category: "fonctionnel" },
  { id: "d1672bbb-40d0-4d8d-a81f-0fe1cdc4ca76", name: "PostgreSQL", category: "data" },
  { id: "d664bd7c-e755-4156-a70f-c819ea7720ce", name: "React", category: "framework" },
  { id: "d91fdbac-6f11-4bb5-8b5c-0fe3027d345f", name: "GCP (BigQuery, Dataflow)", category: "cloud" },
  { id: "e1f19f33-603a-47cd-a4aa-e354507b1642", name: "Python API", category: "data" },
  { id: "e2487e0c-ca15-4f42-80b2-37338c19b993", name: "Tailwind", category: "langage" },
  { id: "fa4aba83-6931-4eb1-b078-f6eeab09f531", name: "SQL", category: "data" },
  { id: "ff734dfe-f8d2-4283-9c1a-c6a631be1e21", name: "SIEM", category: "devops" },
] as const
