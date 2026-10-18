import { defineNamespace } from '../define';

/**
 * Diccionario de Notas (§7.11, §7.12).
 * Namespace propio: nadie más escribe aquí. Las etiquetas de acción compartidas
 * (`action.copyNote`, `action.copyForObsidian`) y el indicador «guardado a las
 * {time}» (`common.savedAt`) viven en `es/shared.ts` y se reutilizan.
 *
 * Los esqueletos de las plantillas son contenido generado por la app, así que
 * también se traducen; el texto que escribe la persona nunca pasa por aquí.
 */
export const notes = defineNamespace({
  ns: 'notes',
  es: {
    'notes.title': 'Notas',
    'notes.lead': 'Markdown con guardado automático. Todo se queda en este dispositivo.',
    'notes.count': '{count} notas',
    'notes.count_one': '{count} nota',
    'notes.count_other': '{count} notas',
    'notes.new': 'Nueva nota',

    /* --------------------------------------------------------- plantillas */
    'notes.templates.title': 'Plantillas rápidas',
    'notes.templates.hint': 'Crean una nota nueva con el esqueleto listo.',
    'notes.templates.domain': 'Resumen de dominio',
    'notes.templates.mistake': 'Error que cometí',
    'notes.templates.command': 'Comando que no recordaba',
    'notes.templates.question': 'Duda para investigar',
    'notes.templates.domain.body':
      '## Qué entra\n\n- \n\n## Regla mental\n\n- \n\n## Errores que cometí\n\n- \n\n## Dudas abiertas\n\n- \n',
    'notes.templates.mistake.body':
      '## Qué intentaba hacer\n\n- \n\n## Qué pasó\n\n- \n\n## Por qué pasó\n\n- \n\n## Cómo lo evito la próxima vez\n\n- \n',
    'notes.templates.command.body':
      '## Comando\n\n```\n\n```\n\n## Para qué sirve\n\n- \n\n## Cuándo lo uso\n\n- \n',
    'notes.templates.question.body':
      '## La duda\n\n- \n\n## Dónde buscar\n\n- \n\n## Qué encontré\n\n- \n\n## Conclusión\n\n- \n',

    /* ----------------------------------------------------------- búsqueda */
    'notes.search.label': 'Buscar en las notas',
    'notes.search.placeholder': 'Título, cuerpo o etiqueta…',
    'notes.search.clear': 'Limpiar búsqueda',
    'notes.search.scope': 'Índice local sobre título, cuerpo y etiquetas. Sin servicios externos.',
    'notes.search.results': '{count} coincidencias',
    'notes.search.results_one': '{count} coincidencia',
    'notes.search.results_other': '{count} coincidencias',
    'notes.search.emptyTitle': 'Sin notas que coincidan',
    'notes.search.emptyBody': 'Prueba con otra palabra o quita el filtro de certificación.',
    'notes.filter.cert': 'Filtrar por certificación',
    'notes.filter.allCerts': 'Todas las certificaciones',
    'notes.filter.pinned': 'Solo fijadas',

    /* --------------------------------------------------------------- lista */
    'notes.empty.title': 'Todavía no hay notas',
    'notes.empty.body': 'Empieza con una plantilla o con una nota en blanco. El autosave se encarga del resto.',
    'notes.empty.cta': 'Crear la primera nota',
    'notes.list.open': 'Abrir «{title}»',
    'notes.list.untitled': 'Nota sin título',
    'notes.list.updated': 'Actualizado {date}',
    'notes.list.pinned': 'Fijada',
    'notes.list.pin': 'Fijar «{title}»',
    'notes.list.unpin': 'Soltar «{title}»',
    'notes.list.noBody': 'Sin contenido todavía.',
    'notes.list.menu': 'Acciones de «{title}»',
    'notes.list.tags': 'Etiquetas: {tags}',

    /* -------------------------------------------------------------- editor */
    'notes.editor.back': 'Volver a las notas',
    'notes.editor.titleLabel': 'Título',
    'notes.editor.titlePlaceholder': 'Título de la nota',
    'notes.editor.meta': 'Metadatos',
    'notes.editor.metaHint': 'Certificación, dominio y tema son opcionales; sirven para enlazar la nota.',
    'notes.editor.cert': 'Certificación',
    'notes.editor.domain': 'Dominio',
    'notes.editor.topic': 'Tema',
    'notes.editor.none': 'Sin asignar',
    'notes.editor.tags': 'Etiquetas',
    'notes.editor.tagsPlaceholder': 's3, iam, examen',
    'notes.editor.tagsHint': 'Sepáralas con comas.',
    'notes.editor.pinned': 'Fijar arriba',
    'notes.editor.body': 'Cuerpo en Markdown',
    'notes.editor.bodyPlaceholder': 'Escribe en Markdown. La vista previa se actualiza al instante.',
    'notes.editor.pane': 'Editor y vista previa',
    'notes.editor.tab.edit': 'Editar',
    'notes.editor.tab.preview': 'Vista',
    'notes.editor.previewTitle': 'Vista previa',
    'notes.editor.previewEmpty': 'Nada que previsualizar todavía.',
    'notes.editor.noDomainHint': 'Elige primero una certificación.',

    /* ------------------------------------------------------------ formato */
    'notes.format.label': 'Formato Markdown',
    'notes.format.bold': 'Negrita',
    'notes.format.code': 'Código',
    'notes.format.list': 'Lista',
    'notes.format.checklist': 'Checklist',
    'notes.format.link': 'Enlace',
    'notes.format.heading': 'Encabezado 2',
    'notes.format.hint': 'Ctrl/Cmd+B negrita · Ctrl/Cmd+K enlace · Ctrl/Cmd+S guardar',

    /* ------------------------------------------------------------ guardado */
    'notes.status.saving': 'Guardando…',
    'notes.status.pending': 'Cambios sin guardar · Ctrl+S guarda ya',
    'notes.status.error': 'No se pudo guardar: {message}',
    'notes.status.retry': 'Reintentar',
    'notes.autosave.hint': 'Autosave 600 ms tras la última tecla.',
    'notes.versions.note':
      'Sin historial de versiones en el MVP: el respaldo JSON y el export a Obsidian son la red de seguridad.',

    /* ---------------------------------------------------- copiar y borrar */
    'notes.copy.code': 'Copiar bloque de código',
    'notes.copy.obsidianHint':
      'Certificación completa con frontmatter y wikilinks. Si la nota no tiene certificación, copia su Markdown.',
    'notes.delete.action': 'Eliminar nota',
    'notes.delete.done': 'Nota eliminada',
    'notes.delete.error': 'No se pudo eliminar: {message}',
    'notes.notFound.title': 'Esa nota no existe',
    'notes.notFound.body': 'Puede que la hayas eliminado o que el enlace esté roto.',
    'notes.notFound.cta': 'Volver a las notas',
  },
  en: {
    'notes.title': 'Notes',
    'notes.lead': 'Markdown with autosave. Everything stays on this device.',
    'notes.count': '{count} notes',
    'notes.count_one': '{count} note',
    'notes.count_other': '{count} notes',
    'notes.new': 'New note',

    'notes.templates.title': 'Quick templates',
    'notes.templates.hint': 'They create a new note with the skeleton ready.',
    'notes.templates.domain': 'Domain summary',
    'notes.templates.mistake': 'Mistake I made',
    'notes.templates.command': 'Command I forgot',
    'notes.templates.question': 'Question to research',
    'notes.templates.domain.body':
      '## What goes in\n\n- \n\n## Mental rule\n\n- \n\n## Mistakes I made\n\n- \n\n## Open questions\n\n- \n',
    'notes.templates.mistake.body':
      '## What I was trying to do\n\n- \n\n## What happened\n\n- \n\n## Why it happened\n\n- \n\n## How I avoid it next time\n\n- \n',
    'notes.templates.command.body':
      '## Command\n\n```\n\n```\n\n## What it is for\n\n- \n\n## When I use it\n\n- \n',
    'notes.templates.question.body':
      '## The question\n\n- \n\n## Where to look\n\n- \n\n## What I found\n\n- \n\n## Conclusion\n\n- \n',

    'notes.search.label': 'Search notes',
    'notes.search.placeholder': 'Title, body or tag…',
    'notes.search.clear': 'Clear search',
    'notes.search.scope': 'Local index over title, body and tags. No external services.',
    'notes.search.results': '{count} matches',
    'notes.search.results_one': '{count} match',
    'notes.search.results_other': '{count} matches',
    'notes.search.emptyTitle': 'No matching notes',
    'notes.search.emptyBody': 'Try another word or clear the certification filter.',
    'notes.filter.cert': 'Filter by certification',
    'notes.filter.allCerts': 'All certifications',
    'notes.filter.pinned': 'Pinned only',

    'notes.empty.title': 'No notes yet',
    'notes.empty.body': 'Start from a template or a blank note. Autosave does the rest.',
    'notes.empty.cta': 'Create the first note',
    'notes.list.open': 'Open “{title}”',
    'notes.list.untitled': 'Untitled note',
    'notes.list.updated': 'Updated {date}',
    'notes.list.pinned': 'Pinned',
    'notes.list.pin': 'Pin “{title}”',
    'notes.list.unpin': 'Unpin “{title}”',
    'notes.list.noBody': 'No content yet.',
    'notes.list.menu': 'Actions for “{title}”',
    'notes.list.tags': 'Tags: {tags}',

    'notes.editor.back': 'Back to notes',
    'notes.editor.titleLabel': 'Title',
    'notes.editor.titlePlaceholder': 'Note title',
    'notes.editor.meta': 'Metadata',
    'notes.editor.metaHint': 'Certification, domain and topic are optional; they link the note.',
    'notes.editor.cert': 'Certification',
    'notes.editor.domain': 'Domain',
    'notes.editor.topic': 'Topic',
    'notes.editor.none': 'Unassigned',
    'notes.editor.tags': 'Tags',
    'notes.editor.tagsPlaceholder': 's3, iam, exam',
    'notes.editor.tagsHint': 'Separate them with commas.',
    'notes.editor.pinned': 'Pin to top',
    'notes.editor.body': 'Markdown body',
    'notes.editor.bodyPlaceholder': 'Write in Markdown. The preview updates as you type.',
    'notes.editor.pane': 'Editor and preview',
    'notes.editor.tab.edit': 'Edit',
    'notes.editor.tab.preview': 'View',
    'notes.editor.previewTitle': 'Preview',
    'notes.editor.previewEmpty': 'Nothing to preview yet.',
    'notes.editor.noDomainHint': 'Pick a certification first.',

    'notes.format.label': 'Markdown formatting',
    'notes.format.bold': 'Bold',
    'notes.format.code': 'Code',
    'notes.format.list': 'List',
    'notes.format.checklist': 'Checklist',
    'notes.format.link': 'Link',
    'notes.format.heading': 'Heading 2',
    'notes.format.hint': 'Ctrl/Cmd+B bold · Ctrl/Cmd+K link · Ctrl/Cmd+S save',

    'notes.status.saving': 'Saving…',
    'notes.status.pending': 'Unsaved changes · Ctrl+S saves now',
    'notes.status.error': 'Could not save: {message}',
    'notes.status.retry': 'Retry',
    'notes.autosave.hint': 'Autosave 600 ms after the last keystroke.',
    'notes.versions.note': 'No version history in the MVP: the JSON backup and the Obsidian export are the safety net.',

    'notes.copy.code': 'Copy code block',
    'notes.copy.obsidianHint':
      'Full certification with frontmatter and wikilinks. If the note has no certification, its Markdown is copied.',
    'notes.delete.action': 'Delete note',
    'notes.delete.done': 'Note deleted',
    'notes.delete.error': 'Could not delete: {message}',
    'notes.notFound.title': 'That note does not exist',
    'notes.notFound.body': 'You may have deleted it, or the link is broken.',
    'notes.notFound.cta': 'Back to notes',
  },
});
