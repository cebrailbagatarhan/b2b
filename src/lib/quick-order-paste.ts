/** Parse Excel (tab) or semicolon-separated stock-code/quantity rows without side effects. */
export type QuickOrderRow = { stockCode: string; quantity: number }
export type QuickOrderPasteResult = { rows: QuickOrderRow[]; errors: string[] }

export const MAX_QUICK_ORDER_ROWS = 100

export function parseQuickOrderPaste(text: string): QuickOrderPasteResult {
  const rows: QuickOrderRow[] = []
  const errors: string[] = []
  const seen = new Set<string>()
  let nonEmpty = 0

  for (const [index, original] of text.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const line = original.trim()
    if (!line) continue
    nonEmpty++
    const cells = line.split(line.includes('\t') ? '\t' : ';').map((cell) => cell.trim())
    if (nonEmpty === 1 && cells.length === 2 &&
        /^stok\s*kodu$/i.test(cells[0]) && /^(adet|miktar)$/i.test(cells[1])) {
      continue
    }
    if (rows.length >= MAX_QUICK_ORDER_ROWS) {
      errors.push('Satır ' + (index + 1) + ': En fazla ' + MAX_QUICK_ORDER_ROWS + ' ürün aktarılabilir.')
      break
    }
    if (cells.length !== 2) {
      errors.push('Satır ' + (index + 1) + ': Stok kodu ve adet sekme veya noktalı virgülle ayrılmalı.')
      continue
    }
    const [stockCode, rawQuantity] = cells
    if (!stockCode || stockCode.length > 80 || /[\u0000-\u001F\u007F]/.test(stockCode)) {
      errors.push('Satır ' + (index + 1) + ': Geçersiz stok kodu.')
      continue
    }
    if (!/^[1-9]\d*$/.test(rawQuantity) || Number(rawQuantity) > 9999) {
      errors.push('Satır ' + (index + 1) + ': Adet 1 ile 9999 arasında tam sayı olmalı.')
      continue
    }
    const key = stockCode.toLocaleLowerCase('tr-TR')
    if (seen.has(key)) {
      errors.push('Satır ' + (index + 1) + ': Tekrarlanan stok kodu.')
      continue
    }
    seen.add(key)
    rows.push({ stockCode, quantity: Number(rawQuantity) })
  }
  if (!rows.length && !errors.length) errors.push('En az bir ürün satırı girin.')
  return { rows, errors }
}
