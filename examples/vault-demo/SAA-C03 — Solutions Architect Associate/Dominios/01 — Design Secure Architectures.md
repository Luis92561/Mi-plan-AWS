---
title: "01 — Design Secure Architectures"
aliases: ["Design Secure Architectures"]
type: aws-domain
cert: SAA-C03
weight: 0.3
accuracy: 0.83
status: estudiando
tags: [aws, cert/SAA-C03]
lang: es
updated: 2026-10-18T10:00:00-05:00
source: "Mi Plan AWS"
schema: 1
---

# 01 — Design Secure Architectures

[[SAA-C03 — Resumen]] · Peso **30 %** · Práctica **83 %** · Estado ✓

## Temas

- [[IAM — políticas, condiciones y roles]] · ◐ en curso
- Repaso general — Design Secure Architectures · ○ pendiente

## Sesiones

- [[2026-09-09]] · 60 min
- 2026-09-17 · 30 min
- 2026-09-25 · 25 min
- 2026-10-03 · 60 min
- 2026-10-11 · 30 min

## Notas

### IAM: rol vs usuario vs política en línea

# IAM

- **Usuario:** identidad con credenciales de larga duración. Evitarlo para cargas de trabajo.
- **Rol:** credenciales temporales asumidas por servicios o personas.
- **Política en línea:** adjunta a una sola identidad; no reutilizable.

## Regla
Si el consumidor es un servicio de AWS, la respuesta casi siempre es rol.

### KMS y cifrado en reposo

# KMS

- Claves administradas por AWS: sin coste adicional, rotación automática, sin política propia.
- Claves administradas por el cliente (CMK): política de claves propia y control de acceso granular.
- Cifrado en tránsito: TLS; en reposo: KMS o claves propias del servicio.

## Duda abierta
¿Cuándo conviene una CMK multi-región? Pendiente de revisar en la guía.

> [!note]- Si usas Dataview
> ````dataview
> TABLE status AS Estado, confidence AS Confianza, next_review AS Próxima revisión
> FROM "AWS/SAA-C03 — Solutions Architect Associate/Temas"
> WHERE type = "aws-topic" AND domain = "Design Secure Architectures"
> SORT priority ASC
> ````
