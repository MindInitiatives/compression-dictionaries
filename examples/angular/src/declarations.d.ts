// Type stubs for workspace packages that ship no TypeScript declarations.

declare module '@compression-dictionaries/demo-content' {
  export const bank: { name: string; currency: string }
  export const customer: { firstName: string }
  export const accounts: Array<{
    id: string
    name: string
    balance: number
    sortCode: string
    number: string
  }>
  export const transactions: Array<{
    id: string
    date: string
    description: string
    amount: number
    category: string
  }>
  export const payees: Array<{ id: string; name: string; sortCode: string; number: string }>
  export const products: Array<{ id: string; name: string; rate: string; fee: string }>
  export const releases: Record<string, string>
  export function formatMoney(amount: number, currency?: string): string
}

declare module '@compression-dictionaries/core/middleware' {
  export function dictionaryDeltas(options: {
    manifest: () => any
    deltasDir: () => string
    log?: (line: string) => void
  }): import('express').RequestHandler
  export function compressedStatic(options: {
    root: () => string
    cacheControl?: (path: string) => string
    log?: (line: string) => void
  }): import('express').RequestHandler
}
