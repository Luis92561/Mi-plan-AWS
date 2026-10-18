import { describe, expect, it } from 'vitest';
import {
  CERTIFICATIONS,
  CHECKLIST_TEMPLATES,
  DEFAULT_EXPORT_PROFILES,
  OPTIONAL_CERTS,
  PHASE0_RESOURCES,
  RECOMMENDED_ROUTE,
  buildCertResources,
  buildChecklistForCert,
  buildPlanItems,
  buildStarterTopics,
  defaultSettings,
} from '@/data/seed';

const NOW = new Date('2026-10-18T17:00:00.000Z'); // 2026-10-18 12:00 en America/Bogota

describe('datos semilla — catálogo', () => {
  it('carga las 13 certificaciones del Anexo A en orden', () => {
    expect(CERTIFICATIONS).toHaveLength(13);
    expect(CERTIFICATIONS.map((cert) => cert.code)).toEqual([
      'CLF-C02',
      'AIF-C01',
      'SAA-C03',
      'DVA-C02',
      'SOA-C03',
      'DEA-C01',
      'MLA-C02',
      'SAP-C02',
      'DOP-C02',
      'AIP-C01',
      'SCS-C03',
      'ANS-C01',
      'AIB-C01',
    ]);
  });

  it('no repite códigos de certificación', () => {
    const codes = CERTIFICATIONS.map((cert) => cert.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('los pesos de dominio suman 1 en cada certificación (±0.001)', () => {
    for (const cert of CERTIFICATIONS) {
      const sum = cert.domains.reduce((total, domain) => total + domain.weight, 0);
      expect(sum, `suma de pesos de ${cert.code}`).toBeCloseTo(1, 3);
      expect(Math.abs(sum - 1), `desvío de ${cert.code}`).toBeLessThanOrEqual(0.001);
    }
  });

  it('todas las guías de examen apuntan a docs.aws.amazon.com', () => {
    for (const cert of CERTIFICATIONS) {
      expect(cert.examGuideUrl, `examGuideUrl de ${cert.code}`).toMatch(
        /^https:\/\/docs\.aws\.amazon\.com\//,
      );
      expect(cert.officialUrl, `officialUrl de ${cert.code}`).toMatch(
        /^https:\/\/aws\.amazon\.com\/certification\//,
      );
      expect(cert.verifiedOn).toBe('2026-10-18');
    }
  });

  it('refleja el ciclo de vida del Anexo A', () => {
    const sap = CERTIFICATIONS.find((cert) => cert.code === 'SAP-C02');
    const ans = CERTIFICATIONS.find((cert) => cert.code === 'ANS-C01');
    expect(sap?.lifecycle).toBe('retiring');
    expect(sap?.retirementDate).toBe('2026-11-16');
    expect(ans?.lifecycle).toBe('retiring');
    expect(ans?.retirementDate).toBe('2026-12-31');
    const others = CERTIFICATIONS.filter((cert) => cert.code !== 'SAP-C02' && cert.code !== 'ANS-C01');
    expect(others.every((cert) => cert.lifecycle === 'available')).toBe(true);
  });

  it('marca "verificar" sin inventar precio ni preguntas en AIB-C01', () => {
    const aib = CERTIFICATIONS.find((cert) => cert.code === 'AIB-C01');
    expect(aib?.priceUsd).toBeNull();
    expect(aib?.questions).toBe(0);
    expect(aib?.notes.toLowerCase()).toContain('verificar');
    expect(aib?.prerequisites).toEqual([]);
  });

  it('respeta los prerrequisitos de §A.3', () => {
    const byCode = new Map(CERTIFICATIONS.map((cert) => [cert.code, cert]));
    expect(byCode.get('CLF-C02')?.prerequisites).toEqual([]);
    expect(byCode.get('AIF-C01')?.prerequisites).toEqual([]);
    expect(byCode.get('SAA-C03')?.prerequisites).toEqual(['CLF-C02']);
    expect(byCode.get('MLA-C02')?.prerequisites).toEqual(['CLF-C02', 'SAA-C03']);
    expect(byCode.get('SAP-C02')?.prerequisites).toEqual(['SAA-C03']);
  });
});

describe('datos semilla — ruta y contenido', () => {
  it('la ruta recomendada tiene 12 exámenes y no incluye AIB-C01', () => {
    expect(RECOMMENDED_ROUTE).toHaveLength(12);
    expect(RECOMMENDED_ROUTE.map((item) => item.certId)).not.toContain('AIB-C01');
    expect(RECOMMENDED_ROUTE.map((item) => item.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    const catalog = new Set(CERTIFICATIONS.map((cert) => cert.code));
    for (const item of RECOMMENDED_ROUTE) expect(catalog.has(item.certId)).toBe(true);
  });

  it('las certificaciones opcionales son DEA-C01 y MLA-C02', () => {
    expect(OPTIONAL_CERTS).toEqual(['DEA-C01', 'MLA-C02']);
  });

  it('genera 12 planItems en estado no_iniciado con 40 h planeadas', () => {
    const items = buildPlanItems(NOW);
    expect(items).toHaveLength(12);
    expect(items.every((item) => item.status === 'no_iniciado')).toBe(true);
    expect(items.map((item) => item.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(items.map((item) => item.certId)).toEqual(RECOMMENDED_ROUTE.map((item) => item.certId));
    expect(items.every((item) => item.hoursPlanned === 40)).toBe(true);
    expect(new Set(items.map((item) => item.id)).size).toBe(12);
  });

  it('respeta las horas planeadas por certificación cuando se pasan', () => {
    const items = buildPlanItems(NOW, { 'SAA-C03': 80 });
    expect(items.find((item) => item.certId === 'SAA-C03')?.hoursPlanned).toBe(80);
    expect(items.find((item) => item.certId === 'CLF-C02')?.hoursPlanned).toBe(40);
  });

  it('siembra la plantilla de checklist con el tamaño por nivel', () => {
    expect(Object.keys(CHECKLIST_TEMPLATES).sort()).toEqual(
      ['associate', 'business', 'foundational', 'professional', 'specialty'].sort(),
    );
    expect(CHECKLIST_TEMPLATES.foundational).toHaveLength(6);
    expect(CHECKLIST_TEMPLATES.associate).toHaveLength(8);
    expect(CHECKLIST_TEMPLATES.professional).toHaveLength(10);
    expect(CHECKLIST_TEMPLATES.specialty).toHaveLength(10);
    expect(CHECKLIST_TEMPLATES.business).toHaveLength(8);

    for (const cert of CERTIFICATIONS) {
      const items = buildChecklistForCert(cert, NOW);
      expect(items).toHaveLength(CHECKLIST_TEMPLATES[cert.level].length);
      expect(items.map((item) => item.order)).toEqual(
        items.map((_item, index) => index + 1),
      );
      expect(items.every((item) => item.done === false && item.doneAt === null)).toBe(true);
      expect(items.every((item) => item.certId === cert.id)).toBe(true);
      expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
      for (const item of items) {
        expect(['preparacion', 'practica', 'examen', 'personal']).toContain(item.groupId);
        expect(item.templateKey).not.toBeNull();
        expect(item.recurrence).toBe('ninguna');
      }
    }
  });

  it('crea un tema base por dominio', () => {
    for (const cert of CERTIFICATIONS) {
      const topics = buildStarterTopics(cert, NOW);
      expect(topics).toHaveLength(cert.domains.length);
      expect(topics.map((topic) => topic.domainId)).toEqual(cert.domains.map((domain) => domain.id));
      for (const [index, topic] of topics.entries()) {
        expect(topic.title).toBe(`Repaso general — ${cert.domains[index].name}`);
        expect(topic.status).toBe('pendiente');
        expect(topic.priority).toBe(2);
        expect(topic.ease).toBe(2.5);
        expect(topic.intervalDays).toBe(1);
        expect(topic.nextReviewAt).toBeNull();
        expect(topic.reviewCount).toBe(0);
        expect(topic.confidence).toBeNull();
      }
    }
  });

  it('genera los recursos de catálogo de §A.4 (4 gratis + 2 pagos descartados)', () => {
    const resources = buildCertResources(CERTIFICATIONS);
    expect(resources).toHaveLength(CERTIFICATIONS.length * 6);
    expect(new Set(resources.map((resource) => resource.id)).size).toBe(resources.length);

    for (const cert of CERTIFICATIONS) {
      const own = resources.filter((resource) => resource.certId === cert.id);
      expect(own).toHaveLength(6);
      const free = own.filter((resource) => resource.isFree);
      expect(free).toHaveLength(4);
      expect(free.every((resource) => resource.costUsd === 0)).toBe(true);
      expect(free.map((resource) => resource.type).sort()).toEqual(
        ['curso', 'doc', 'lab', 'practice_questions'].sort(),
      );
      expect(free.find((resource) => resource.type === 'doc')?.url).toBe(cert.examGuideUrl);
      const paid = own.filter((resource) => !resource.isFree);
      expect(paid).toHaveLength(2);
      expect(paid.every((resource) => resource.status === 'descartado')).toBe(true);
    }
  });

  it('la fase 0 son 5 recursos gratuitos sin certificación', () => {
    expect(PHASE0_RESOURCES).toHaveLength(5);
    for (const resource of PHASE0_RESOURCES) {
      expect(resource.certId).toBeNull();
      expect(resource.isFree).toBe(true);
      expect(resource.costUsd).toBe(0);
      expect(resource.url.startsWith('https://')).toBe(true);
    }
  });

  it('los ajustes por defecto cumplen §5', () => {
    const settings = defaultSettings(NOW);
    expect(settings.id).toBe('app');
    expect(settings.locale).toBe('es');
    expect(settings.theme).toBe('dark');
    expect(settings.weeklyHoursGoal).toBe(6);
    expect(settings.studyDays).toEqual([1, 2, 3, 4, 5, 6]);
    expect(settings.startDate).toBe('2026-10-18');
    expect(settings.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(settings.fontMode).toBe('terminal');
    expect(settings.fontScale).toBe(1);
    expect(settings.remindersEnabled).toBe(true);
    expect(settings.dailyReminderTime).toBe('19:00');
    expect(settings.quietHours).toEqual({ from: '22:00', to: '07:00' });
    expect(settings.maxRemindersPerDay).toBe(3);
    expect(settings.schemaVersion).toBe(1);
    expect(settings.passphraseEnabled).toBe(false);
    expect(settings.activeCertId).toBe('CLF-C02');
    expect(settings.defaultExportProfileId).toBe('perfil-obsidian');
  });

  it('el perfil de exportación por defecto es Obsidian con todo incluido', () => {
    expect(DEFAULT_EXPORT_PROFILES).toHaveLength(1);
    const profile = DEFAULT_EXPORT_PROFILES[0];
    expect(profile.id).toBe('perfil-obsidian');
    expect(profile.name).toBe('Obsidian');
    expect(profile.folder).toBe('AWS');
    expect(profile.includeFrontmatter).toBe(true);
    expect(profile.includeWikilinks).toBe(true);
    expect(profile.includeNotes).toBe(true);
    expect(profile.includeSessions).toBe(true);
    expect(profile.includeBudget).toBe(true);
    expect(profile.includeChecklist).toBe(true);
    expect(profile.dataviewBlocks).toBe(true);
    expect(profile.taskDates).toBe(true);
  });

  it('los ids de siembra son deterministas', () => {
    expect(buildPlanItems(NOW).map((item) => item.id)).toEqual(buildPlanItems(NOW).map((item) => item.id));
    const clf = CERTIFICATIONS[0];
    expect(buildChecklistForCert(clf, NOW).map((item) => item.id)).toEqual(
      buildChecklistForCert(clf, NOW).map((item) => item.id),
    );
    expect(buildChecklistForCert(clf, NOW, 'demo').map((item) => item.id)).not.toEqual(
      buildChecklistForCert(clf, NOW).map((item) => item.id),
    );
  });
});
