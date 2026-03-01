/**
 * Vibración háptica (ImpactStyle.Medium) para feedback táctil.
 * Solo tiene efecto en plataformas nativas con Capacitor; en web no hace nada.
 */
export async function hapticImpactMedium(): Promise<void> {
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    // En web o sin plugin, ignorar
  }
}

/**
 * Vibración de advertencia (NotificationType.Warning), más larga/intensa.
 * Para acciones drásticas como cancelar una atención.
 */
export async function hapticCancelWarning(): Promise<void> {
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {
    // En web o sin plugin, ignorar
  }
}
