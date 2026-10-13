export const round2 = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100

export function memberPrice(unitPrice, category, card) {
  if (!card) return round2(unitPrice)
  const rate = Number(card.discountRate)
  if (!category || category.priceMode === 1) return round2(unitPrice * rate / 10)
  if (rate === 8.8) return round2(category.memberPrice300 || unitPrice)
  if (rate === 6.8) return round2(category.memberPrice500 || unitPrice)
  return round2(unitPrice * rate / 10)
}

export function calculateReceive({ items, categories = [], card = null, rewash = false, urgent = false,
  newCardAmount = 0, rechargeAmount = 0, useCard = false, cardBalance = 0, totalPaid = null }) {
  const categoryById = Object.fromEntries(categories.map(value => [value.id, value]))
  let count = 0, totalAmount = 0, actualAmount = 0
  const pricedItems = items.map(item => {
    const quantity = Number(item.quantity || 1)
    const unitPrice = rewash ? 0 : Number(item.unitPrice || 0)
    const price = memberPrice(unitPrice, categoryById[item.categoryId], card)
    count += quantity
    totalAmount = round2(totalAmount + unitPrice * quantity)
    actualAmount = round2(actualAmount + price * quantity)
    return { ...item, unitPrice, catalogPrice: rewash ? 0 : item.catalogPrice, memberPrice: price, subtotal: round2(price * quantity) }
  })
  const urgentSurcharge = urgent ? round2(actualAmount * 0.2) : 0
  const payableAmount = round2(actualAmount + urgentSurcharge)
  const cardDeduct = useCard ? Math.min(Number(cardBalance), payableAmount) : 0
  const extraPayment = round2(payableAmount - cardDeduct)
  const totalReceivable = round2(Number(newCardAmount) + Number(rechargeAmount) + extraPayment)
  const paid = totalPaid == null ? totalReceivable : Number(totalPaid)
  return { items: pricedItems, totalPaid: paid, totals: { count, totalAmount, actualAmount,
    discountRate: card ? Number(card.discountRate) : 10, discountAmount: round2(totalAmount - actualAmount),
    urgentSurcharge, payableAmount, newCardAmount: Number(newCardAmount), rechargeAmount: Number(rechargeAmount),
    cardDeduct, extraPayment, totalReceivable, debtAmount: Math.max(0, round2(totalReceivable - paid)) } }
}

export const isDraftExpired = (draft, now = Date.now(), ttl = 24 * 60 * 60 * 1000) =>
  now - Number(draft?.updatedAt || 0) >= ttl

export function pickupItems(pendingItems, categories, priceFor, idFor) {
  return pendingItems.map(item => {
    const category = categories.find(value => Number(value.id) === Number(item.categoryId))
    if (!category) throw new Error(`衣物类别已停用：${item.categoryName}`)
    const unitPrice = Number(category.originalPrice || category.price || 0)
    return { itemTempId: idFor(), categoryId: category.id, categoryGroup: category.categoryGroup,
      categoryName: item.categoryName, customName: null, quantity: Number(item.quantity || 1),
      unitPrice, catalogPrice: unitPrice, memberPrice: priceFor(unitPrice, category), subtotal: 0,
      color: '', brand: '', size: '', defect: '', special: '' }
  })
}

export const rewashItems = (pendingItems, idFor) =>
  pendingItems.map(item => ({ ...item, itemTempId: idFor() }))
