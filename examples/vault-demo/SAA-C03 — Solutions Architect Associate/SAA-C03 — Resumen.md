---
title: "SAA-C03 — Solutions Architect Associate"
aliases: ["SAA-C03", "Solutions Architect Associate"]
type: aws-certification
code: SAA-C03
level: associate
phase: 2
status: estudiando
readiness: 80
price_usd: 150
passing_score: 720
exam_date: 2026-12-02
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
updated: 2026-10-18T10:00:00-05:00
source: "Mi Plan AWS"
schema: 1
---

# SAA-C03 — Solutions Architect Associate

> [!info] Datos del examen
> - **Nivel:** Associate · **Fase:** 2
> - **Precio:** 150 USD · **Duración:** 130 min · **Preguntas:** 65 · **Aprueba:** 720
> - **Guía oficial:** https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html
> - **Estado:** estudiando · **Readiness:** 80 %

## Dominios

| Dominio | Peso | Práctica | Estado |
|---|---:|---:|:--:|
| [[01 — Design Secure Architectures]] | 30 % | 83 % | ✓ |
| [[02 — Design Resilient Architectures]] | 26 % | 78 % | ◐ |
| [[03 — Design High-Performing Architectures]] | 24 % | 67 % | ◐ |
| [[04 — Design Cost-Optimized Architectures]] | 20 % | 57 % | ◐ |

## Checklist

> [!todo] Preparación
> - [ ] Leer la guía oficial del examen (dominios y pesos)
> - [ ] Completar el curso "Exam Prep" en AWS Skill Builder
> - [ ] Repasar los errores del simulacro y anotarlos

> [!todo] Práctica
> - [ ] Completar 2 labs prácticos (Builder Center / Workshops)
> - [ ] Set oficial de 20 preguntas con ≥ 80 % de acierto
> - [ ] Simulacro completo cronometrado

> [!todo] Examen
> - [ ] Confirmar voucher o descuento antes de pagar
> - [ ] Agendar el examen en Pearson VUE

## Temas

- [[Alta disponibilidad y recuperación ante desastres]] · repaso 2026-10-18
- [[IAM — políticas, condiciones y roles]] · repaso 2026-10-21
- [[Optimización de costos — Storage Lens y Compute Optimizer]] · pendiente
- [[Repaso general — Design Cost-Optimized Architectures]] · pendiente
- [[Repaso general — Design High-Performing Architectures]] · pendiente
- [[Repaso general — Design Resilient Architectures]] · pendiente
- [[Repaso general — Design Secure Architectures]] · pendiente

## Simulacros

| Fecha | Fuente | Aciertos | Estimado | Estado |
|---|---|---:|---:|:--:|
| 2026-10-16 | Simulacro completo (Skill Builder) | 48/65 | 765 | ✓ |
| 2026-10-11 | Simulacro completo (Skill Builder) | 46/65 | 737 | ✓ |
| 2026-10-04 | Oficial 20q (Skill Builder) | 15/20 | 775 | ✓ |

## Notas

### Simulacro 02: errores del bloque de red

# Errores del simulacro

- Confundí la **tabla de rutas** con el **route table** del VPC y el peering: revisar propagación.
- No vi que el enunciado pedía tráfico **saliente** por NAT, no entrante.
- Me quedé en la opción "más barata" cuando pedían **latencia mínima**.

## Acción
Anotar cada error como tema con próxima revisión a 1 día.

### IAM: rol vs usuario vs política en línea

# IAM

- **Usuario:** identidad con credenciales de larga duración. Evitarlo para cargas de trabajo.
- **Rol:** credenciales temporales asumidas por servicios o personas.
- **Política en línea:** adjunta a una sola identidad; no reutilizable.

## Regla
Si el consumidor es un servicio de AWS, la respuesta casi siempre es rol.

### Plan de la semana: simulacro y repaso dirigido

# Semana actual

- Un simulacro completo cronometrado (objetivo ≥ 85 %).
- Repasar los dominios con menor acierto: costos y rendimiento.
- Revisar la checklist de la certificación y confirmar voucher.

## Siguiente
Si el simulacro supera 85 %, agendar el examen para dentro de 3 semanas.

### Optimización de costos: por dónde empezar

# Costos

- **Cost Explorer:** gasto y uso históricos, agrupables por servicio o etiqueta.
- **Budgets:** alertas cuando el gasto se desvía.
- **Compute Optimizer / Trusted Advisor:** recomendaciones de tamaño y de recursos ociosos.

## Nota
En el simulacro este es el dominio con menor acierto: priorizar repaso.

### Almacenamiento: EBS vs EFS vs S3 vs FSx

# Cómo elegir almacenamiento

- **EBS:** bloque, ligado a una instancia (salvo io2 Multi-Attach).
- **EFS:** ficheros compartidos, elástico, para contenedores y Linux.
- **S3:** objetos; no es un sistema de ficheros.
- **FSx:** sistemas de ficheros especializados (Windows, Lustre, NetApp, OpenZFS).

## Error típico
Responder EBS cuando varios contenedores necesitan el mismo fichero: es EFS.

### Multi-AZ vs multi-región

# Disponibilidad y desastres

- **Multi-AZ:** sobrevive a la caída de una zona; RPO/RTO bajos y coste moderado.
- **Multi-región:** sobrevive a la caída de una región; más latencia, replicación y coste.

## Criterio
Primero multi-AZ; multi-región solo si el requisito de continuidad lo exige.

### KMS y cifrado en reposo

# KMS

- Claves administradas por AWS: sin coste adicional, rotación automática, sin política propia.
- Claves administradas por el cliente (CMK): política de claves propia y control de acceso granular.
- Cifrado en tránsito: TLS; en reposo: KMS o claves propias del servicio.

## Duda abierta
¿Cuándo conviene una CMK multi-región? Pendiente de revisar en la guía.

![[2026-10-17]]

![[2026-10-15]]

![[2026-10-13]]

> [!note]- Si usas Dataview
> ````dataview
> TABLE weight AS Peso, accuracy AS Práctica, status AS Estado
> FROM "AWS/SAA-C03 — Solutions Architect Associate/Dominios"
> WHERE type = "aws-domain"
> SORT weight DESC
> ````
