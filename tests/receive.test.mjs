import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateReceive, isDraftExpired, pickupItems, rewashItems } from '../src/utils/receive-calculation.mjs'
import { requestErrorKind } from '../src/api/request-errors.mjs'

test('登录过期、网络失败和超时被准确分类', () => {
  assert.equal(requestErrorKind({ response: { status: 401 } }), 'unauthorized')
  assert.equal(requestErrorKind({ message: 'Network Error' }), 'network')
  assert.equal(requestErrorKind({ code: 'ECONNABORTED' }), 'timeout')
})

test('会员折扣、加急、卡余额和欠款按两位小数计算', () => {
  const result = calculateReceive({
    items: [{ categoryId: 1, quantity: 2, unitPrice: 19.9, catalogPrice: 19.9 }],
    categories: [{ id: 1, priceMode: 1 }], card: { discountRate: 8.8 }, urgent: true,
    useCard: true, cardBalance: 20, rechargeAmount: 100, totalPaid: 115
  })
  assert.deepEqual(result.totals, { count: 2, totalAmount: 39.8, actualAmount: 35.02,
    discountRate: 8.8, discountAmount: 4.78, urgentSurcharge: 7, payableAmount: 42.02,
    newCardAmount: 0, rechargeAmount: 100, cardDeduct: 20, extraPayment: 22.02,
    totalReceivable: 122.02, debtAmount: 7.02 })
})

test('返洗强制免费且不产生应收', () => {
  const result = calculateReceive({ items: [{ categoryId: 1, quantity: 2, unitPrice: 50 }], rewash: true, urgent: true })
  assert.equal(result.totals.totalReceivable, 0)
  assert.equal(result.items[0].unitPrice, 0)
})

test('返洗带入保留来源衣物并生成新的临时编号', () => {
  const rows = rewashItems([{ sourceOrderItemId: 8, categoryId: 2, unitPrice: 0 }], () => 'new-id')
  assert.equal(rows[0].sourceOrderItemId, 8)
  assert.equal(rows[0].itemTempId, 'new-id')
})

test('挂单在满 24 小时时过期', () => {
  assert.equal(isDraftExpired({ updatedAt: 1000 }, 1000 + 86400000 - 1), false)
  assert.equal(isDraftExpired({ updatedAt: 1000 }, 1000 + 86400000), true)
})

test('上门预约导入使用当前目录价格并拒绝停用类别', () => {
  const rows = pickupItems([{ categoryId: 3, categoryName: '衬衫', quantity: 2 }],
    [{ id: 3, categoryGroup: 'CLOTHES', price: 15 }], price => price * 0.88, () => 'temp')
  assert.deepEqual(rows[0], { itemTempId: 'temp', categoryId: 3, categoryGroup: 'CLOTHES', categoryName: '衬衫',
    customName: null, quantity: 2, unitPrice: 15, catalogPrice: 15, memberPrice: 13.2, subtotal: 0,
    color: '', brand: '', size: '', defect: '', special: '' })
  assert.throws(() => pickupItems([{ categoryId: 9, categoryName: '旧类别' }], [], x => x, () => 'x'), /已停用/)
})
