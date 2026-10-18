# Contenido: de dónde salió el dataset y cómo actualizarlo

Todo el contenido de certificaciones proviene de la **especificación del producto**
(§14 Anexo A: dataset con estado 18-oct-2026 y §15 Anexo B: fuentes oficiales) y está
codificado en [`src/data/seed.ts`](../src/data/seed.ts). No se inventó ningún dato:
donde el anexo dice *verificar*, el registro lo conserva como `null`/`0` con la palabra
`verificar` en `notes`.

## 1. Qué se siembra

| Export | Contenido |
|---|---|
| `CERTIFICATIONS` | 13 certificaciones: CLF-C02, AIF-C01, SAA-C03, DVA-C02, SOA-C03, DEA-C01, MLA-C02, SAP-C02, DOP-C02, AIP-C01, SCS-C03, ANS-C01, AIB-C01 |
| `RECOMMENDED_ROUTE` | 12 pasos (fases 1–4). AIB-C01 queda fuera y se añade a mano |
| `OPTIONAL_CERTS` | DEA-C01 y MLA-C02, marcadas como opcionales en la UI |
| `PHASE0_RESOURCES` | 5 recursos gratuitos de preparación (certId `null`) |
| `buildCertResources` | 4 recursos gratuitos + 2 pagos por certificación (78 registros) |
| `CHECKLIST_TEMPLATES` | 6 ítems (Foundational), 8 (Associate), 10 (Professional/Specialty), 8 (Business) |
| `buildStarterTopics` | Un tema base por dominio de cada certificación |
| `DEFAULT_EXPORT_PROFILES` | Perfil «Obsidian» con carpeta `AWS` y todo incluido |

Volumen verificado: **13 certificaciones · 83 recursos (78 + 5 de fase 0) · 12
planItems · 102 ítems de checklist en la ruta · 55 temas base** (110 y 59 si se añaden
las 13 al plan).

## 2. Campos del dataset y su fuente

| Campo | Fuente | Notas |
|---|---|---|
| `code`, `name`, `level`, `phase` | Anexo A.1 | Orden de la ruta §6.2 |
| `priceUsd` | Anexo A.1 | `null` cuando el anexo dice *verificar* |
| `durationMin`, `questions`, `passingScore` | Anexo A.1 | `scoredQuestions` queda `null` (no verificado) |
| `domains[].weight` | Anexo A.2 | Los pesos suman 1 (±0,001) en las 13 |
| `prerequisites` | Anexo A.3 | "A o B" se guarda como los dos códigos + nota |
| `recommendedExperience` | Anexo A.3 | Texto literal |
| `officialUrl` | Anexos A/B | `https://aws.amazon.com/certification/<slug>/` |
| `examGuideUrl` | Anexo B | Guía oficial de examen de cada certificación |
| `lifecycle`, `retirementDate` | Anexo A.1 (ciclo de vida) | SAP-C02 y ANS-C01 `retiring` |
| `verifiedOn` | Anexo A | `2026-10-18` |

## 3. Cómo actualizar el dataset

1. Abre la guía oficial vigente de la certificación en
   <https://docs.aws.amazon.com/aws-certification/latest/examguides/aws-certification-exam-guides.html>
   y el índice de certificaciones en <https://aws.amazon.com/certification/>.
2. Edita el objeto correspondiente en `CERTIFICATIONS` (precio, duración, preguntas,
   mínimo aprobatorio, dominios y pesos). Si los pesos cambian, verifica que sigan
   sumando 1.
3. Actualiza `verifiedOn` con la fecha en que lo comprobaste.
4. Si la certificación entra en retiro: `lifecycle: 'retiring'` + `retirementDate`. Si
   ya no existe: `lifecycle: 'retired'` (deja de recomendarse, sigue consultable).
5. Si aparece una certificación nueva (p. ej. SAP-C03, DVA-C03): añádela al array y
   decide si entra en `RECOMMENDED_ROUTE`.
6. Ejecuta `npm test` — `src/data/__tests__/seed.test.ts` valida códigos únicos, suma
   de pesos, 12 pasos de ruta y que todas las `examGuideUrl` apunten a
   `https://docs.aws.amazon.com/`.

> La app es local-first: los cambios en `seed.ts` **no** reescriben una base ya
> sembrada. Para verlos, borra los datos (Ajustes → Borrar todo) o edita la
> certificación desde su ficha (el catálogo es editable por diseño, §5).

## 4. Reglas de contenido (prohibiciones)

- **Nada de exam dumps** ni preguntas reales de examen. El banco de práctica está vacío
  a propósito: el modo simulacro trabaja con aciertos/total que declares tú.
- **No se traduce el contenido oficial**: nombres de certificación, dominios, servicios
  y códigos se quedan en inglés tal como los publica AWS. Solo se traduce la interfaz.
- **No se inventan URLs**: las de la fase 0 y las guías salen del Anexo B (más
  `https://aws.amazon.com/free/` para el Free Tier, que es la URL oficial canónica).

## 5. Banco de preguntas propio (F3.2)

La app **no** incluye ni distribuye preguntas de examen. El banco empieza vacío (los
datos de ejemplo traen 6 preguntas propias de repaso) y se llena con material tuyo o de
práctica pública. El simulacro real reparte las preguntas según los **pesos de dominio**
del examen.

**CSV** (`examples/preguntas-ejemplo.csv` es un archivo válido de muestra):

```
certId,domainId,prompt,optionA,optionB,optionC,optionD,correct,explanation,source
SAA-C03,secure,"¿Qué servicio administra claves con rotación automática?","AWS KMS","AWS Secrets Manager","AWS CloudHSM","IAM",A,"KMS rota claves; Secrets Manager rota secretos.","Propio"
```

- `correct` acepta letra (`A`–`F`) o número (`1`–`6`); las comillas dobles se escapan
  duplicándolas (`""`).
- `domainId` admite el id del dominio (`secure`) o su nombre
  (`Design Secure Architectures`); si no coincide, la pregunta entra sin dominio y la
  selección ponderada la usa como relleno.
- Columnas opcionales: `explanation`, `source`, `tags` (separadas por `;`).
- Si falta `certId` se usa la certificación seleccionada en la pantalla.

**JSON**: un array o `{ "questions": [...] }` con la misma información
(`prompt`, `options[]`, `correct`/`correctIndex`, `domainId`, `explanation`, `source`, `tags[]`).

Al importar se muestra un **preview** con las preguntas válidas y cada error por línea
(número de línea incluido); las preguntas repetidas (misma certificación + enunciado) se
descartan para que reimportar no duplique.

## 6. Fuentes oficiales de referencia

- Índice de guías de examen: <https://docs.aws.amazon.com/aws-certification/latest/examguides/aws-certification-exam-guides.html>
- Certificaciones: <https://aws.amazon.com/certification/>
- Preparación y práctica: <https://aws.amazon.com/certification/certification-prep/>
- AWS Skill Builder: <https://skillbuilder.aws/> · suscripción: <https://skillbuilder.aws/subscriptions>
- AWS Cloud Quest: <https://aws.amazon.com/training/digital/aws-cloud-quest/>
- AWS Educate: <https://aws.amazon.com/education/awseducate/>
- AWS Workshops: <https://workshops.aws/>
