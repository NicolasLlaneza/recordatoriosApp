// Utilidades de fecha. La clave de día define el "reinicio a medianoche":
// cuando cambia el día, la lista arranca vacía sin borrar el historial.

/** Clave de día local en formato YYYY-MM-DD. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Hora local HH:mm de un timestamp en ms. */
export function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Milisegundos hasta la próxima medianoche local (para refrescar la UI). */
export function msUntilNextMidnight(now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

/** Etiqueta amigable de la fecha, ej: "lunes 20 de julio". */
export function friendlyDate(d: Date = new Date()): string {
  try {
    return d.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return dayKey(d);
  }
}
