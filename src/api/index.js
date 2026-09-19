import request from './request'

/** 衣物类别相关接口 */
export const categoryApi = {
  /** 全部类别（按分组排序） */
  list: () => request.get('/category/list'),
  /** 按分组返回Map */
  grouped: () => request.get('/category/grouped'),
  /** 模糊搜索类别 */
  search: (keyword) => request.get('/category/search', { params: { keyword } })
}

/** 客户相关接口 */
export const customerApi = {
  /** 按手机号查询客户信息+会员卡 */
  search: (phone) => request.get('/customer/search', { params: { phone } }),
  /** 保存客户（增改） */
  save: (data) => request.post('/customer/save', data)
}

/** 会员卡相关接口 */
export const memberCardApi = {
  /** 卡类型列表 */
  types: () => request.get('/member-card/types'),
  /** 按客户ID查卡 */
  byCustomer: (customerId) => request.get('/member-card/by-customer', { params: { customerId } }),
  /** 会员卡详情 */
  detail: (cardId) => request.get(`/member-card/${cardId}`),
  /** 办卡 */
  create: (data) => request.post('/member-card/create', data),
  /** 充值 */
  recharge: (data) => request.post('/member-card/recharge', data)
}

/** 订单相关接口 */
export const orderApi = {
  /** 提交收衣订单（核心） */
  receive: (data) => request.post('/order/receive', data),
  /** 今日单数 */
  todayCount: () => request.get('/order/today-count'),
  /** 生成条码图 */
  barcode: (code, w = 360, h = 80) => request.get('/order/barcode', { params: { code, w, h } }),
  /** 暂存订单列表 */
  stagingList: (params) => request.get('/order/staging-list', { params }),
  /** 暂存订单详情 */
  stagingDetail: (orderId) => request.get(`/order/staging-detail/${orderId}`),
  /** 首页统计卡片（今日订单/待收衣/待取衣/本月营收） */
  dashboardStats: () => request.get('/order/dashboard-stats'),
  /** 首页最近订单列表 */
  dashboardRecent: (limit = 10) => request.get('/order/dashboard-recent', { params: { limit } })
}

/** 装车送厂相关接口 */
export const factoryDispatchApi = {
  eligibleOrders: () => request.get('/factory-dispatch/eligible-orders'),
  createBatch: (data) => request.post('/factory-dispatch/create', data)
}

/** 回店批次与大件逐件签收 */
export const storeReturnApi = {
  batches: () => request.get('/store-return/batches'),
  batch: (id) => request.get(`/store-return/batches/${id}`),
  packageDetail: (id, packageNo) => request.get(`/store-return/batches/${id}/packages/${encodeURIComponent(packageNo)}`),
  scan: (id, packageNo, barcode) => request.post(`/store-return/batches/${id}/scan`, { packageNo, barcode }),
  confirm: (id, packageNo) => request.post(`/store-return/batches/${id}/confirm`, { packageNo }),
  reportException: (id, packageNo, reason) => request.post(`/store-return/batches/${id}/exception`, { packageNo, reason })
}

/** 取衣码 + 手机号核验、整单逐件交付 */
export const pickupApi = {
  prepareLegacy: () => request.post('/pickup/prepare-legacy'),
  ready: () => request.get('/pickup/ready'),
  lookup: (phone, pickupCode) => request.post('/pickup/lookup', { phone, pickupCode }),
  scan: (phone, pickupCode, barcode) => request.post('/pickup/scan', { phone, pickupCode, barcode }),
  close: (phone, pickupCode) => request.post('/pickup/close', { phone, pickupCode })
}

/** 照片相关接口（瑕疵拍照取证） */
export const photoApi = {
  /** 上传照片（multipart/form-data） */
  upload: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return request.post('/photo/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000
    })
  },
  /** 删除照片 */
  delete: (filename) => request.delete('/photo/delete', { params: { filename } })
}
