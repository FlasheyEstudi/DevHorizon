// =============================================================================
// utils.ts — cn() helper para componentes shadcn/ui.
//
// Combina clsx (condicionales) + tailwind-merge (deduplicación de utilities
// conflictivas). Es el estandar de facto en componentes shadcn: cuando pasás
// `className={cn("p-2 bg-primary", condition && "p-4", className)}`, el merge
// resuelve `p-2` vs `p-4` quedándose con el último.
//
// Why: shadcn genera componentes que aceptan className y lo aplican via cn().
// Sin este helper, una variante de Button con `bg-destructive` no se podría
// override desde afuera si el caller pone `bg-primary`.
// =============================================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}