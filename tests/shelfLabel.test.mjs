import test from 'node:test'
import assert from 'node:assert/strict'
import labelModule from '../electron/shelf-label.js'

test('衣架号标签按单件打印，转义衣物信息且不包含顾客资料', () => {
  const html = labelModule.shelfLabelHtml({ shelfNo: 1700, orderNo: '00120261014001', barcode: 'IT<123>', categoryName: '大衣&外套' })
  assert.match(html, /@page \{ size: 30mm 110mm; margin: 0; \}/)
  assert.match(html, /<div class="number">1700<\/div>/)
  assert.match(html, /IT&lt;123&gt;/)
  assert.match(html, /大衣&amp;外套/)
  assert.doesNotMatch(html, /顾客|手机号/)
  assert.throws(() => labelModule.shelfLabelHtml({ shelfNo: 0, orderNo: '1', barcode: 'IT1' }))
})
