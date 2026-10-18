/* =============================================================================
   Datos semilla (M13) — catálogo del Anexo A, ruta recomendada, plantillas de
   checklist y datos de demostración.

   Fuentes (no se inventa nada):
   - §5     modelo de datos (espejo en ./types.ts)
   - §6.2   ruta recomendada (12 exámenes, AIB-C01 fuera de la ruta)
   - §6.3   contenido obligatorio de la fase 0
   - §7.10  plantillas de checklist por nivel
   - §14 A  dataset: A.1 metadatos, A.2 dominios y pesos, A.3 prerrequisitos,
            A.4 recursos por certificación, A.5 forma exacta del seed
   - §15 B  URLs oficiales de las guías de examen

   Decisiones documentadas:
   - `scoredQuestions` queda en `null` para las 13 certificaciones (A.5 lo fija
     así; el anexo pide dejar `null` cuando no se ha verificado en la guía).
   - AIB-C01 no tiene fase ni orden en el Anexo A (aparecen como "—"): se agrupa
     en la fase 4 (especialización) porque el tipo `Phase` solo admite 0..4 y no
     está en la ruta recomendada.
   - Los prerrequisitos con "o" (DOP-C02, SCS-C03) se guardan como los dos
     códigos del anexo, ya que el campo es `string[]`; se aclara en `notes`.
   - Las fechas de las funciones de siembra se derivan de `now`; los datos de
     demo usan un contador determinista, nunca `Math.random()`.
   ========================================================================== */

import type { MiPlanDb } from './db';
import type {
  Attempt,
  AttemptBreakdown,
  AttemptKind,
  BudgetItem,
  Certification,
  CertLevel,
  ChecklistGroup,
  ChecklistItem,
  ExportProfile,
  Flashcard,
  Note,
  PlanItem,
  Question,
  Recurrence,
  Resource,
  Settings,
  StudySession,
  StudyType,
  Topic,
  Voucher,
} from './types';

/* =============================================================================
   1. Catálogo de certificaciones (§14 Anexo A)
   ========================================================================== */

/** Fecha del corte de datos del Anexo A. */
const VERIFIED_ON = '2026-10-18';

/** Instante de referencia del seed (2026-10-18T00:00 en America/Bogota). */
const SEED_EPOCH_ISO = '2026-10-18T05:00:00.000Z';

const DOCS_GUIDES = 'https://docs.aws.amazon.com/aws-certification/latest';

export const CERTIFICATIONS: Certification[] = [
  {
    id: 'CLF-C02',
    code: 'CLF-C02',
    name: 'AWS Certified Cloud Practitioner',
    level: 'foundational',
    phase: 1,
    priceUsd: 100,
    durationMin: 90,
    questions: 65,
    scoredQuestions: null,
    passingScore: 700,
    domains: [
      { id: 'cloud', name: 'Cloud Concepts', weight: 0.24 },
      { id: 'security', name: 'Security & Compliance', weight: 0.3 },
      { id: 'technology', name: 'Cloud Technology & Services', weight: 0.34 },
      { id: 'billing', name: 'Billing, Pricing & Support', weight: 0.12 },
    ],
    prerequisites: [],
    recommendedExperience: 'Ninguna; 6 meses de exposición a la nube ayuda',
    officialUrl: 'https://aws.amazon.com/certification/certified-cloud-practitioner/',
    examGuideUrl: `${DOCS_GUIDES}/cloud-practitioner-02/cloud-practitioner-02.html`,
    lifecycle: 'available',
    retirementDate: null,
    verifiedOn: VERIFIED_ON,
    notes: '',
  },
  {
    id: 'AIF-C01',
    code: 'AIF-C01',
    name: 'AWS Certified AI Practitioner',
    level: 'foundational',
    phase: 1,
    priceUsd: 100,
    durationMin: 90,
    questions: 65,
    scoredQuestions: null,
    passingScore: 700,
    domains: [
      { id: 'aiMl', name: 'Fundamentals of AI & ML', weight: 0.2 },
      { id: 'genai', name: 'Fundamentals of GenAI', weight: 0.24 },
      { id: 'foundationModels', name: 'Applications of Foundation Models', weight: 0.28 },
      { id: 'responsibleAi', name: 'Guidelines for Responsible AI', weight: 0.14 },
      { id: 'security', name: 'Security, Compliance & Governance', weight: 0.14 },
    ],
    prerequisites: [],
    recommendedExperience: 'Ninguna; base de IA/ML y GenAI',
    officialUrl: 'https://aws.amazon.com/certification/certified-ai-practitioner/',
    examGuideUrl: `${DOCS_GUIDES}/ai-practitioner-01/ai-practitioner-01.html`,
    lifecycle: 'available',
    retirementDate: null,
    verifiedOn: VERIFIED_ON,
    notes: '',
  },
  {
    id: 'SAA-C03',
    code: 'SAA-C03',
    name: 'AWS Certified Solutions Architect – Associate',
    level: 'associate',
    phase: 2,
    priceUsd: 150,
    durationMin: 130,
    questions: 65,
    scoredQuestions: null,
    passingScore: 720,
    domains: [
      { id: 'secure', name: 'Design Secure Architectures', weight: 0.3 },
      { id: 'resilient', name: 'Design Resilient Architectures', weight: 0.26 },
      { id: 'performance', name: 'Design High-Performing Architectures', weight: 0.24 },
      { id: 'cost', name: 'Design Cost-Optimized Architectures', weight: 0.2 },
    ],
    prerequisites: ['CLF-C02'],
    recommendedExperience: '1 año diseñando soluciones',
    officialUrl: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/',
    examGuideUrl: `${DOCS_GUIDES}/solutions-architect-associate-03/solutions-architect-associate-03.html`,
    lifecycle: 'available',
    retirementDate: null,
    verifiedOn: VERIFIED_ON,
    notes: '',
  },
  {
    id: 'DVA-C02',
    code: 'DVA-C02',
    name: 'AWS Certified Developer – Associate',
    level: 'associate',
    phase: 2,
    priceUsd: 150,
    durationMin: 130,
    questions: 65,
    scoredQuestions: null,
    passingScore: 720,
    domains: [
      { id: 'development', name: 'Development with AWS Services', weight: 0.32 },
      { id: 'security', name: 'Security', weight: 0.26 },
      { id: 'deployment', name: 'Deployment', weight: 0.24 },
      { id: 'troubleshooting', name: 'Troubleshooting & Optimization', weight: 0.18 },
    ],
    prerequisites: ['CLF-C02'],
    recommendedExperience: '1 año desarrollando en AWS',
    officialUrl: 'https://aws.amazon.com/certification/certified-developer-associate/',
    examGuideUrl: `${DOCS_GUIDES}/developer-associate-02/developer-associate-02.html`,
    lifecycle: 'available',
    retirementDate: null,
    verifiedOn: VERIFIED_ON,
    notes: 'DVA-C03 abre registro el 2026-10-27 (Anexo A).',
  },
  {
    id: 'SOA-C03',
    code: 'SOA-C03',
    name: 'AWS Certified CloudOps Engineer – Associate',
    level: 'associate',
    phase: 2,
    priceUsd: 150,
    durationMin: 130,
    questions: 65,
    scoredQuestions: null,
    passingScore: 720,
    domains: [
      { id: 'monitoring', name: 'Monitoring, Logging, Analysis & Remediation', weight: 0.22 },
      { id: 'reliability', name: 'Reliability & Business Continuity', weight: 0.22 },
      { id: 'automation', name: 'Deployment, Provisioning & Automation', weight: 0.22 },
      { id: 'security', name: 'Security & Compliance', weight: 0.16 },
      { id: 'networking', name: 'Networking & Content Delivery', weight: 0.18 },
    ],
    prerequisites: ['CLF-C02'],
    recommendedExperience: '1 año en operaciones/sysadmin',
    officialUrl: 'https://aws.amazon.com/certification/certified-cloudops-engineer-associate/',
    examGuideUrl: `${DOCS_GUIDES}/sysops-administrator-associate-03/sysops-administrator-associate-03.html`,
    lifecycle: 'available',
    retirementDate: null,
    verifiedOn: VERIFIED_ON,
    notes: 'Sustituye a SOA-C02 (retired) como CloudOps Engineer (Anexo A).',
  },
  {
    id: 'DEA-C01',
    code: 'DEA-C01',
    name: 'AWS Certified Data Engineer – Associate',
    level: 'associate',
    phase: 2,
    priceUsd: 150,
    durationMin: 130,
    questions: 65,
    scoredQuestions: null,
    passingScore: 720,
    domains: [
      { id: 'dataIngestion', name: 'Data Ingestion & Transformation', weight: 0.34 },
      { id: 'dataStore', name: 'Data Store Management', weight: 0.26 },
      { id: 'dataOperations', name: 'Data Operations & Support', weight: 0.22 },
      { id: 'dataSecurity', name: 'Data Security & Governance', weight: 0.18 },
    ],
    prerequisites: ['CLF-C02'],
    recommendedExperience: '1–2 años en datos/ETL',
    officialUrl: 'https://aws.amazon.com/certification/certified-data-engineer-associate/',
    examGuideUrl: `${DOCS_GUIDES}/data-engineer-associate-01/data-engineer-associate-01.html`,
    lifecycle: 'available',
    retirementDate: null,
    verifiedOn: VERIFIED_ON,
    notes: 'Opcional en la ruta (§6.2).',
  },
  {
    id: 'MLA-C02',
    code: 'MLA-C02',
    name: 'AWS Certified Machine Learning Engineer – Associate',
    level: 'associate',
    phase: 2,
    priceUsd: 150,
    durationMin: 130,
    questions: 65,
    scoredQuestions: null,
    passingScore: 720,
    domains: [
      { id: 'dataPrep', name: 'Data Preparation for ML & AI', weight: 0.28 },
      { id: 'mlDevelopment', name: 'ML & FM Development', weight: 0.24 },
      { id: 'deployment', name: 'Deployment & Orchestration', weight: 0.24 },
      { id: 'operations', name: 'Operating, Monitoring & Securing', weight: 0.24 },
    ],
    prerequisites: ['CLF-C02', 'SAA-C03'],
    recommendedExperience: '1 año con SageMaker AI y Bedrock',
    officialUrl: 'https://aws.amazon.com/certification/certified-machine-learning-engineer-associate/',
    examGuideUrl: `${DOCS_GUIDES}/machine-learning-engineer-associate-02/machine-learning-engineer-associate-02.html`,
    lifecycle: 'available',
    retirementDate: null,
    verifiedOn: VERIFIED_ON,
    notes: 'Opcional en la ruta (§6.2); sustituye a MLA-C01 (retired).',
  },
  {
    id: 'SAP-C02',
    code: 'SAP-C02',
    name: 'AWS Certified Solutions Architect – Professional',
    level: 'professional',
    phase: 3,
    priceUsd: 300,
    durationMin: 180,
    questions: 75,
    scoredQuestions: null,
    passingScore: 750,
    domains: [
      { id: 'organizational', name: 'Design for Organizational Complexity', weight: 0.26 },
      { id: 'newSolutions', name: 'Design for New Solutions', weight: 0.29 },
      { id: 'improvement', name: 'Continuous Improvement', weight: 0.25 },
      { id: 'migration', name: 'Migration & Modernization', weight: 0.2 },
    ],
    prerequisites: ['SAA-C03'],
    recommendedExperience: '2+ años de arquitectura',
    officialUrl: 'https://aws.amazon.com/certification/certified-solutions-architect-professional/',
    examGuideUrl: `${DOCS_GUIDES}/solutions-architect-professional-02/solutions-architect-professional-02.html`,
    lifecycle: 'retiring',
    retirementDate: '2026-11-16',
    verifiedOn: VERIFIED_ON,
    notes: 'Se retira el 2026-11-16; SAP-C03 desde el 2026-11-17 (Anexo A).',
  },
  {
    id: 'DOP-C02',
    code: 'DOP-C02',
    name: 'AWS Certified DevOps Engineer – Professional',
    level: 'professional',
    phase: 3,
    priceUsd: 300,
    durationMin: 180,
    questions: 75,
    scoredQuestions: null,
    passingScore: 750,
    domains: [
      { id: 'sdlc', name: 'SDLC Automation', weight: 0.22 },
      { id: 'configIac', name: 'Configuration Management & IaC', weight: 0.17 },
      { id: 'resilience', name: 'Resilient Cloud Solutions', weight: 0.15 },
      { id: 'monitoring', name: 'Monitoring & Logging', weight: 0.15 },
      { id: 'incident', name: 'Incident & Event Response', weight: 0.14 },
      { id: 'security', name: 'Security & Compliance', weight: 0.17 },
    ],
    prerequisites: ['DVA-C02', 'SOA-C03'],
    prerequisiteMode: 'any',
    recommendedExperience: '2+ años en DevOps',
    officialUrl: 'https://aws.amazon.com/certification/certified-devops-engineer-professional/',
    examGuideUrl: `${DOCS_GUIDES}/devops-engineer-professional-02/devops-engineer-professional-02.html`,
    lifecycle: 'available',
    retirementDate: null,
    verifiedOn: VERIFIED_ON,
    notes: 'Prerrequisito del Anexo A: DVA-C02 o SOA-C03 (basta uno de los dos).',
  },
  {
    id: 'AIP-C01',
    code: 'AIP-C01',
    name: 'AWS Certified Generative AI Developer – Professional',
    level: 'professional',
    phase: 3,
    priceUsd: 300,
    durationMin: 180,
    questions: 75,
    scoredQuestions: null,
    passingScore: 750,
    domains: [
      { id: 'fmIntegration', name: 'FM Integration, Data & Compliance', weight: 0.31 },
      { id: 'integration', name: 'Implementation & Integration', weight: 0.26 },
      { id: 'aiSafety', name: 'AI Safety, Security & Governance', weight: 0.2 },
      { id: 'operationalEfficiency', name: 'Operational Efficiency', weight: 0.12 },
      { id: 'validation', name: 'Testing, Validation & Troubleshooting', weight: 0.11 },
    ],
    prerequisites: ['SAA-C03'],
    recommendedExperience: '2+ años construyendo en producción + 1 año de GenAI',
    officialUrl: 'https://aws.amazon.com/certification/certified-generative-ai-developer-professional/',
    examGuideUrl: `${DOCS_GUIDES}/ai-professional-01/ai-professional-01.html`,
    lifecycle: 'available',
    retirementDate: null,
    verifiedOn: VERIFIED_ON,
    notes: '',
  },
  {
    id: 'SCS-C03',
    code: 'SCS-C03',
    name: 'AWS Certified Security – Specialty',
    level: 'specialty',
    phase: 4,
    priceUsd: 300,
    durationMin: 170,
    questions: 65,
    scoredQuestions: null,
    passingScore: 750,
    domains: [
      { id: 'detection', name: 'Detection', weight: 0.16 },
      { id: 'incidentResponse', name: 'Incident Response', weight: 0.14 },
      { id: 'infrastructure', name: 'Infrastructure Security', weight: 0.18 },
      { id: 'iam', name: 'IAM', weight: 0.2 },
      { id: 'dataProtection', name: 'Data Protection', weight: 0.18 },
      { id: 'governance', name: 'Security Foundations & Governance', weight: 0.14 },
    ],
    prerequisites: ['SAA-C03', 'SOA-C03'],
    prerequisiteMode: 'any',
    recommendedExperience: '3–5 años en seguridad cloud',
    officialUrl: 'https://aws.amazon.com/certification/certified-security-specialty/',
    examGuideUrl: `${DOCS_GUIDES}/security-specialty-03/security-specialty-03.html`,
    lifecycle: 'available',
    retirementDate: null,
    verifiedOn: VERIFIED_ON,
    notes: 'Prerrequisito del Anexo A: SAA-C03 o SOA-C03 (basta uno de los dos).',
  },
  {
    id: 'ANS-C01',
    code: 'ANS-C01',
    name: 'AWS Certified Advanced Networking – Specialty',
    level: 'specialty',
    phase: 4,
    priceUsd: 300,
    durationMin: 170,
    questions: 65,
    scoredQuestions: null,
    passingScore: 750,
    domains: [
      { id: 'design', name: 'Network Design', weight: 0.3 },
      { id: 'implementation', name: 'Network Implementation', weight: 0.26 },
      { id: 'management', name: 'Network Management & Operation', weight: 0.2 },
      { id: 'security', name: 'Network Security, Compliance & Governance', weight: 0.24 },
    ],
    prerequisites: ['SAA-C03'],
    recommendedExperience: 'Redes avanzadas e híbridas',
    officialUrl: 'https://aws.amazon.com/certification/certified-advanced-networking-specialty/',
    examGuideUrl: `${DOCS_GUIDES}/advanced-networking-specialty-01/advanced-networking-specialty-01.html`,
    lifecycle: 'retiring',
    retirementDate: '2026-12-31',
    verifiedOn: VERIFIED_ON,
    notes: 'Se retira el 2026-12-31: agendar antes de esa fecha (Anexo A).',
  },
  {
    id: 'AIB-C01',
    code: 'AIB-C01',
    name: 'AWS Certified AI Business Strategist',
    level: 'business',
    phase: 4,
    priceUsd: null,
    durationMin: 130,
    questions: 0,
    scoredQuestions: null,
    passingScore: 700,
    domains: [
      { id: 'aiFundamentals', name: 'AI Fundamentals & Literacy', weight: 0.24 },
      { id: 'aiStrategy', name: 'AI Strategy & Business Value', weight: 0.28 },
      { id: 'aiGovernance', name: 'AI Governance & Responsible AI', weight: 0.24 },
      { id: 'transformation', name: 'Business Readiness & Transformation', weight: 0.24 },
    ],
    prerequisites: [],
    recommendedExperience: '6 meses junto a equipos de IA',
    officialUrl: 'https://aws.amazon.com/certification/certified-ai-business-strategist/',
    examGuideUrl: `${DOCS_GUIDES}/ai-business-strategist-01/ai-business-strategist-01.html`,
    lifecycle: 'available',
    retirementDate: null,
    verifiedOn: VERIFIED_ON,
    notes:
      'Precio y total de preguntas marcados como "verificar" en el Anexo A: no se copian cifras sin confirmar. Nivel Business, fuera de la ruta recomendada.',
  },
];

/* =============================================================================
   2. Ruta recomendada (§6.2) y certificaciones opcionales
   ========================================================================== */

/** 12 exámenes de la ruta, con el `order` de §6.2 (AIB-C01 no está en la ruta). */
export const RECOMMENDED_ROUTE: { certId: string; order: number }[] = [
  { certId: 'CLF-C02', order: 1 },
  { certId: 'AIF-C01', order: 2 },
  { certId: 'SAA-C03', order: 3 },
  { certId: 'DVA-C02', order: 4 },
  { certId: 'SOA-C03', order: 5 },
  { certId: 'DEA-C01', order: 6 },
  { certId: 'MLA-C02', order: 7 },
  { certId: 'SAP-C02', order: 8 },
  { certId: 'DOP-C02', order: 9 },
  { certId: 'AIP-C01', order: 10 },
  { certId: 'SCS-C03', order: 11 },
  { certId: 'ANS-C01', order: 12 },
];

/** Certificaciones que la UI marca como "opcional" (§6.2). */
export const OPTIONAL_CERTS: string[] = ['DEA-C01', 'MLA-C02'];

/* =============================================================================
   3. Plantillas de checklist (§7.10)
   ========================================================================== */

interface ChecklistTemplate {
  templateKey: string;
  title: string;
  groupId: ChecklistGroup;
  recurrence?: Recurrence;
}

/** Base común de §7.10: guía → Exam Prep → 2 labs → set de 20 → simulacro → errores → voucher → agendar. */
const TEMPLATE: Record<string, ChecklistTemplate> = {
  guide: {
    templateKey: 'guide',
    title: 'Leer la guía oficial del examen (dominios y pesos)',
    groupId: 'preparacion',
    recurrence: 'ninguna',
  },
  examPrep: {
    templateKey: 'examPrep',
    title: 'Completar el curso "Exam Prep" en AWS Skill Builder',
    groupId: 'preparacion',
    recurrence: 'ninguna',
  },
  labs: {
    templateKey: 'labs',
    title: 'Completar 2 labs prácticos (Builder Center / Workshops)',
    groupId: 'practica',
    recurrence: 'ninguna',
  },
  official20: {
    templateKey: 'official20',
    title: 'Set oficial de 20 preguntas con ≥ 80 % de acierto',
    groupId: 'practica',
    recurrence: 'ninguna',
  },
  mock: {
    templateKey: 'mock',
    title: 'Simulacro completo cronometrado',
    groupId: 'practica',
    recurrence: 'ninguna',
  },
  reviewErrors: {
    templateKey: 'reviewErrors',
    title: 'Repasar los errores del simulacro y anotarlos',
    groupId: 'preparacion',
    recurrence: 'ninguna',
  },
  lowDomains: {
    templateKey: 'lowDomains',
    title: 'Reforzar los dominios con menor acierto en los simulacros',
    groupId: 'preparacion',
    recurrence: 'ninguna',
  },
  mock2: {
    templateKey: 'mock2',
    title: 'Segundo simulacro completo con ≥ 85 %',
    groupId: 'practica',
    recurrence: 'ninguna',
  },
  voucher: {
    templateKey: 'voucher',
    title: 'Confirmar voucher o descuento antes de pagar',
    groupId: 'examen',
    recurrence: 'ninguna',
  },
  schedule: {
    templateKey: 'schedule',
    title: 'Agendar el examen en Pearson VUE',
    groupId: 'examen',
    recurrence: 'ninguna',
  },
};

/** Associate / Business: la base común de 8 ítems. */
const BASE_TEMPLATE: ChecklistTemplate[] = [
  TEMPLATE.guide,
  TEMPLATE.examPrep,
  TEMPLATE.labs,
  TEMPLATE.official20,
  TEMPLATE.mock,
  TEMPLATE.reviewErrors,
  TEMPLATE.voucher,
  TEMPLATE.schedule,
];

/** Professional / Specialty: base + refuerzo de dominios flojos + segundo simulacro. */
const ADVANCED_TEMPLATE: ChecklistTemplate[] = [
  TEMPLATE.guide,
  TEMPLATE.examPrep,
  TEMPLATE.labs,
  TEMPLATE.official20,
  TEMPLATE.mock,
  TEMPLATE.reviewErrors,
  TEMPLATE.lowDomains,
  TEMPLATE.mock2,
  TEMPLATE.voucher,
  TEMPLATE.schedule,
];

export const CHECKLIST_TEMPLATES: Record<CertLevel, ChecklistTemplate[]> = {
  // Foundational: 6 ítems; sin labs ni voucher (el examen de entrada no exige práctica de consola).
  foundational: [
    TEMPLATE.guide,
    TEMPLATE.examPrep,
    TEMPLATE.official20,
    TEMPLATE.mock,
    TEMPLATE.reviewErrors,
    TEMPLATE.schedule,
  ],
  associate: [...BASE_TEMPLATE],
  professional: [...ADVANCED_TEMPLATE],
  specialty: [...ADVANCED_TEMPLATE],
  business: [...BASE_TEMPLATE],
};

/* =============================================================================
   4. Recursos: fase 0 (§6.3) y por certificación (§A.4)
   ========================================================================== */

/** Los cinco recursos gratuitos de la fase 0 (§6.3). `id` lo asigna la siembra. */
export const PHASE0_RESOURCES: Omit<Resource, 'id'>[] = [
  {
    certId: null,
    title: 'AWS Skill Builder — cuenta gratuita con Builder ID',
    provider: 'AWS Skill Builder',
    url: 'https://skillbuilder.aws/',
    type: 'curso',
    isFree: true,
    costUsd: 0,
    domainIds: [],
    status: 'pendiente',
    estimatedMin: 480,
    note: 'Cursos "Exam Prep" y set oficial de 20 preguntas por certificación.',
  },
  {
    certId: null,
    title: 'AWS Cloud Quest: Cloud Practitioner',
    provider: 'AWS',
    url: 'https://aws.amazon.com/training/digital/aws-cloud-quest/',
    type: 'badge',
    isFree: true,
    costUsd: 0,
    domainIds: [],
    status: 'pendiente',
    estimatedMin: 600,
    note: 'Rol gratuito; badge al completar.',
  },
  {
    certId: null,
    title: 'AWS Educate — badges introductorios',
    provider: 'AWS Educate',
    url: 'https://aws.amazon.com/education/awseducate/',
    type: 'badge',
    isFree: true,
    costUsd: 0,
    domainIds: [],
    status: 'pendiente',
    estimatedMin: 240,
    note: 'Gratis y sin tarjeta.',
  },
  {
    certId: null,
    title: 'AWS Workshops / Builder Center — talleres con sandbox',
    provider: 'AWS Workshops',
    url: 'https://workshops.aws/',
    type: 'workshop',
    isFree: true,
    costUsd: 0,
    domainIds: [],
    status: 'pendiente',
    estimatedMin: 240,
    note: 'Talleres guiados con sandbox gratuito.',
  },
  {
    certId: null,
    title: 'AWS Free Tier — cuenta propia para labs',
    provider: 'AWS',
    url: 'https://aws.amazon.com/free/',
    type: 'lab',
    isFree: true,
    costUsd: 0,
    domainIds: [],
    status: 'pendiente',
    estimatedMin: 300,
    note: 'Configura presupuesto y alarma de gasto antes de empezar.',
  },
];

/** Dominio de mayor peso de una certificación (el "dominio principal" de §A.4). */
function primaryDomain(cert: Certification): { id: string; name: string; weight: number } | null {
  let best: { id: string; name: string; weight: number } | null = null;
  for (const domain of cert.domains) {
    if (best === null || domain.weight > best.weight) best = domain;
  }
  return best;
}

function domainIdsOf(cert: Certification): string[] {
  return cert.domains.map((domain) => domain.id);
}

/**
 * §A.4 — por certificación: 4 recursos gratuitos (guía, curso Exam Prep, set
 * oficial de 20 preguntas y un lab del dominio principal) + 2 opcionales de pago
 * que nacen `descartado` para no ensuciar el plan.
 */
export function buildCertResources(certs: Certification[]): Resource[] {
  const out: Resource[] = [];
  for (const cert of certs) {
    const allDomains = domainIdsOf(cert);
    const main = primaryDomain(cert);
    const labDomain = main ? [main.id] : [];
    const labTitle = main ? `Lab práctico — ${main.name} (${cert.code})` : `Lab práctico (${cert.code})`;

    out.push(
      {
        id: `res-${cert.id}-doc`,
        certId: cert.id,
        title: `Guía oficial del examen ${cert.code}`,
        provider: 'AWS',
        url: cert.examGuideUrl,
        type: 'doc',
        isFree: true,
        costUsd: 0,
        domainIds: allDomains,
        status: 'pendiente',
        estimatedMin: 60,
        note: 'Dominios, pesos y logística oficiales.',
      },
      {
        id: `res-${cert.id}-examprep`,
        certId: cert.id,
        title: `Exam Prep: ${cert.name}`,
        provider: 'AWS Skill Builder',
        url: 'https://skillbuilder.aws/',
        type: 'curso',
        isFree: true,
        costUsd: 0,
        domainIds: allDomains,
        status: 'pendiente',
        estimatedMin: 480,
        note: 'Curso gratuito de preparación con Builder ID.',
      },
      {
        id: `res-${cert.id}-official20`,
        certId: cert.id,
        title: `Set oficial de 20 preguntas — ${cert.code}`,
        provider: 'AWS Skill Builder',
        url: 'https://skillbuilder.aws/',
        type: 'practice_questions',
        isFree: true,
        costUsd: 0,
        domainIds: allDomains,
        status: 'pendiente',
        estimatedMin: 45,
        note: 'Objetivo: ≥ 80 % de acierto antes de pagar el examen.',
      },
      {
        id: `res-${cert.id}-lab`,
        certId: cert.id,
        title: labTitle,
        provider: 'Builder Center',
        url: 'https://workshops.aws/',
        type: 'lab',
        isFree: true,
        costUsd: 0,
        domainIds: labDomain,
        status: 'pendiente',
        estimatedMin: 120,
        note: 'Taller guiado del dominio de mayor peso.',
      },
      {
        id: `res-${cert.id}-practice-exam`,
        certId: cert.id,
        title: `Simulacro completo oficial — ${cert.code}`,
        provider: 'AWS Skill Builder',
        url: 'https://skillbuilder.aws/subscriptions',
        type: 'practice_exam',
        isFree: false,
        costUsd: 29,
        domainIds: allDomains,
        status: 'descartado',
        estimatedMin: cert.durationMin,
        note: 'Incluido en la suscripción de Skill Builder (~29 USD/mes).',
      },
      {
        id: `res-${cert.id}-third-party`,
        certId: cert.id,
        title: `Curso de terceros para ${cert.code} (Udemy/Cantrill/Tutorials Dojo)`,
        provider: 'Terceros',
        url: 'https://aws.amazon.com/certification/certification-prep/',
        type: 'curso',
        isFree: false,
        costUsd: 0,
        domainIds: allDomains,
        status: 'descartado',
        estimatedMin: 600,
        note: 'Costo variable según proveedor; se registra al comprarlo.',
      },
    );
  }
  return out;
}

/* =============================================================================
   5. Plan, checklist y temas base
   ========================================================================== */

/** Los 12 `planItems` de la ruta recomendada, todos en `no_iniciado`. */
export function buildPlanItems(now: Date, hoursPlannedByCert: Record<string, number> = {}): PlanItem[] {
  const createdAt = now.toISOString();
  return RECOMMENDED_ROUTE.map((route): PlanItem => {
    const planned = hoursPlannedByCert[route.certId];
    return {
      id: `plan-${route.certId}`,
      certId: route.certId,
      order: route.order,
      status: 'no_iniciado',
      targetDate: null,
      hoursPlanned: typeof planned === 'number' && planned > 0 ? planned : 40,
      hoursDone: 0,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

/** Checklist de una certificación según la plantilla de su nivel (§7.10). */
export function buildChecklistForCert(cert: Certification, now: Date, idSeed?: string): ChecklistItem[] {
  const templates = CHECKLIST_TEMPLATES[cert.level];
  const createdAt = now.toISOString();
  const seedPrefix = idSeed ? `${idSeed}-` : '';
  return templates.map(
    (template, index): ChecklistItem => ({
      id: `chk-${seedPrefix}${cert.id}-${template.templateKey}`,
      certId: cert.id,
      topicId: null,
      groupId: template.groupId,
      title: template.title,
      done: false,
      doneAt: null,
      dueDate: null,
      order: index + 1,
      recurrence: template.recurrence ?? 'ninguna',
      templateKey: template.templateKey,
      createdAt,
    }),
  );
}

/** Un tema de repaso por dominio, listo para programarse (§8.7). */
export function buildStarterTopics(cert: Certification, now: Date): Topic[] {
  const createdAt = now.toISOString();
  return cert.domains.map(
    (domain): Topic => ({
      id: `topic-${cert.id}-${domain.id}`,
      certId: cert.id,
      domainId: domain.id,
      title: `Repaso general — ${domain.name}`,
      descriptionMd: '',
      status: 'pendiente',
      priority: 2,
      sourceResourceId: null,
      confidence: null,
      ease: 2.5,
      intervalDays: 1,
      nextReviewAt: null,
      lastStudiedAt: null,
      reviewCount: 0,
      createdAt,
      updatedAt: createdAt,
    }),
  );
}

/* =============================================================================
   6. Ajustes y perfiles de exportación
   ========================================================================== */

export function defaultSettings(now: Date): Settings {
  return {
    id: 'app',
    displayName: 'Mi Plan AWS',
    weeklyHoursGoal: 6,
    studyDays: [1, 2, 3, 4, 5, 6],
    startDate: localDate(now),
    activeCertId: 'CLF-C02',
    theme: 'dark',
    locale: 'es',
    passphraseEnabled: false,
    schemaVersion: 1,
    fontMode: 'terminal',
    fontScale: 1,
    remindersEnabled: true,
    dailyReminderTime: '19:00',
    quietHours: { from: '22:00', to: '07:00' },
    maxRemindersPerDay: 3,
    defaultExportProfileId: 'perfil-obsidian',
  };
}

export const DEFAULT_EXPORT_PROFILES: ExportProfile[] = [
  {
    id: 'perfil-obsidian',
    name: 'Obsidian',
    folder: 'AWS',
    includeFrontmatter: true,
    includeWikilinks: true,
    includeNotes: true,
    includeSessions: true,
    includeBudget: true,
    includeChecklist: true,
    dataviewBlocks: true,
    taskDates: true,
    createdAt: SEED_EPOCH_ISO,
  },
];

/* =============================================================================
   7. Siembra
   ========================================================================== */

/** Catálogo base: certificaciones, recursos de catálogo y perfiles de exportación. */
export async function ensureCatalog(db: MiPlanDb): Promise<void> {
  const count = await db.certifications.count();
  if (count > 0) return;
  await db.transaction('rw', db.certifications, db.resources, db.exportProfiles, async () => {
    await db.certifications.bulkPut(CERTIFICATIONS);
    await db.resources.bulkPut(buildCertResources(CERTIFICATIONS));
    await db.exportProfiles.bulkPut(DEFAULT_EXPORT_PROFILES);
  });
}

/** Carga la ruta recomendada: planItems, recursos (fase 0 + catálogo), checklist y temas. */
export async function loadRecommendedRoute(db: MiPlanDb, now: Date): Promise<void> {
  const existing = await db.planItems.count();
  if (existing > 0) return;
  if ((await db.certifications.count()) === 0) await ensureCatalog(db);

  const routeCerts = await resolveRouteCerts(db);
  const planItems = buildPlanItems(now);
  const resources: Resource[] = [
    ...PHASE0_RESOURCES.map(
      (resource, index): Resource => ({ ...resource, id: `res-fase0-${index + 1}` }),
    ),
    ...buildCertResources(routeCerts),
  ];
  const checklistItems = routeCerts.flatMap((cert) => buildChecklistForCert(cert, now));
  const topics = routeCerts.flatMap((cert) => buildStarterTopics(cert, now));

  await db.transaction('rw', db.planItems, db.resources, db.checklistItems, db.topics, async () => {
    await db.planItems.bulkPut(planItems);
    await db.resources.bulkPut(resources);
    await db.checklistItems.bulkPut(checklistItems);
    await db.topics.bulkPut(topics);
  });
}

/** Certificaciones de la ruta, tal como están en la base (con respaldo en el anexo). */
async function resolveRouteCerts(db: MiPlanDb): Promise<Certification[]> {
  const ids = RECOMMENDED_ROUTE.map((route) => route.certId);
  const stored = await db.certifications.bulkGet(ids);
  const byId = new Map<string, Certification>();
  for (const cert of stored) {
    if (cert) byId.set(cert.id, cert);
  }
  const out: Certification[] = [];
  for (const id of ids) {
    const cert = byId.get(id) ?? CERTIFICATIONS.find((candidate) => candidate.id === id);
    if (cert) out.push(cert);
  }
  return out;
}

/* =============================================================================
   8. Helpers de fecha (zona fija del producto) y de demo
   ========================================================================== */

const TZ = 'America/Bogota';
/** Bogotá es UTC-5 todo el año: no hay horario de verano. */
const BOGOTA_OFFSET = '-05:00';

/** Fecha local YYYY-MM-DD en la zona del producto. */
function localDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** ISO UTC del instante que corresponde a una fecha/hora local del producto. */
function localIsoAt(date: string, time: string): string {
  return new Date(`${date}T${time}:00${BOGOTA_OFFSET}`).toISOString();
}

/** Suma días a un YYYY-MM-DD sin cruzar husos horarios. */
function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Fecha local de hace `days` días (negativo = futuro). */
function dateFrom(now: Date, days: number): string {
  return addDays(localDate(now), -days);
}

function certOrNull(certId: string): Certification | null {
  return CERTIFICATIONS.find((cert) => cert.id === certId) ?? null;
}

function domainIdsOfCert(certId: string): string[] {
  const cert = certOrNull(certId);
  return cert ? domainIdsOf(cert) : [];
}

/** Mismo cálculo que `domain/scoring.estimatedScore` (100 + 900·acierto), sin acoplar data → domain. */
function estimatedFromRatio(correct: number, total: number): number {
  if (!total || total <= 0) return 100;
  const ratio = Math.min(1, Math.max(0, correct / total));
  return Math.round(100 + 900 * ratio);
}

/* =============================================================================
   9. Datos de demostración (§M12 "datos de ejemplo")
   ========================================================================== */

const DEMO_SESSION_MINUTES = [30, 45, 60, 90, 25, 75] as const;
const DEMO_SESSION_TYPES: readonly StudyType[] = ['lectura', 'video', 'lab', 'practica', 'repaso', 'proyecto'];
const DEMO_CONFIDENCE = [3, 4, 5, 4, 3, 5] as const;
const DEMO_SESSION_NOTES = [
  'Lectura de la guía oficial y apuntes de dominios.',
  'Video del curso Exam Prep con notas rápidas.',
  'Lab guiado en el sandbox: repaso de la consola.',
  'Set de práctica corto, revisión de fallos al final.',
  'Repaso de notas y flashcards pendientes.',
  'Mini proyecto para fijar lo aprendido.',
];

/** 40 sesiones repartidas en los últimos 120 días (deterministas). */
function buildDemoSessions(now: Date): StudySession[] {
  const createdAt = now.toISOString();
  const out: StudySession[] = [];
  const make = (index: number, certId: string, offsetDays: number): StudySession => {
    const domains = domainIdsOfCert(certId);
    const domainId = domains.length > 0 ? domains[index % domains.length] : null;
    return {
      id: `demo-sess-${index + 1}`,
      date: dateFrom(now, offsetDays),
      certId,
      domainId,
      minutes: DEMO_SESSION_MINUTES[index % DEMO_SESSION_MINUTES.length],
      type: DEMO_SESSION_TYPES[index % DEMO_SESSION_TYPES.length],
      confidence: DEMO_CONFIDENCE[index % DEMO_CONFIDENCE.length],
      notes: DEMO_SESSION_NOTES[index % DEMO_SESSION_NOTES.length],
      createdAt,
    };
  };
  // CLF-C02: hace 117 → 41 días (antes del examen aprobado, hace 32).
  for (let i = 0; i < 20; i += 1) out.push(make(i, 'CLF-C02', 117 - i * 4));
  // SAA-C03: hace 39 → 1 día (la certificación en curso).
  for (let i = 0; i < 20; i += 1) out.push(make(20 + i, 'SAA-C03', 39 - i * 2));
  return out;
}

interface DemoAttemptSpec {
  id: string;
  certId: string;
  daysAgo: number;
  kind: AttemptKind;
  source: string;
  correct: number | null;
  total: number | null;
  score: number | null;
  durationMin: number;
  costUsd: number;
  voucherId: string | null;
  breakdown: AttemptBreakdown[];
  notes: string;
}

function makeAttempt(now: Date, spec: DemoAttemptSpec): Attempt {
  let estimated: number | null = null;
  if (spec.correct !== null && spec.total !== null && spec.total > 0) {
    estimated = estimatedFromRatio(spec.correct, spec.total);
  }
  const passing = certOrNull(spec.certId)?.passingScore ?? 700;
  const best = spec.score ?? estimated;
  return {
    id: spec.id,
    certId: spec.certId,
    date: dateFrom(now, spec.daysAgo),
    kind: spec.kind,
    source: spec.source,
    correct: spec.correct,
    total: spec.total,
    score: spec.score,
    estimatedScore: estimated,
    passed: best === null ? null : best >= passing,
    durationMin: spec.durationMin,
    costUsd: spec.costUsd,
    voucherId: spec.voucherId,
    breakdown: spec.breakdown,
    notes: spec.notes,
  };
}

function buildDemoAttempts(now: Date): Attempt[] {
  return [
    makeAttempt(now, {
      id: 'demo-attempt-1',
      certId: 'CLF-C02',
      daysAgo: 45,
      kind: 'practice_set',
      source: 'Oficial 20q (Skill Builder)',
      correct: 17,
      total: 20,
      score: null,
      durationMin: 30,
      costUsd: 0,
      voucherId: null,
      breakdown: [
        { domainId: 'cloud', correct: 5, total: 5 },
        { domainId: 'security', correct: 4, total: 5 },
        { domainId: 'technology', correct: 5, total: 6 },
        { domainId: 'billing', correct: 3, total: 4 },
      ],
      notes: 'Primer set oficial: 85 % de acierto.',
    }),
    makeAttempt(now, {
      id: 'demo-attempt-2',
      certId: 'CLF-C02',
      daysAgo: 40,
      kind: 'mock',
      source: 'Simulacro completo (Skill Builder)',
      correct: 54,
      total: 65,
      score: null,
      durationMin: 90,
      costUsd: 0,
      voucherId: null,
      breakdown: [
        { domainId: 'cloud', correct: 14, total: 16 },
        { domainId: 'security', correct: 17, total: 20 },
        { domainId: 'technology', correct: 16, total: 22 },
        { domainId: 'billing', correct: 7, total: 7 },
      ],
      notes: 'Simulacro completo cronometrado; fallos concentrados en servicios.',
    }),
    makeAttempt(now, {
      id: 'demo-attempt-3',
      certId: 'CLF-C02',
      daysAgo: 32,
      kind: 'real',
      source: 'Pearson VUE',
      correct: null,
      total: null,
      score: 812,
      durationMin: 90,
      costUsd: 50,
      voucherId: 'demo-voucher-1',
      breakdown: [
        { domainId: 'cloud', correct: 15, total: 16 },
        { domainId: 'security', correct: 18, total: 20 },
        { domainId: 'technology', correct: 15, total: 22 },
        { domainId: 'billing', correct: 7, total: 7 },
      ],
      notes: 'Examen real: aprobado con 812/1000. Desglose estimado de memoria.',
    }),
    makeAttempt(now, {
      id: 'demo-attempt-4',
      certId: 'SAA-C03',
      daysAgo: 14,
      kind: 'practice_set',
      source: 'Oficial 20q (Skill Builder)',
      correct: 15,
      total: 20,
      score: null,
      durationMin: 28,
      costUsd: 0,
      voucherId: null,
      breakdown: [
        { domainId: 'secure', correct: 5, total: 6 },
        { domainId: 'resilient', correct: 4, total: 6 },
        { domainId: 'performance', correct: 3, total: 4 },
        { domainId: 'cost', correct: 3, total: 4 },
      ],
      notes: '75 %: hay que subir seguridad y confiabilidad.',
    }),
    makeAttempt(now, {
      id: 'demo-attempt-5',
      certId: 'SAA-C03',
      daysAgo: 7,
      kind: 'practice_exam',
      source: 'Simulacro completo (Skill Builder)',
      correct: 46,
      total: 65,
      score: null,
      durationMin: 125,
      costUsd: 0,
      voucherId: null,
      breakdown: [
        { domainId: 'secure', correct: 16, total: 20 },
        { domainId: 'resilient', correct: 13, total: 17 },
        { domainId: 'performance', correct: 10, total: 16 },
        { domainId: 'cost', correct: 7, total: 12 },
      ],
      notes: 'Estimado por debajo del mínimo: reforzar optimización de costos.',
    }),
    makeAttempt(now, {
      id: 'demo-attempt-6',
      certId: 'SAA-C03',
      daysAgo: 2,
      kind: 'mock',
      source: 'Simulacro completo (Skill Builder)',
      correct: 48,
      total: 65,
      score: null,
      durationMin: 128,
      costUsd: 0,
      voucherId: null,
      breakdown: [
        { domainId: 'secure', correct: 17, total: 20 },
        { domainId: 'resilient', correct: 14, total: 17 },
        { domainId: 'performance', correct: 11, total: 16 },
        { domainId: 'cost', correct: 6, total: 12 },
      ],
      notes: 'Mejora de 2 aciertos; costos sigue siendo el dominio más flojo.',
    }),
  ];
}

function buildDemoNotes(now: Date): Note[] {
  const specs: {
    title: string;
    certId: string | null;
    domainId: string | null;
    tags: string[];
    pinned: boolean;
    daysAgo: number;
    body: string;
  }[] = [
    {
      title: 'Modelos de precio: bajo demanda, Savings Plans y Spot',
      certId: 'CLF-C02',
      domainId: 'billing',
      tags: ['clf-c02', 'facturacion'],
      pinned: true,
      daysAgo: 60,
      body: `# Modelos de precio

## Bajo demanda
Sin compromiso; pago por uso. Es el punto de partida mental del examen.

## Savings Plans y Reserved
Compromiso de uso (1 o 3 años) a cambio de descuento.

## Spot
Capacidad sobrante, interrumpible. Solo para cargas tolerantes a fallos.

## Regla mental
Si la pregunta habla de "carga interrumpible", piensa en Spot; si habla de "compromiso", piensa en Savings Plans.`,
    },
    {
      title: 'Responsabilidad compartida: dónde está el límite',
      certId: 'CLF-C02',
      domainId: 'security',
      tags: ['clf-c02', 'seguridad'],
      pinned: false,
      daysAgo: 58,
      body: `# Responsabilidad compartida

- **AWS:** seguridad **de** la nube (instalaciones, hardware, red global).
- **Cliente:** seguridad **en** la nube (datos, identidades, configuración).

## Ejemplo que casi fallo
El parcheo del sistema operativo de una instancia EC2 corre por mi cuenta: EC2 es IaaS.`,
    },
    {
      title: 'Well-Architected: los seis pilares',
      certId: 'CLF-C02',
      domainId: 'cloud',
      tags: ['clf-c02', 'well-architected'],
      pinned: false,
      daysAgo: 55,
      body: `# Los seis pilares

1. Excelencia operativa
2. Seguridad
3. Confiabilidad
4. Eficiencia del rendimiento
5. Optimización de costos
6. Sostenibilidad

## Uso en el examen
Muchas preguntas se resuelven preguntando "¿qué pilar mejora esta decisión?".`,
    },
    {
      title: 'Servicios que confundí en el examen',
      certId: 'CLF-C02',
      domainId: 'technology',
      tags: ['clf-c02', 'servicios'],
      pinned: true,
      daysAgo: 50,
      body: `# Pares que confundí

- **SQS vs SNS:** cola (un consumidor) vs publicación (varios suscriptores).
- **CloudWatch vs CloudTrail:** métricas y alarmas vs registro de llamadas a la API.
- **Security Group vs NACL:** instancia y con estado vs subred y sin estado.

## Siguiente
Repasar estos tres pares antes del simulacro final.`,
    },
    {
      title: 'IAM: rol vs usuario vs política en línea',
      certId: 'SAA-C03',
      domainId: 'secure',
      tags: ['saa-c03', 'iam'],
      pinned: true,
      daysAgo: 21,
      body: `# IAM

- **Usuario:** identidad con credenciales de larga duración. Evitarlo para cargas de trabajo.
- **Rol:** credenciales temporales asumidas por servicios o personas.
- **Política en línea:** adjunta a una sola identidad; no reutilizable.

## Regla
Si el consumidor es un servicio de AWS, la respuesta casi siempre es rol.`,
    },
    {
      title: 'KMS y cifrado en reposo',
      certId: 'SAA-C03',
      domainId: 'secure',
      tags: ['saa-c03', 'kms'],
      pinned: false,
      daysAgo: 19,
      body: `# KMS

- Claves administradas por AWS: sin coste adicional, rotación automática, sin política propia.
- Claves administradas por el cliente (CMK): política de claves propia y control de acceso granular.
- Cifrado en tránsito: TLS; en reposo: KMS o claves propias del servicio.

## Duda abierta
¿Cuándo conviene una CMK multi-región? Pendiente de revisar en la guía.`,
    },
    {
      title: 'Multi-AZ vs multi-región',
      certId: 'SAA-C03',
      domainId: 'resilient',
      tags: ['saa-c03', 'ha-dr'],
      pinned: false,
      daysAgo: 17,
      body: `# Disponibilidad y desastres

- **Multi-AZ:** sobrevive a la caída de una zona; RPO/RTO bajos y coste moderado.
- **Multi-región:** sobrevive a la caída de una región; más latencia, replicación y coste.

## Criterio
Primero multi-AZ; multi-región solo si el requisito de continuidad lo exige.`,
    },
    {
      title: 'Almacenamiento: EBS vs EFS vs S3 vs FSx',
      certId: 'SAA-C03',
      domainId: 'performance',
      tags: ['saa-c03', 'almacenamiento'],
      pinned: false,
      daysAgo: 15,
      body: `# Cómo elegir almacenamiento

- **EBS:** bloque, ligado a una instancia (salvo io2 Multi-Attach).
- **EFS:** ficheros compartidos, elástico, para contenedores y Linux.
- **S3:** objetos; no es un sistema de ficheros.
- **FSx:** sistemas de ficheros especializados (Windows, Lustre, NetApp, OpenZFS).

## Error típico
Responder EBS cuando varios contenedores necesitan el mismo fichero: es EFS.`,
    },
    {
      title: 'Optimización de costos: por dónde empezar',
      certId: 'SAA-C03',
      domainId: 'cost',
      tags: ['saa-c03', 'costos'],
      pinned: false,
      daysAgo: 12,
      body: `# Costos

- **Cost Explorer:** gasto y uso históricos, agrupables por servicio o etiqueta.
- **Budgets:** alertas cuando el gasto se desvía.
- **Compute Optimizer / Trusted Advisor:** recomendaciones de tamaño y de recursos ociosos.

## Nota
En el simulacro este es el dominio con menor acierto: priorizar repaso.`,
    },
    {
      title: 'Simulacro 02: errores del bloque de red',
      certId: 'SAA-C03',
      domainId: 'resilient',
      tags: ['saa-c03', 'simulacro', 'errores'],
      pinned: true,
      daysAgo: 7,
      body: `# Errores del simulacro

- Confundí la **tabla de rutas** con el **route table** del VPC y el peering: revisar propagación.
- No vi que el enunciado pedía tráfico **saliente** por NAT, no entrante.
- Me quedé en la opción "más barata" cuando pedían **latencia mínima**.

## Acción
Anotar cada error como tema con próxima revisión a 1 día.`,
    },
    {
      title: 'Plan de la semana: simulacro y repaso dirigido',
      certId: 'SAA-C03',
      domainId: null,
      tags: ['plan', 'saa-c03'],
      pinned: false,
      daysAgo: 3,
      body: `# Semana actual

- Un simulacro completo cronometrado (objetivo ≥ 85 %).
- Repasar los dominios con menor acierto: costos y rendimiento.
- Revisar la checklist de la certificación y confirmar voucher.

## Siguiente
Si el simulacro supera 85 %, agendar el examen para dentro de 3 semanas.`,
    },
    {
      title: 'Dudas para investigar',
      certId: null,
      domainId: null,
      tags: ['dudas'],
      pinned: false,
      daysAgo: 1,
      body: `# Dudas abiertas

- [ ] ¿Diferencia exacta entre S3 Standard-IA y One Zone-IA en durabilidad?
- [ ] ¿Cómo se comporta un ALB con cross-zone balancing desactivado?
- [ ] ¿Qué límites tiene VPC peering frente a Transit Gateway?

## Regla
Cada duda resuelta se convierte en nota con su dominio y etiqueta.`,
    },
  ];

  return specs.map(
    (spec, index): Note => ({
      id: `demo-note-${index + 1}`,
      certId: spec.certId,
      domainId: spec.domainId,
      topicId: null,
      title: spec.title,
      bodyMd: spec.body,
      tags: spec.tags,
      pinned: spec.pinned,
      source: 'manual',
      createdAt: localIsoAt(dateFrom(now, spec.daysAgo), '19:00'),
      updatedAt: localIsoAt(dateFrom(now, Math.max(0, spec.daysAgo - 2)), '20:30'),
    }),
  );
}

function buildDemoFlashcards(now: Date): Flashcard[] {
  const specs: {
    certId: string;
    domainId: string;
    front: string;
    back: string;
    ease: number;
    intervalDays: number;
    dueInDays: number;
    reps: number;
    lapses: number;
  }[] = [
    {
      certId: 'CLF-C02',
      domainId: 'billing',
      front: '¿En qué se diferencian el precio bajo demanda y los Savings Plans?',
      back: 'Bajo demanda no tiene compromiso; los Savings Plans piden compromiso de uso (1 o 3 años) a cambio de descuento.',
      ease: 2.5,
      intervalDays: 6,
      dueInDays: 2,
      reps: 3,
      lapses: 0,
    },
    {
      certId: 'CLF-C02',
      domainId: 'security',
      front: '¿Quién parchea el sistema operativo de una instancia EC2?',
      back: 'El cliente: EC2 es IaaS. AWS se encarga de la seguridad de la infraestructura subyacente.',
      ease: 2.6,
      intervalDays: 10,
      dueInDays: 5,
      reps: 4,
      lapses: 1,
    },
    {
      certId: 'CLF-C02',
      domainId: 'cloud',
      front: '¿Cuántos pilares tiene AWS Well-Architected?',
      back: 'Seis: excelencia operativa, seguridad, confiabilidad, eficiencia del rendimiento, optimización de costos y sostenibilidad.',
      ease: 2.3,
      intervalDays: 3,
      dueInDays: -1,
      reps: 2,
      lapses: 1,
    },
    {
      certId: 'CLF-C02',
      domainId: 'technology',
      front: 'CloudWatch o CloudTrail: ¿cuál registra las llamadas a la API?',
      back: 'CloudTrail. CloudWatch recoge métricas, logs y alarmas; CloudTrail audita la actividad de la API.',
      ease: 2.4,
      intervalDays: 4,
      dueInDays: 1,
      reps: 2,
      lapses: 0,
    },
    {
      certId: 'SAA-C03',
      domainId: 'secure',
      front: '¿Cuándo usar un rol IAM en lugar de un usuario IAM?',
      back: 'Cuando el consumidor es un servicio o una carga de trabajo: evita credenciales de larga duración.',
      ease: 2.5,
      intervalDays: 2,
      dueInDays: 0,
      reps: 1,
      lapses: 0,
    },
    {
      certId: 'SAA-C03',
      domainId: 'resilient',
      front: '¿Qué diferencia Multi-AZ de multi-región?',
      back: 'Multi-AZ sobrevive a la caída de una zona; multi-región sobrevive a la caída de una región completa, con más latencia y coste.',
      ease: 2.2,
      intervalDays: 1,
      dueInDays: -2,
      reps: 2,
      lapses: 2,
    },
    {
      certId: 'SAA-C03',
      domainId: 'performance',
      front: '¿EFS o EBS para varios contenedores que comparten ficheros?',
      back: 'EFS: ficheros elásticos y compartidos. EBS va asociado a una instancia (salvo io2 Multi-Attach).',
      ease: 2.5,
      intervalDays: 3,
      dueInDays: 3,
      reps: 1,
      lapses: 0,
    },
    {
      certId: 'SAA-C03',
      domainId: 'cost',
      front: '¿Qué mide el Cost Explorer?',
      back: 'El gasto y el uso históricos, agrupables por servicio, cuenta o etiqueta.',
      ease: 2.7,
      intervalDays: 8,
      dueInDays: 6,
      reps: 3,
      lapses: 0,
    },
  ];

  return specs.map(
    (spec, index): Flashcard => ({
      id: `demo-card-${index + 1}`,
      certId: spec.certId,
      domainId: spec.domainId,
      front: spec.front,
      back: spec.back,
      ease: spec.ease,
      intervalDays: spec.intervalDays,
      dueDate: addDays(localDate(now), spec.dueInDays),
      reps: spec.reps,
      lapses: spec.lapses,
      createdAt: localIsoAt(dateFrom(now, 30 - index), '19:00'),
    }),
  );
}

function buildDemoTopics(now: Date): Topic[] {
  const today = localDate(now);
  const specs: {
    certId: string;
    domainId: string;
    title: string;
    status: Topic['status'];
    priority: Topic['priority'];
    confidence: Topic['confidence'];
    ease: number;
    intervalDays: number;
    nextReviewAt: string | null;
    lastStudiedAt: string | null;
    reviewCount: number;
    descriptionMd: string;
  }[] = [
    {
      certId: 'SAA-C03',
      domainId: 'secure',
      title: 'IAM — políticas, condiciones y roles',
      status: 'estudiando',
      priority: 1,
      confidence: 3,
      ease: 2.4,
      intervalDays: 3,
      nextReviewAt: localIsoAt(addDays(today, 2), '19:00'),
      lastStudiedAt: localIsoAt(addDays(today, -1), '19:00'),
      reviewCount: 2,
      descriptionMd: 'Políticas basadas en identidad vs en recursos; condiciones y `Principal`.',
    },
    {
      certId: 'SAA-C03',
      domainId: 'resilient',
      title: 'Alta disponibilidad y recuperación ante desastres',
      status: 'repasando',
      priority: 1,
      confidence: 2,
      ease: 2.1,
      intervalDays: 1,
      nextReviewAt: localIsoAt(addDays(today, -1), '19:00'),
      lastStudiedAt: localIsoAt(addDays(today, -3), '19:00'),
      reviewCount: 2,
      descriptionMd: 'Multi-AZ, Route 53 failover, RPO/RTO y copias de seguridad.',
    },
    {
      certId: 'SAA-C03',
      domainId: 'cost',
      title: 'Optimización de costos — Storage Lens y Compute Optimizer',
      status: 'pendiente',
      priority: 2,
      confidence: null,
      ease: 2.5,
      intervalDays: 1,
      nextReviewAt: null,
      lastStudiedAt: null,
      reviewCount: 0,
      descriptionMd: 'Herramientas de visibilidad de costo y recomendaciones de tamaño.',
    },
    {
      certId: 'CLF-C02',
      domainId: 'billing',
      title: 'Facturación y herramientas de costos',
      status: 'dominado',
      priority: 3,
      confidence: 5,
      ease: 2.8,
      intervalDays: 30,
      nextReviewAt: localIsoAt(addDays(today, 18), '19:00'),
      lastStudiedAt: localIsoAt(addDays(today, -12), '19:00'),
      reviewCount: 4,
      descriptionMd: 'Consolidated billing, Cost Explorer, Budgets y soporte.',
    },
    {
      certId: 'SAA-C03',
      domainId: 'performance',
      title: 'Caché: ElastiCache y CloudFront',
      status: 'archivado',
      priority: 3,
      confidence: 4,
      ease: 2.6,
      intervalDays: 7,
      nextReviewAt: null,
      lastStudiedAt: localIsoAt(addDays(today, -20), '19:00'),
      reviewCount: 1,
      descriptionMd: 'Estrategias de caché en borde y en memoria; invalidaciones.',
    },
  ];

  return specs.map(
    (spec, index): Topic => ({
      id: `demo-topic-${index + 1}`,
      certId: spec.certId,
      domainId: spec.domainId,
      title: spec.title,
      descriptionMd: spec.descriptionMd,
      status: spec.status,
      priority: spec.priority,
      sourceResourceId: null,
      confidence: spec.confidence,
      ease: spec.ease,
      intervalDays: spec.intervalDays,
      nextReviewAt: spec.nextReviewAt,
      lastStudiedAt: spec.lastStudiedAt,
      reviewCount: spec.reviewCount,
      createdAt: localIsoAt(dateFrom(now, 40), '19:00'),
      updatedAt: localIsoAt(dateFrom(now, Math.max(0, 5 - index)), '20:00'),
    }),
  );
}

function buildDemoVouchers(now: Date): Voucher[] {
  return [
    {
      id: 'demo-voucher-1',
      label: 'AWS campaign · 50 % · CLF-C02',
      percent: 50,
      source: 'campana',
      expiresAt: addDays(localDate(now), 20),
      usedForAttemptId: 'demo-attempt-3',
      status: 'usado',
    },
    {
      id: 'demo-voucher-2',
      label: 'CLF-C02 · 50 %',
      percent: 50,
      source: 'aprobacion',
      expiresAt: addDays(localDate(now), 12),
      usedForAttemptId: null,
      status: 'disponible',
    },
  ];
}

function buildDemoBudget(now: Date): BudgetItem[] {
  return [
    {
      id: 'demo-budget-1',
      concept: 'Examen CLF-C02 (con voucher del 50 %)',
      certId: 'CLF-C02',
      kind: 'examen',
      amountUsd: 50,
      status: 'pagado',
      date: dateFrom(now, 32),
      voucherId: 'demo-voucher-1',
      note: '100 USD menos el 50 % del voucher de campaña.',
    },
    {
      id: 'demo-budget-2',
      concept: 'Examen SAA-C03',
      certId: 'SAA-C03',
      kind: 'examen',
      amountUsd: 150,
      status: 'planeado',
      date: null,
      voucherId: 'demo-voucher-2',
      note: 'Se aplicará el voucher de aprobación si sigue vigente.',
    },
    {
      id: 'demo-budget-3',
      concept: 'Suscripción AWS Skill Builder (mensual)',
      certId: null,
      kind: 'suscripcion',
      amountUsd: 29,
      status: 'planeado',
      date: null,
      voucherId: null,
      note: 'Solo si hace falta el simulacro completo oficial.',
    },
    {
      id: 'demo-budget-4',
      concept: 'Curso de terceros — SAA-C03',
      certId: 'SAA-C03',
      kind: 'curso',
      amountUsd: 15,
      status: 'pagado',
      date: dateFrom(now, 60),
      voucherId: null,
      note: 'Compra puntual en oferta.',
    },
    {
      id: 'demo-budget-5',
      concept: 'Examen AIF-C01',
      certId: 'AIF-C01',
      kind: 'examen',
      amountUsd: 100,
      status: 'planeado',
      date: null,
      voucherId: null,
      note: 'Segundo paso de la ruta tras CLF-C02.',
    },
    {
      id: 'demo-budget-6',
      concept: 'Labs dentro del AWS Free Tier',
      certId: null,
      kind: 'lab',
      amountUsd: 0,
      status: 'pagado',
      date: dateFrom(now, 90),
      voucherId: null,
      note: 'Sin costo; con presupuesto y alarma de gasto configurados.',
    },
  ];
}

/* =============================================================================
   10. Siembra de demostración
   ========================================================================== */

/** Datos de ejemplo ricos: ruta cargada + historia realista. No borra ni duplica. */
export async function loadDemoData(db: MiPlanDb, now: Date): Promise<void> {
  await ensureCatalog(db);
  await loadRecommendedRoute(db, now);

  const settings = await db.settings.get('app');
  if (!settings) await db.settings.put(defaultSettings(now));

  const sessions = buildDemoSessions(now);
  const attempts = buildDemoAttempts(now);
  const flashcards = buildDemoFlashcards(now);
  const notes = buildDemoNotes(now);
  const topics = buildDemoTopics(now);
  const vouchers = buildDemoVouchers(now);
  const budgetItems = buildDemoBudget(now);
  const questions = buildDemoQuestions(now);

  // Horas realizadas por certificación, derivadas de las sesiones (§5).
  const minutesByCert = new Map<string, number>();
  for (const session of sessions) {
    minutesByCert.set(session.certId, (minutesByCert.get(session.certId) ?? 0) + session.minutes);
  }
  const hoursDone = (certId: string): number => {
    const minutes = minutesByCert.get(certId) ?? 0;
    return Math.round((minutes / 60) * 10) / 10;
  };

  const planItems = await db.planItems.toArray();
  const updatedPlanItems = planItems.map((item): PlanItem => {
    const status: PlanItem['status'] =
      item.certId === 'CLF-C02' ? 'aprobado' : item.certId === 'SAA-C03' ? 'estudiando' : item.status;
    const targetDate =
      item.certId === 'SAA-C03' ? (item.targetDate ?? addDays(localDate(now), 45)) : item.targetDate;
    return {
      ...item,
      status,
      targetDate,
      hoursDone: hoursDone(item.certId),
      updatedAt: now.toISOString(),
    };
  });

  // Recursos: CLF-C02 completado; SAA-C03 en progreso.
  const storedResources = await db.resources.toArray();
  const updatedResources = storedResources
    .map((resource): Resource | null => {
      if (!resource.isFree) return null;
      if (resource.certId === 'CLF-C02') return { ...resource, status: 'completado' };
      if (resource.certId !== 'SAA-C03') return null;
      if (resource.id === 'res-SAA-C03-lab') return { ...resource, status: 'en_curso' };
      if (resource.type === 'doc' || resource.type === 'practice_questions') {
        return { ...resource, status: 'completado' };
      }
      return null;
    })
    .filter((resource): resource is Resource => resource !== null);

  // CLF-C02 está aprobada: su checklist de preparación queda hecho.
  const storedChecklist = await db.checklistItems.where('certId').equals('CLF-C02').toArray();
  const updatedChecklist = storedChecklist.map(
    (item): ChecklistItem => ({
      ...item,
      done: true,
      doneAt: localIsoAt(dateFrom(now, 32), '16:00'),
    }),
  );

  await db.transaction(
    'rw',
    [
      db.planItems,
      db.resources,
      db.studySessions,
      db.attempts,
      db.flashcards,
      db.vouchers,
      db.budgetItems,
      db.topics,
      db.notes,
      db.checklistItems,
      db.questions,
    ],
    async () => {
      await db.planItems.bulkPut(updatedPlanItems);
      if (updatedResources.length > 0) await db.resources.bulkPut(updatedResources);
      if (updatedChecklist.length > 0) await db.checklistItems.bulkPut(updatedChecklist);
      await db.studySessions.bulkPut(sessions);
      await db.attempts.bulkPut(attempts);
      await db.flashcards.bulkPut(flashcards);
      await db.vouchers.bulkPut(vouchers);
      await db.budgetItems.bulkPut(budgetItems);
      await db.topics.bulkPut(topics);
      await db.notes.bulkPut(notes);
      await db.questions.bulkPut(questions);
    },
  );
}

/**
 * Banco de preguntas de ejemplo (F3.2). Son preguntas **propias**, escritas a partir
 * de la documentación pública: nunca preguntas reales de examen (§13).
 */
function buildDemoQuestions(now: Date): Question[] {
  const stamp = now.toISOString();
  const base = { certId: 'SAA-C03', source: 'Propio (repaso oficial)', tags: ['demo'], createdAt: stamp };
  return [
    {
      ...base,
      id: 'q-demo-01',
      domainId: 'secure',
      prompt: '¿Qué servicio administra claves con rotación automática y auditoría nativa?',
      options: ['AWS KMS', 'AWS Secrets Manager', 'AWS CloudHSM', 'AWS IAM'],
      correctIndex: 0,
      explanation: 'KMS gestiona claves y su rotación; Secrets Manager rota secretos, no claves de cifrado.',
    },
    {
      ...base,
      id: 'q-demo-02',
      domainId: 'secure',
      prompt: '¿Qué diferencia a un security group de una network ACL?',
      options: [
        'El security group es stateful y la NACL stateless',
        'Ambos son stateless',
        'La NACL solo aplica a subredes públicas',
        'El security group se aplica a nivel de VPC',
      ],
      correctIndex: 0,
      explanation:
        'El security group recuerda el estado de la conexión; la NACL no y necesita reglas de entrada y salida.',
    },
    {
      ...base,
      id: 'q-demo-03',
      domainId: 'resilient',
      prompt: '¿Qué opción protege una base de datos relacional frente a la caída de una zona de disponibilidad?',
      options: [
        'Despliegue Multi-AZ con réplica síncrona',
        'Snapshot manual diario',
        'Instancia única con más IOPS',
        'Lectura desde una réplica asíncrona',
      ],
      correctIndex: 0,
      explanation: 'Multi-AZ mantiene una réplica síncrona en otra AZ y conmuta automáticamente.',
    },
    {
      ...base,
      id: 'q-demo-04',
      domainId: 'performance',
      prompt: '¿Qué endpoint de VPC no requiere una interfaz de red elástica?',
      options: [
        'El endpoint de gateway para S3',
        'El endpoint de interfaz',
        'El endpoint de Gateway Load Balancer',
        'El endpoint de PrivateLink para DynamoDB',
      ],
      correctIndex: 0,
      explanation: 'Los endpoints de gateway se asocian a la tabla de rutas; los de interfaz crean ENI.',
    },
    {
      ...base,
      id: 'q-demo-05',
      domainId: 'cost',
      prompt: '¿Qué clase de S3 conviene para archivos con acceso impredecible?',
      options: ['S3 Intelligent-Tiering', 'S3 Standard', 'S3 Glacier Deep Archive', 'S3 One Zone-IA'],
      correctIndex: 0,
      explanation: 'Intelligent-Tiering mueve los objetos entre niveles según el patrón de acceso.',
    },
    {
      ...base,
      id: 'q-demo-06',
      domainId: 'resilient',
      prompt: '¿Para qué sirve una cola SQS entre dos servicios?',
      options: [
        'Desacoplar productor y consumidor ante picos',
        'Cifrar el tráfico en tránsito',
        'Sustituir a un balanceador',
        'Almacenar objetos grandes',
      ],
      correctIndex: 0,
      explanation: 'La cola absorbe picos y permite reintentos sin acoplar los servicios.',
    },
  ];
}
