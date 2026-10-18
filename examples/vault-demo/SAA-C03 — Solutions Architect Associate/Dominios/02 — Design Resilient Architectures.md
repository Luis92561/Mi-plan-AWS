---
title: "02 — Design Resilient Architectures"
aliases: ["Design Resilient Architectures"]
type: aws-domain
cert: SAA-C03
weight: 0.26
accuracy: 0.78
status: repasando
tags: [aws, cert/SAA-C03]
lang: es
updated: 2026-10-18T10:00:00-05:00
source: "Mi Plan AWS"
schema: 1
---

# 02 — Design Resilient Architectures

[[SAA-C03 — Resumen]] · Peso **26 %** · Práctica **78 %** · Estado ◐

## Temas

- [[Alta disponibilidad y recuperación ante desastres]] · ◐ repaso
- [[Repaso general — Design Resilient Architectures]] · ○ pendiente

## Sesiones

- [[2026-09-11]] · 90 min
- [[2026-09-19]] · 45 min
- [[2026-09-27]] · 75 min
- [[2026-10-05]] · 90 min
- [[2026-10-13]] · 45 min

## Notas

### Simulacro 02: errores del bloque de red

# Errores del simulacro

- Confundí la **tabla de rutas** con el **route table** del VPC y el peering: revisar propagación.
- No vi que el enunciado pedía tráfico **saliente** por NAT, no entrante.
- Me quedé en la opción "más barata" cuando pedían **latencia mínima**.

## Acción
Anotar cada error como tema con próxima revisión a 1 día.

### Multi-AZ vs multi-región

# Disponibilidad y desastres

- **Multi-AZ:** sobrevive a la caída de una zona; RPO/RTO bajos y coste moderado.
- **Multi-región:** sobrevive a la caída de una región; más latencia, replicación y coste.

## Criterio
Primero multi-AZ; multi-región solo si el requisito de continuidad lo exige.

> [!note]- Si usas Dataview
> ````dataview
> TABLE status AS Estado, confidence AS Confianza, next_review AS Próxima revisión
> FROM "AWS/SAA-C03 — Solutions Architect Associate/Temas"
> WHERE type = "aws-topic" AND domain = "Design Resilient Architectures"
> SORT priority ASC
> ````
