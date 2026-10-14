const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char])

function shelfLabelHtml({ shelfNo, orderNo, barcode, categoryName }) {
  if (!/^[1-9]\d{0,5}$/.test(String(shelfNo)) || !orderNo || !barcode ||
      String(orderNo).length > 64 || String(barcode).length > 128 || String(categoryName ?? '').length > 100) {
    throw new Error('衣架号标签资料不完整')
  }
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>衣架号 ${escapeHtml(shelfNo)}</title>
<style>
@page { size: 30mm 110mm; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; color: #000; background: #fff; font-family: "Microsoft YaHei", Arial, sans-serif; }
.label { width: 30mm; height: 110mm; padding: 3mm 2mm; display: flex; flex-direction: column; align-items: center; text-align: center; overflow: hidden; }
.brand { font-size: 10pt; font-weight: 700; }
.title { margin-top: 10mm; font-size: 12pt; }
.number { width: 100%; margin: 2mm 0 10mm; font-size: 26pt; font-weight: 800; letter-spacing: -.06em; line-height: 1.15; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.category { width: 100%; font-size: 11pt; font-weight: 700; overflow-wrap: anywhere; }
.footer { width: 100%; margin-top: auto; border-top: 1px solid #000; padding-top: 3mm; font-size: 8pt; line-height: 1.5; overflow-wrap: anywhere; }
</style></head><body><div class="label"><div class="brand">小木棒洗衣</div><div class="title">衣架号</div>
<div class="number">${escapeHtml(shelfNo)}</div><div class="category">${escapeHtml(categoryName)}</div>
<div class="footer">订单 ${escapeHtml(orderNo)}<br>衣物 ${escapeHtml(barcode)}</div></div></body></html>`
}

module.exports = { shelfLabelHtml }
