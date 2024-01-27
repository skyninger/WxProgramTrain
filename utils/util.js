const formatTime = (date, split = '/', how = 'datetime') => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  if (how === 'date') {
    return [year, month, day].map(formatNumber).join(split)
  } else if (how === 'time') {
    return [hour, minute].map(formatNumber).join(split)
  } else {
    return [year, month, day].map(formatNumber).join(split) + ' ' + [hour, minute, second].map(formatNumber).join(':')
  }
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

const $http = (URL, options = {}) => {
  let strCookie = ''
  try {
    strCookie = wx.getStorageSync('cookie')
  } catch (e) {
    console.log('getCookie', e)
  }
  return new Promise((resolve, reject) => {
    wx.showNavigationBarLoading()
    wx.request(Object.assign({
      url: URL,
      header: {
        cookie: strCookie
      },
      success: data => {
        resolve(data)
      },
      fail: err => {
        reject(err)
      },
      complete: () => {
        wx.hideNavigationBarLoading()
      }
    }, options))
  })
}

$http.get = (URL, options = {}) => {
  let strCookie = ''
  try {
    strCookie = wx.getStorageSync('cookie')
  } catch (e) {
    console.log('getCookie', e)
  }
  return new Promise((resolve, reject) => {
    wx.showNavigationBarLoading()
    wx.request(Object.assign({
      url: URL,
      method: 'GET',
      header: {
        cookie: strCookie
      },
      success: data => {
        resolve(data)
      },
      fail: err => {
        reject(err)
      },
      complete: () => {
        wx.hideNavigationBarLoading()
      }
    }, options))
  })
}

$http.post = (URL, options = {}) => {
  let strCookie = ''
  try {
    strCookie = wx.getStorageSync('cookie')
  } catch (e) {
    console.log('getCookie', e)
  }
  return new Promise((resolve, reject) => {
    wx.showNavigationBarLoading()
    wx.request(Object.assign({
      url: URL,
      method: 'POST',
      header: {
        cookie: strCookie
      },
      success: data => {
        resolve(data)
      },
      fail: err => {
        reject(err)
      },
      complete: () => {
        wx.hideNavigationBarLoading()
      }
    }, options))
  })
}


/**
 * 统一默认弹窗
 */
const dialog = {
  confirm: (options = {}) => {
    return new Promise((resolve, reject) => {
      wx.showModal(Object.assign({}, options, {
        showCancel: true,
        success: (res) => {
          console.log(`res.confirm`, res.confirm, res)
          if (res.confirm) {
            resolve()
          } else {
            reject()
          }
        },
        fail: (err) => {
          console.log('err', err)
          reject(err)
        }
      }))
    })
  },
  alert: (options = {}) => {
    return new Promise((resolve, reject) => {
      wx.showModal(Object.assign({}, options, {
        showCancel: false,
        success: (res) => {
          resolve()
        },
        fail: (err) => {
          reject(err)
        }
      }))
    })
  }
}

module.exports = {
  formatTime: formatTime,
  $http: $http,
  dialog: dialog
}
