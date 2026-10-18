# Calendario

Próximas revisiones (exportadas también en `miplan-aws.ics`):

- 2026-10-18 · [[Alta disponibilidad y recuperación ante desastres]]
- 2026-10-21 · [[IAM — políticas, condiciones y roles]]
- 2026-11-06 · [[Facturación y herramientas de costos]]
- 2026-12-02 · **Examen SAA-C03**

> [!note]- Si usas Dataview
> ````dataview
> TABLE date AS Fecha, minutes AS "Duración", kind AS "Tipo"
> FROM "AWS"
> WHERE type = "aws-session"
> SORT date DESC
> ````
