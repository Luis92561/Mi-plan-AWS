# Plantillas Markdown para Obsidian (Anexo C)

Estas plantillas son el **contrato de salida** de la app: `src/domain/obsidian.ts` las
produce exactamente con esta forma. Si algo no aplica al perfil elegido, se omite la
sección completa (no se deja vacía).

## 1. Estructura del vault

```
AWS/
├── _Ruta AWS.md
├── _Checklist.md
├── _Calendario.md
└── SAA-C03 — Solutions Architect Associate/
    ├── SAA-C03 — Resumen.md
    ├── SAA-C03 — Checklist.md
    ├── Dominios/
    │   └── 01 — Design Secure Architectures.md
    ├── Temas/
    │   └── S3 — Clases de almacenamiento.md
    ├── Sesiones/
    │   └── 2026/
    │       └── 2026-10-18.md
    └── Simulacros/
        └── 2026-10-12 — Mock 02.md
```

Reglas de nombres: separador `—` (em dash) con espacios, dominios numerados `01 —`, sin
`/ \ : * ? " < > |`, máximo 100 caracteres, NFC, orden estable (fase → `order` → `code`).
Cada nota lleva `aliases` para que los wikilinks cortos resuelvan.

## 2. Frontmatter estándar de certificación

```yaml
---
title: "SAA-C03 — Solutions Architect Associate"
aliases: ["SAA-C03", "Solutions Architect Associate"]
type: aws-certification
code: SAA-C03
level: associate
phase: 2
status: estudiando
readiness: 62
price_usd: 150
passing_score: 720
exam_date: 2026-12-05
domains:
  - "Design Secure Architectures"
  - "Design Resilient Architectures"
  - "Design High-Performing Architectures"
  - "Design Cost-Optimized Architectures"
tags:
  - aws
  - aws/associate
  - cert/SAA-C03
lang: es
updated: 2026-10-18T18:32:00-05:00
source: "Mi Plan AWS"
schema: 1
---
```

`status` usa los valores canónicos del modelo (`no_iniciado`, `estudiando`, `listo`,
`agendado`, `aprobado`, `reprobado`, `saltado`). `updated` es el **único** campo que
puede variar entre dos exportaciones del mismo estado. `lang` indica el idioma de los
encabezados; `type`, `status`, `level`, `code` y los nombres de dominio se quedan siempre
en inglés canónico. La estructura del vault no cambia entre idiomas.

## 3. Nota de certificación (`SAA-C03 — Resumen.md`)

```md
# SAA-C03 — Solutions Architect Associate

> [!info] Datos del examen
> - **Nivel:** Associate · **Fase:** 2
> - **Precio:** 150 USD · **Duración:** 130 min · **Preguntas:** 65 · **Aprueba:** 720
> - **Guía oficial:** https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html
> - **Estado:** estudiando · **Readiness:** 62 %

## Dominios

| Dominio | Peso | Práctica | Estado |
|---|---:|---:|:--:|
| [[01 — Design Secure Architectures]] | 30 % | 74 % | ◐ |
| [[02 — Design Resilient Architectures]] | 26 % | 61 % | ◐ |
| [[03 — Design High-Performing Architectures]] | 24 % | — | ○ |
| [[04 — Design Cost-Optimized Architectures]] | 20 % | — | ○ |

## Checklist

> [!todo] Preparación
> - [x] Leer la guía oficial
> - [x] Curso Exam Prep (Skill Builder)
> - [ ] 2 labs prácticos
> - [ ] Set oficial de 20 preguntas ≥ 80 %
> - [ ] Simulacro completo ≥ 75 %
> - [ ] Agendar examen

## Temas

- [[S3 — Clases de almacenamiento]] · repaso 2026-10-21
- [[VPC — Endpoints]] · pendiente

## Simulacros

| Fecha | Fuente | Aciertos | Estimado | Estado |
|---|---|---:|---:|:--:|
| 2026-10-12 | Mock propio | 46/65 | 737 | ✓ |

## Notas

![[2026-10-18]]
```

## 4. Nota de dominio (`01 — Design Secure Architectures.md`)

Frontmatter: `type: aws-domain`, `cert`, `weight`, `accuracy`, `status`, `tags`,
`updated`, `source`.

```md
# 01 — Design Secure Architectures

[[SAA-C03 — Resumen]] · peso **30 %** · práctica **74 %** · estado ◐

## Qué entra
- IAM, KMS, cifrado en reposo y en tránsito
- Límites de seguridad por VPC y perímetro

## Temas
- [[IAM — Políticas vs. roles]]
- [[KMS — Envelope encryption]]

## Errores que cometí
- Confundir *security group* con *NACL* en el simulacro del 12-oct.

## Pendientes
- [ ] Repasar *bucket policies* con condición `aws:SourceVpce`
```

## 5. Nota de tema (`S3 — Clases de almacenamiento.md`)

Frontmatter: `type: aws-topic`, `cert`, `domain`, `status`, `confidence`,
`interval_days`, `next_review`, `tags`, `updated`, `source`.

```md
# S3 — Clases de almacenamiento

[[SAA-C03 — Resumen]] · [[02 — Design Resilient Architectures]]

## Qué debo saber
| Clase | Uso | Recuperación |
|---|---|---|
| Standard | acceso frecuente | inmediata |
| Standard-IA | acceso infrecuente | inmediata |
| Glacier Instant Retrieval | archivo con acceso | ms |
| Glacier Deep Archive | archivo largo plazo | 12 h |

## Regla mental
> [!tip] Elige por frecuencia **y** por costo de recuperación, no solo por precio por GB.

## Dudas abiertas
- [ ] ¿Cuándo conviene *Intelligent-Tiering* frente a una lifecycle rule?
```

## 6. Nota de sesión (`Sesiones/2026/2026-10-18.md`)

Frontmatter: `type: aws-session`, `date`, `cert`, `minutes`, `kind`, `confidence`, `tags`,
`source`.

```md
# 2026-10-18

**45 min** · SAA-C03 · laboratorio · confianza 4/5

## Qué hice
- VPC con subredes públicas/privadas y endpoint de S3
- Rompí la ruta de la NAT y la diagnostiqué con `reachability analyzer`

## Qué aprendí
Los endpoints de gateway no necesitan ENI; los de interfaz sí.

## Siguiente
- [[VPC — Endpoints]] → repaso 2026-10-21
```

## 7. Nota de simulacro (`2026-10-12 — Mock 02.md`)

Frontmatter: `type: aws-attempt`, `cert`, `date`, `kind`, `correct`, `total`,
`estimated_score`, `passing_score`, `passed`, `duration_min`, `tags`, `source`.

```md
# 2026-10-12 — Mock 02

| Métrica | Valor |
|---|---:|
| Aciertos | 46/65 |
| Puntaje estimado | **737** |
| Mínimo | 720 |
| Duración | 118 min |

## Por dominio
| Dominio | Aciertos | % |
|---|---:|---:|
| Design Secure Architectures | 15/20 | 75 % |
| Design Resilient Architectures | 12/17 | 71 % |
| Design High-Performing Architectures | 11/16 | 69 % |
| Design Cost-Optimized Architectures | 8/12 | 67 % |

## Errores a repasar
- [[VPC — Endpoints]]
- [[S3 — Clases de almacenamiento]]
```

## 8. `_Ruta AWS.md`

````md
---
type: aws-roadmap
tags: [aws, ruta]
updated: 2026-10-18T18:32:00-05:00
source: "Mi Plan AWS"
---

# Ruta AWS

| # | Certificación | Nivel | Estado | Readiness | Examen |
|--:|---|---|:--:|---:|---|
| 1 | [[CLF-C02 — Resumen\|CLF-C02]] | Foundational | ● | 91 % | 2026-02-14 |
| 3 | [[SAA-C03 — Resumen\|SAA-C03]] | Associate | ◐ | 62 % | 2026-12-05 |

## Fase 0 — gratis, antes de pagar
- [x] Cloud Quest: Cloud Practitioner
- [x] Set oficial de 20 preguntas
- [ ] 2 labs con sandbox

## Lectura opcional
> [!note]- Si usas Dataview
> ```dataview
> TABLE level AS Nivel, status AS Estado, readiness AS "%", exam_date AS Examen
> FROM "AWS"
> WHERE type = "aws-certification"
> SORT phase ASC, order ASC
> ```
````

El bloque Dataview va **dentro** de un callout colapsado y con fence de cuatro
backticks, para que el vault se vea bien sin el plugin y no se rompa al renderizar.

## 9. `_Checklist.md` y `_Calendario.md`

```md
# Checklist

## SAA-C03
> [!todo]
> - [ ] Set oficial de 20 preguntas ≥ 80 %
> - [ ] Simulacro completo ≥ 75 %
> - [ ] Agendar examen

## Recurrentes
> [!todo]
> - [ ] Simulacro semanal 📅 2026-10-20
```

```md
# Calendario

Próximas revisiones (exportadas también en `miplan-aws.ics`):

- 2026-10-21 · [[S3 — Clases de almacenamiento]]
- 2026-10-23 · [[VPC — Endpoints]]
- 2026-12-05 · **Examen SAA-C03**
```

Las fechas con `📅 YYYY-MM-DD` son compatibles con el plugin *Tasks*; sin el plugin
siguen siendo texto legible.

## 10. Cómo importarlo

1. Descarga `miplan-aws-vault-YYYY-MM-DD.zip`.
2. Descomprime dentro de tu vault, en la carpeta `AWS/` (créala si no existe).
3. Si ya tenías una exportación anterior: renombra la carpeta vieja a `AWS_old/` antes
   de descomprimir. **No fusiones a mano.**
4. Abre `_Ruta AWS.md` y verifica que los wikilinks estén en azul (no roscos).
5. Importa `miplan-aws.ics` una sola vez y repite la exportación cuando cambie el plan.

## 11. Garantías del exportador (verificadas en tests)

- UTF-8 sin BOM, saltos `\n`, rutas con `/`.
- Idempotencia: mismo estado ⇒ mismos archivos y mismo contenido, salvo `updated`.
- Integridad: todo `[[wikilink]]` apunta a un archivo incluido en el mismo export; si el
  perfil lo excluye, el enlace se degrada a texto plano.
- Cero HTML y cero estilos inline; el bloque Dataview solo al final y comentado.
