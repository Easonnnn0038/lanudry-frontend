import request from './request'

/**
 * 用户登录
 * @param {Object} data - { username, password }
 * @returns {Promise} 登录结果
 */
export function login(data) {
  return request({
    url: '/auth/login',
    method: 'post',
    data
  })
}

/**
 * 获取当前用户信息
 * @returns {Promise} 用户信息
 */
export function getUserInfo() {
  return request({
    url: '/auth/info',
    method: 'get'
  })
}

/**
 * 退出登录
 * @returns {Promise} 退出结果
 */
export function logout() {
  return request({
    url: '/auth/logout',
    method: 'post'
  })
}

/**
 * 修改密码
 * @param {Object} data - { oldPassword, newPassword }
 * @returns {Promise} 修改结果
 */
export function changePassword(data) {
  return request({
    url: '/auth/password',
    method: 'put',
    data
  })
}
