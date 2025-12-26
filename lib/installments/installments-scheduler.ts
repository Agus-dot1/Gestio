import { Installment } from '../database-operations';

/**
 * Valida que el pago de una cuota sea secuencial: no se permite pagar una cuota
 * si existen cuotas anteriores del mismo plan/sale pendientes.
 */
export function validateSequentialPayment(
  saleInstallments: Installment[],
  targetInstallmentNumber: number
): boolean {
  return !saleInstallments.some(
    (i) => i.status !== 'paid' && (i.installment_number || 0) < targetInstallmentNumber
  );
}

/**
 * Calcula el nuevo vencimiento para TODAS las cuotas pendientes de una venta, 
 * asegurando que se paguen mensualmente a partir del mes siguiente al último pago.
 * Esta versión utiliza aritmética manual sobre hilos de texto YYYY-MM-DD para evitar
 * desvíos por zona horaria o UTC.
 */
export function scheduleAllPendingMonthly(
  saleInstallments: Installment[]
): { id: number; newDueISO: string }[] {
  // 1. Clasificar y ordenar las cuotas LOCALMENTE por su número de cuota
  // Es vital que el orden sea determinista para que el index refleje la correlatividad real.
  const sorted = [...saleInstallments].sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0));

  // 2. Encontrar la fecha del último pago.
  const paid = sorted.filter((i) => i.status === 'paid' && i.paid_date);
  if (paid.length === 0) return [];

  // Usamos comparación de hilos para encontrar la fecha ISO más reciente (lexicográficamente)
  const lastPaidISO = [...paid].sort((a, b) => String(b.paid_date).localeCompare(String(a.paid_date)))[0].paid_date!;

  // Extraer año y mes base del último pago (formato esperado: YYYY-MM-DD...)
  const dateMatch = lastPaidISO.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) return [];

  const baseYear = parseInt(dateMatch[1], 10);
  const baseMonth = parseInt(dateMatch[2], 10); // 1-12

  // 3. Filtrar pendientes (en el orden ya establecido)
  const pending = sorted.filter((i) => i.status !== 'paid');
  if (pending.length === 0) return [];

  // Usar el día original de la primera cuota pendiente como "anchor day" (el día del mes que suele pagar)
  const firstPendingMatch = pending[0].due_date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const anchorDay = firstPendingMatch ? parseInt(firstPendingMatch[3], 10) : 15;

  const updates: { id: number; newDueISO: string }[] = [];

  // 4. Reprogramar cada cuota pendiente correlativamente: 1 mes después de la anterior (empezando desde el último pago)
  pending.forEach((inst, index) => {
    if (!inst.id) return;

    // Offset: la primera pendiente es Month + 1, la segunda Month + 2, etc.
    const monthOffset = index + 1;
    let targetMonth = baseMonth + monthOffset;
    let targetYear = baseYear;

    // Aritmética de meses básica
    while (targetMonth > 12) {
      targetMonth -= 12;
      targetYear += 1;
    }

    // Calcular el último día del mes destino para no pasarnos (ej: 31 de abril -> 30 de abril)
    // Date(Y, M, 0) devuelve el último día del mes M-1
    const lastDayInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    const finalDay = Math.min(anchorDay, lastDayInTargetMonth);

    const newISO = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;

    // Solo actualizar si realmente cambió la fecha
    if (inst.due_date !== newISO) {
      updates.push({ id: inst.id, newDueISO: newISO });
    }
  });

  return updates;
}