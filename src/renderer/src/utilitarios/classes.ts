// Junta classes CSS ignorando valores falsos: classes('a', cond && 'b')
export function classes(...nomes: (string | false | null | undefined)[]): string {
  return nomes.filter(Boolean).join(' ')
}
