import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina clases CSS con soporte para Tailwind CSS
 * Utiliza clsx para combinar clases y tailwind-merge para resolver conflictos
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
