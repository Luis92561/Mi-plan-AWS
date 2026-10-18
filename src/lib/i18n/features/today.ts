import { defineNamespace } from '../define';

/**
 * Diccionario de la bandeja diaria (§7.9).
 * Namespace propio: nadie más escribe aquí. Las claves de acciones compartidas
 * (`action.study`, `action.snooze1`…) viven en `es/shared.ts` y se reutilizan.
 */
export const today = defineNamespace({
  ns: 'today',
  es: {
    'today.title': 'Hoy',
    'today.lead': 'Temas que vencen, checklist del día y avisos. En ese orden.',
    'today.count': '{count} pendientes',
    'today.count_one': '{count} pendiente',
    'today.count_other': '{count} pendientes',
    'today.logSession': 'Registrar sesión',

    'today.empty': 'Nada para hoy — adelanta el siguiente tema de {cert}',
    'today.emptyNoCert': 'Nada para hoy — adelanta el siguiente tema de tu ruta',
    'today.emptyBody': 'Sin temas vencidos ni checklist pendiente. Puedes adelantar trabajo o descansar.',
    'today.emptyCta': 'Adelantar un tema',

    'today.overdue': 'Vencido',

    'today.topics.title': 'Temas que vencen',
    'today.topics.hint': '{count} en cola',
    'today.topics.hint_one': '{count} en cola',
    'today.topics.hint_other': '{count} en cola',
    'today.topics.empty': 'Sin temas que repasar hoy.',
    'today.menu.label': 'Acciones de «{title}»',

    'today.study.checkbox': 'Marcar estudiado «{title}»',
    'today.study.title': 'Registrar estudio · {title}',
    'today.study.help': 'Al guardar se crea la sesión, el tema se reprograma y su recordatorio se cierra.',
    'today.study.minutes': 'Minutos estudiados',
    'today.study.note': 'Nota rápida',
    'today.study.noteHint': 'Qué te costó, qué no quieres olvidar.',
    'today.study.save': 'Guardar y reprogramar',
    'today.study.busy': 'Guardando…',
    'today.study.saved': 'Estudio guardado · {minutes} · próxima revisión {date}',

    'today.snooze.done_one': 'Pospuesto {count} día · {date}',
    'today.snooze.done_other': 'Pospuesto {count} días · {date}',
    'today.archive.done': 'Tema archivado: «{title}»',

    'today.checklist.title': 'Checklist pendiente',
    'today.checklist.hint_one': '{count} ítem',
    'today.checklist.hint_other': '{count} ítems',
    'today.checklist.empty': 'Checklist al día.',
    'today.checklist.checkbox': 'Marcar hecho «{title}»',
    'today.checklist.doneButton': 'Marcar hecho «{title}»',
    'today.checklist.due': 'Vence {date}',
    'today.checklist.noDate': 'Sin fecha',
    'today.checklist.completed': 'Hecho: «{title}»',
    'today.checklist.completedRecurring': 'Hecho: «{title}» · siguiente {date}',
    'today.checklist.more_one': 'Ver 1 ítem más',
    'today.checklist.more_other': 'Ver los {count} ítems restantes',
    'today.checklist.more': 'Ver los {count} ítems restantes',
    'today.checklist.less': 'Ver menos',
    'today.checklist.trimmed': 'Se muestran {shown} de {total}. Empieza por los primeros y vuelve cuando los cierres.',

    'today.alerts.title': 'Avisos',
    'today.alerts.hint': 'Máximo 3 · lo más urgente primero',
    'today.alerts.empty': 'Sin avisos por ahora.',
    'today.severity.info': 'Sugerencia',
    'today.severity.warn': 'Atención',
    'today.severity.error': 'Urgente',

    'today.error': 'No se pudo guardar: {message}',
  },
  en: {
    'today.title': 'Today',
    'today.lead': 'Due topics, today’s checklist and alerts. In that order.',
    'today.count': '{count} pending',
    'today.count_one': '{count} pending',
    'today.count_other': '{count} pending',
    'today.logSession': 'Log a session',

    'today.empty': 'Nothing due today — get ahead on the next {cert} topic',
    'today.emptyNoCert': 'Nothing due today — get ahead on the next topic of your route',
    'today.emptyBody': 'No overdue topics and no pending checklist. Get ahead or take the day off.',
    'today.emptyCta': 'Get ahead on a topic',

    'today.overdue': 'Overdue',

    'today.topics.title': 'Due topics',
    'today.topics.hint': '{count} queued',
    'today.topics.hint_one': '{count} queued',
    'today.topics.hint_other': '{count} queued',
    'today.topics.empty': 'No topics to review today.',
    'today.menu.label': 'Actions for “{title}”',

    'today.study.checkbox': 'Mark “{title}” as studied',
    'today.study.title': 'Log study · {title}',
    'today.study.help': 'Saving creates the session, reschedules the topic and closes its reminder.',
    'today.study.minutes': 'Minutes studied',
    'today.study.note': 'Quick note',
    'today.study.noteHint': 'What was hard, what you do not want to forget.',
    'today.study.save': 'Save and reschedule',
    'today.study.busy': 'Saving…',
    'today.study.saved': 'Study saved · {minutes} · next review {date}',

    'today.snooze.done_one': 'Snoozed {count} day · {date}',
    'today.snooze.done_other': 'Snoozed {count} days · {date}',
    'today.archive.done': 'Topic archived: “{title}”',

    'today.checklist.title': 'Pending checklist',
    'today.checklist.hint_one': '{count} item',
    'today.checklist.hint_other': '{count} items',
    'today.checklist.empty': 'Checklist up to date.',
    'today.checklist.checkbox': 'Mark “{title}” as done',
    'today.checklist.doneButton': 'Mark “{title}” as done',
    'today.checklist.due': 'Due {date}',
    'today.checklist.noDate': 'No date',
    'today.checklist.completed': 'Done: “{title}”',
    'today.checklist.completedRecurring': 'Done: “{title}” · next {date}',
    'today.checklist.more_one': 'Show 1 more item',
    'today.checklist.more_other': 'Show the remaining {count} items',
    'today.checklist.more': 'Show the remaining {count} items',
    'today.checklist.less': 'Show less',
    'today.checklist.trimmed': 'Showing {shown} of {total}. Start with the first ones and come back when they are done.',

    'today.alerts.title': 'Alerts',
    'today.alerts.hint': 'Three at most · most urgent first',
    'today.alerts.empty': 'No alerts right now.',
    'today.severity.info': 'Suggestion',
    'today.severity.warn': 'Heads up',
    'today.severity.error': 'Urgent',

    'today.error': 'Could not save: {message}',
  },
});
