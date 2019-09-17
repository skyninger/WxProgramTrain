const util = require('../../utils/util.js')
const station = require('../../utils/station.js')

Page({
  data: {
    citystart: '上海',
    cityend: '海宁',
    mindate: util.formatTime(new Date(), '-', 'date'),
    date: util.formatTime(new Date(), '-', 'date'),
    arrData: [],
    currentScrollTop: 0,
    queryUrl: 'leftTicket/query'
  },
  handlerSellTip: function (e) {
    let objData = this.data.arrData[e.currentTarget.dataset.index] || {}
    wx.showModal({
      title: `${this.data.citystart}-${this.data.cityend}`,
      content: `${objData.no}次列车已售完。`,
      showCancel: false
    })
  },
  handlerScoreTip: function (e) {
    let objData = this.data.arrData[e.currentTarget.dataset.index] || {}
    if (objData.exchange) {
      wx.showModal({
        title: `${this.data.citystart}-${this.data.cityend}`,
        content: `${objData.no}次可积分兑换，100积分=1元。`,
        showCancel: false
      })
    }
  },
  handlerStopTip: function (e) {
    console.log('停运说明', this.data.arrData[e.currentTarget.dataset.index])
    let objData = this.data.arrData[e.currentTarget.dataset.index] || {}
    let arrDate = this.data.date.split('-')
    wx.showModal({
      title: objData.start_end,
      content: `由于${objData.no}次${objData.textInfo}，${arrDate[0]}年${arrDate[1]}月${arrDate[2]}日停售`,
      showCancel: false
    })
  },
  handlerSelect: function (e) {
    let objProp = e.currentTarget.dataset
    wx.setStorage({
      key: 'queryScrollTop',
      data: this.data.currentScrollTop
    })
    let pages = getCurrentPages()
    let prevPage = pages[pages.length-2]
    wx.navigateBack({
      delta: 1
    })
    prevPage.setData({
      arrDataBy: [{
        ticket_no: objProp.no,
        train_code: objProp.code
      }],
      no: objProp.no
    })
    prevPage.$_queryTrainList([{
      ticket_no: objProp.no,
      train_code: objProp.code
    }], objProp.date)
  },
  handlerSwitch: function (e) {
    let strEnd = this.data.cityend
    this.setData({
      citystart: strEnd,
      cityend: this.data.citystart
    })
  },
  query: function () {
    let cityStartCode = this.$_convertCity(this.data.citystart, true)
    let cityArriveCode = this.$_convertCity(this.data.cityend, true)
    let objPost = {
      'leftTicketDTO.train_date': this.data.date,
      'leftTicketDTO.from_station': cityStartCode,
      'leftTicketDTO.to_station': cityArriveCode,
      'purpose_codes': 'ADULT'
    }
    console.log(objPost)
    if (this.data.date && cityStartCode && cityArriveCode) {   
      util.$http.get('https://kyfw.12306.cn/otn/' + this.data.queryUrl, {
        data: objPost
      }).then(response => {
        console.log(response)
        const objData = response.data
        const arrData = objData.data.result
        let arrTmp = []
        for (let i = 0; i < arrData.length; i++) {
          let arrTmpSplit = arrData[i].split('|')
          let strStart = this.$_convertCity(arrTmpSplit[6], false)
          let strEnd = this.$_convertCity(arrTmpSplit[7], false)
          let strFirst = this.$_convertCity(arrTmpSplit[4], false)
          let strLast = this.$_convertCity(arrTmpSplit[5], false)
          /* if (arrTmpSplit[4] !== arrTmpSplit[6]) {
            strStart = this.$_convertCity(arrTmpSplit[4], false) + '/' + this.$_convertCity(arrTmpSplit[6], false)
          }
          if (arrTmpSplit[5] !== arrTmpSplit[7]) {
            strEnd = this.$_convertCity(arrTmpSplit[5], false) + '/' + this.$_convertCity(arrTmpSplit[7], false)
          } */
          arrTmp.push({
            no: arrTmpSplit[3],
            start_end: strStart + '-' + strEnd,
            first_last: strFirst + '-' + strLast,
            start_time: parseInt(arrTmpSplit[19])===0 ? arrTmpSplit[8] : '--:--',
            arrive_time: parseInt(arrTmpSplit[19])===0 ? arrTmpSplit[9] : '--:--',
            code: arrTmpSplit[2],
            exchange: !!parseInt(arrTmpSplit[36]),
            canWebBuy: arrTmpSplit[11].toLocaleUpperCase(),
            textInfo: arrTmpSplit[1],
            isWo: this.$_boolHasPrice('wo', arrTmpSplit),
            isZuo: this.$_boolHasPrice('zuo', arrTmpSplit),
            isZhan: this.$_boolHasPrice('zhan', arrTmpSplit)
          })
        }
        this.setData({
          arrData: arrTmp
        })
        if (!arrTmp.length) {
          wx.showModal({
            content: `暂无数据`,
            showCancel: false
          })
        }
        wx.setStorage({
          key: 'citystart',
          data: this.data.citystart
        })
        wx.setStorage({
          key: 'cityend',
          data: this.data.cityend
        })
        wx.setStorage({
          key: 'date',
          data: this.data.date
        })
        wx.setStorage({
          key: 'strQueryData',
          data: JSON.stringify(this.data.arrData)
        })
      }).catch(err => {
        wx.hideNavigationBarLoading()
        this.setData({
          arrData: []
        })
        wx.showModal({
          content: JSON.stringify(err),
          showCancel: false
        })
        this.$_getQueryUrl()
      })
    } else {
      wx.showModal({
        title: '输入必填项',
        content: JSON.stringify(objPost),
        showCancel: false
      })
    }
  },
  $_boolHasPrice: function (how, data) {
    let bool = false
    let arrData = data || []
    if (arrData.length < 30) return false
    let boolFun = function (str) {
      if (str === '无' || !str) {
        return false
      } else {
        return true
      }
    }
    switch (how) {
      case 'wo': /* 高级软卧/软卧/硬卧 */
        bool = boolFun(arrData[21]) || boolFun(arrData[23]) || boolFun(arrData[28])
        break
      case 'zuo': /* 商务座/特等座/一等座/二等座/软座/硬座 */
        bool = boolFun(arrData[32]) || boolFun(arrData[25]) || boolFun(arrData[31]) || boolFun(arrData[30]) || boolFun(arrData[22]) || boolFun(arrData[29])
        break;
      case 'zhan': /* 无座 */
        bool = boolFun(arrData[26])
        break
    }
    return bool
  },
  $_convertCity: function (city, bool) {
    let name = station.stationNames.split("@")
    let name_z = ''
    for(let i = 1; i < name.length; i++) {
      name_z=name[i].split("|");
      if(name_z[1]==city && bool){
        return name_z[2]
      }else if(name_z[2]==city && !bool){
        return name_z[1]
      }
    }
    if (!bool && city.toLocaleLowerCase() === 'jqo') {
      return '九龙'
    } else if (bool && city === '九龙') {
      return 'JQO'
    }
    return ''
  },
  $_getQueryUrl: function(callback) {
    let boolCallback = true
    util.$http.get('https://kyfw.12306.cn/otn/leftTicket/init').then(response => {
      const strHtml = response.data
      const REG_TAG = /<script[^>]*>([\s\S]*?)<\/script>/
      if (response.header['Set-Cookie']) {
        wx.setStorage({
          key: 'cookie',
          data: response.header['Set-Cookie']
        })
      }
      if (REG_TAG.exec(strHtml).length > 1) {
        const arrSource = REG_TAG.exec(strHtml)[1].split('\n')
        const arrDeal = arrSource.filter(v => v.indexOf('CLeftTicketUrl') > -1)
        console.log('$_getQueryUrl', arrDeal, arrSource)
        if (arrDeal.length > 0) {
          if (arrDeal[0].split('=').length > 1) {
            let strUrl = arrDeal[0].split('=')[1].trim().replace(/[\'|;]/g, '')
            this.setData({
              queryUrl: strUrl
            }, () => {
              callback && callback(strUrl);
            })
            wx.setStorage({
              key: 'queryUrl',
              data: strUrl
            })
            boolCallback = false
          }
        }
      }
      if (boolCallback) {
        callback && callback(this.data.queryUrl)
      }
    }).catch(err => {
      callback && callback(this.data.queryUrl)
    })
  },
  bindDateChange: function (e) {
    this.setData({
      date: e.detail.value
    })
  },
  handlerInput: function (e) {
    let objTmp = {}
    let pos = e.target.cursor
    let value = e.detail.value
    objTmp[e.target.dataset.name] = value
    this.setData(objTmp)
    return {
      value: value,
      cursor: pos
    }
  },
  onLoad: function () {
    let that = this
    wx.getStorage({
      key: 'citystart',
      success: function(res) {
        console.log('citystart', res)
        that.setData({
          citystart: res.data
        })
      } 
    })
    wx.getStorage({
      key: 'cityend',
      success: function(res) {
        console.log('cityend', res)
        that.setData({
          cityend: res.data
        })
      } 
    })
    wx.getStorage({
      key: 'date',
      success: function(res) {
        console.log('date', res)
        if (new Date(that.data.mindate).getTime() <= new Date(res.data).getTime()) {
          that.setData({
            date: res.data
          })
        }
      } 
    })
    wx.getStorage({
      key: 'strQueryData',
      success: function(res) {
        console.log('strQueryData', res)
        let arrData = JSON.parse(res.data)
        if (arrData.length) {
          wx.getStorage({
            key: 'queryScrollTop',
            complete: function(rres){
              console.log('queryScrollTop', rres)
              that.setData({
                arrData: arrData
              }, () => {
                if (rres.data) {
                  wx.pageScrollTo({
                    scrollTop: parseFloat(rres.data)
                  })
                }
              })
            }
          })
        }
      } 
    })
    wx.getStorage({
      key: 'queryUrl',
      success: function(res) {
        console.log('queryUrl', res)
        that.setData({
          queryUrl: res.data
        })
      } 
    })
  },
  onPageScroll:function(e){
    this.setData({
      currentScrollTop: e.scrollTop
    })
  }
})