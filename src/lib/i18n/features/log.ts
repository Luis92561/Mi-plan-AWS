import { defineNamespace } from '../define';

/**
 * Bitácora de estudio (§7.4) — namespace propio de la feature `studylog`.
 * Todo el texto visible de la pantalla `/bitacora` vive aquí.
 */
export const log = defineNamespace({
  ns: 'log',
  es: {
    'log.title': 'Bitácora',
    'log.subtitle': 'Cada sesión suma minutos, mantiene la racha y alimenta la readiness.',

    'log.action.log': 'Registrar sesión',
    'log.action.logHint': 'Abre el formulario rápido de cuatro campos',

    'log.kpi.week': 'Horas esta semana',
    'log.kpi.weekGoal': 'meta {goal}',
    'log.kpi.streak': 'Racha',
    'log.kpi.streakValue': '{n} días',
    'log.kpi.streakValue_one': '{n} día',
    'log.kpi.streakValue_other': '{n} días',
    'log.kpi.sessions': 'Sesiones',
    'log.kpi.total': 'Tiempo registrado',
    'log.kpi.streakHint': 'días de estudio seguidos',

    'log.heatmap.title': 'Constancia',
    'log.heatmap.label': 'Mapa de calor de sesiones de los últimos {days} días',
    'log.heatmap.cell': '{date}: {minutes} min',
    'log.heatmap.less': 'menos',
    'log.heatmap.more': 'más',
    'log.heatmap.none': 'Todavía sin sesiones en este periodo.',
    'log.heatmap.summary': '{minutes} en {days} días con sesiones',

    'log.filters.cert': 'Certificación',
    'log.filters.certAll': 'Todas las certificaciones',
    'log.filters.type': 'Tipo',
    'log.filters.typeAll': 'Todos los tipos',
    'log.filters.range': 'Periodo',
    'log.filters.clear': 'Limpiar filtros',

    'log.range.7': 'Últimos 7 días',
    'log.range.30': 'Últimos 30 días',
    'log.range.90': 'Últimos 90 días',
    'log.range.all': 'Todo el historial',

    'log.list.title': 'Sesiones',
    'log.list.hint': 'más recientes primero',
    'log.day.count': '{count} sesiones',
    'log.day.count_one': '{count} sesión',
    'log.day.count_other': '{count} sesiones',
    'log.day.total': 'Total del día: {hours}',

    'log.row.confidence': 'Confianza {n}/5',
    'log.row.notes': 'Nota',
    'log.row.menu': 'Acciones de la sesión del {date}',
    'log.row.edit': 'Editar sesión del {date}',
    'log.row.delete': 'Eliminar sesión del {date}',

    'log.edit.title': 'Editar sesión',
    'log.edit.help': 'Ajusta los datos y guarda: el total semanal y la racha se recalculan.',
    'log.edit.done': 'Sesión del {date} actualizada',
    'log.edit.error': 'No se pudo guardar la sesión: {message}',
    'log.edit.minutesError': 'Los minutos deben estar entre 1 y 1440.',

    'log.delete.title': 'Eliminar sesión',
    'log.delete.body':
      'Se eliminará la sesión del {date} ({minutes} min, {cert}). Esta acción no se puede deshacer.',
    'log.delete.confirm': 'Sí, eliminar',
    'log.delete.done': 'Sesión del {date} eliminada',
    'log.delete.error': 'No se pudo eliminar la sesión: {message}',

    'log.empty.title': 'Todavía no hay sesiones',
    'log.empty.body':
      'Registra la primera con el formulario de cuatro campos: certificación, minutos, tipo y dominio.',
    'log.emptyFiltered.title': 'Ninguna sesión coincide',
    'log.emptyFiltered.body': 'Prueba con otra certificación, otro tipo o un periodo más amplio.',
  },
  en: {
    'log.title': 'Log',
    'log.subtitle': 'Every session adds minutes, keeps the streak alive and feeds readiness.',

    'log.action.log': 'Log a session',
    'log.action.logHint': 'Opens the quick four-field form',

    'log.kpi.week': 'Hours this week',
    'log.kpi.weekGoal': 'goal {goal}',
    'log.kpi.streak': 'Streak',
    'log.kpi.streakValue': '{n} days',
    'log.kpi.streakValue_one': '{n} day',
    'log.kpi.streakValue_other': '{n} days',
    'log.kpi.sessions': 'Sessions',
    'log.kpi.total': 'Time logged',
    'log.kpi.streakHint': 'study days in a row',

    'log.heatmap.title': 'Consistency',
    'log.heatmap.label': 'Session heatmap for the last {days} days',
    'log.heatmap.cell': '{date}: {minutes} min',
    'log.heatmap.less': 'less',
    'log.heatmap.more': 'more',
    'log.heatmap.none': 'No sessions in this period yet.',
    'log.heatmap.summary': '{minutes} across {days} days with sessions',

    'log.filters.cert': 'Certification',
    'log.filters.certAll': 'All certifications',
    'log.filters.type': 'Type',
    'log.filters.typeAll': 'All types',
    'log.filters.range': 'Period',
    'log.filters.clear': 'Clear filters',

    'log.range.7': 'Last 7 days',
    'log.range.30': 'Last 30 days',
    'log.range.90': 'Last 90 days',
    'log.range.all': 'Whole history',

    'log.list.title': 'Sessions',
    'log.list.hint': 'newest first',
    'log.day.count': '{count} sessions',
    'log.day.count_one': '{count} session',
    'log.day.count_other': '{count} sessions',
    'log.day.total': 'Day total: {hours}',

    'log.row.confidence': 'Confidence {n}/5',
    'log.row.notes': 'Note',
    'log.row.menu': 'Actions for the session on {date}',
    'log.row.edit': 'Edit the session on {date}',
    'log.row.delete': 'Delete the session on {date}',

    'log.edit.title': 'Edit session',
    'log.edit.help': 'Adjust the data and save: the weekly total and the streak are recalculated.',
    'log.edit.done': 'Session on {date} updated',
    'log.edit.error': 'The session could not be saved: {message}',
    'log.edit.minutesError': 'Minutes must be between 1 and 1440.',

    'log.delete.title': 'Delete session',
    'log.delete.body': 'The session on {date} ({minutes} min, {cert}) will be deleted. This cannot be undone.',
    'log.delete.confirm': 'Yes, delete',
    'log.delete.done': 'Session on {date} deleted',
    'log.delete.error': 'The session could not be deleted: {message}',

    'log.empty.title': 'No sessions yet',
    'log.empty.body': 'Log the first one with the four-field form: certification, minutes, type and domain.',
    'log.emptyFiltered.title': 'No session matches',
    'log.emptyFiltered.body': 'Try another certification, another type or a wider period.',
  },
});
