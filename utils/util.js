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
  return new Promise((resolve, reject) => {
    wx.request(Object.assign({
      url: URL,
      success: data => {
        resolve(data)
      },
      fail: err => {
        reject(err)
      }
    }, options))
  })
}

$http.get = (URL, options = {}) => {
  return new Promise((resolve, reject) => {
    wx.showNavigationBarLoading()
    wx.request(Object.assign({
      url: URL,
      method: 'GET',
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
  return new Promise((resolve, reject) => {
    wx.showNavigationBarLoading()
    wx.request(Object.assign({
      url: URL,
      method: 'POST',
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

module.exports = {
  formatTime: formatTime,
  $http: $http
}
