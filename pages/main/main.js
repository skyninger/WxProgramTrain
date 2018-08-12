const util = require('../../utils/util.js')

Page({
  data: {
    no: '',
    objTrainList: {},
    arrData: [],
    arrDataBy: [],
    arrDataPic: []
  },
  handlerSelect: function () {
    wx.navigateTo({
      url: '../query/query'
    })
  },
  query: function () {
    const myDate = new Date()
    let strDate = util.formatTime(myDate, '', 'date')
    let strNo = this.data.no ? this.data.no.substr(0, 1) : ''
    let objTrainList = this.data.objTrainList
    if (!objTrainList[strDate]) {
      objTrainList[strDate] = {}
    }
    if (objTrainList[strDate][strNo]) {
      this.$_queryTrainList(objTrainList[strDate][strNo])
    } else if (strNo) {
      wx.showLoading({title: '读取中', mask: true})
      util.$http.get('https://mobile.12306.cn/weixin/wxcore/queryTrain', {
        data: {
          ticket_no: strNo,
          depart_date: strDate
        }
      }).then(response => {
        console.log(response)
        const objData = response.data
        objTrainList[strDate][strNo] = objData.data
        this.setData({
          objTrainList: objTrainList
        })
        this.$_queryTrainList(objTrainList[strDate][strNo])
      }).catch(err => {
        wx.hideLoading()
        wx.showModal({
          content: JSON.stringify(err),
          showCancel: false
        })
      })
    } else {
      wx.showModal({
        content: `车次输入不能为空`,
        showCancel: false
      })
    }
  },
  $_queryTrainList: function (data) {
    let strTrainNo = ''
    this.setData({arrData: [], arrDataPic: []})
    for (let obj of data) {
      if (this.data.no === obj.ticket_no) {
        strTrainNo = obj.train_code
        break
      }
    }
    if (!strTrainNo) {
      for (let obj of this.data.arrDataBy) {
        if (this.data.no === obj.ticket_no) {
          strTrainNo = obj.train_code
          break
        }
      }
    }
    if (strTrainNo) {
      wx.showLoading({title: '读取中', mask: true})
      util.$http.get('https://mobile.12306.cn/weixin/czxx/queryByTrainNo', {
        data: {
          train_no: strTrainNo,
          from_station_telecode: 'BBB',
          to_station_telecode: 'BBB',
          depart_date: util.formatTime(new Date(), '-', 'date')
        }
      }).then(response => {
        console.log(response)
        wx.hideLoading()
        const objData = response.data
        /* wx.showModal({
          content: JSON.stringify(objData)
        }) */
        this.setData({
          arrData: objData.data.data
        })
        this.$_computedRun()
        if (!objData.data.data.length) {
          wx.showModal({
            content: `${this.data.no}不存在`,
            showCancel: false
          })
        }
      })
    } else {
      wx.hideLoading()
      wx.showModal({
        content: `${this.data.no}找不到对应火车号`,
        showCancel: false
      })
    }
  },
  handlerZwd: function (e) {
    const objProp = e.currentTarget.dataset
    let objPost = {
      cxlx: objProp.zwd,
      cz: objProp.city,
      cc: this.data.no,
      rq: util.formatTime(new Date(), '-', 'date'),
      czEn: encodeURI(objProp.city.replace(/\s+/g,"")).replace(/%/g,"-")
    }
    this.$_getZwd(objPost, objProp.index)
  },
  handlerZwdPic: function (e) {
    const objProp = e.currentTarget.dataset
    let objPost = {
      cxlx: 0,
      cz: objProp.city,
      cc: this.data.no,
      rq: util.formatTime(new Date(), '-', 'date'),
      czEn: encodeURI(objProp.city.replace(/\s+/g,"")).replace(/%/g,"-")
    }
    let boolSingle = false
    if (objProp.index === 0) {
      objPost.cxlx = 1
      boolSingle = true
    } else if (objProp.index === this.data.arrData.length - 1) {
      boolSingle = true
    }
    this.$_getZwd(objPost, objProp.index, () => {
      this.$_computedRun()
      if (!boolSingle) {
        setTimeout(() => {
          let objPost1 = Object.assign(objPost, {
            cxlx: 1
          })
          this.$_getZwd(objPost1, objProp.index, () => {
            this.$_computedRun()
          })
        }, parseInt(Math.random() * 2000) + 500)
      }
    })
  },
  $_getZwd: function (objPost, index, callback) {
    let arrData = this.data.arrData
    wx.showNavigationBarLoading()
    util.$http.get('https://dynamic.12306.cn/mapping/kfxt/zwdcx/LCZWD/cx.jsp', {
      data: objPost,
      header: {'Content-Type':'application/json; charset=utf-8'}
    }).then(response => {
      console.log(response)
      wx.hideNavigationBarLoading()
      const strData = response.data
      let arrValue = strData.match(/(\d{2}:\d{2})/g)
      let strOut = '无数据'
      let intType = -1
      if(arrValue) {
        strOut = arrValue[0];
        /* if (/预计/g.test(strData)){
          intType=0;
        } else {
          intType=1;
        } */
        let intTime = parseInt(util.formatTime(new Date(), '', 'time'))
        if (strOut.indexOf(':') > -1) {
          let selfTime = parseInt(strOut.replace(':',''))
          if (intTime < selfTime) {
            intType = 0
          } else {
            intType = 1
          }
        }
      }
      if (parseInt(objPost.cxlx) === 0) {
        arrData[parseInt(index)].arrive_time_zwd_sign = intType
        arrData[parseInt(index)].arrive_time_zwd = strOut
      } else if (parseInt(objPost.cxlx) === 1) {
        arrData[parseInt(index)].start_time_zwd_sign = intType
        arrData[parseInt(index)].start_time_zwd = strOut
      }
      this.setData({
        arrData: arrData
      })
      callback && callback()
    })
  },
  $_dealData: function () {
    let arrData = this.data.arrData
    let arrTmp1 = []
    let arrTmp2 = []
    for (let i = 0; i < arrData.length; i++) {
      if (i % 4 === 0 && i!==0) {
        arrTmp1.push(arrTmp2)
        arrTmp2 = []
      }
      arrTmp2.push(arrData[i])
    }
    arrTmp1.push(arrTmp2)
    this.setData({
      arrDataPic: arrTmp1
    })
  },
  $_computedRun: function () {
    let arrData = this.data.arrData
    let intTime = parseInt(util.formatTime(new Date(), '', 'time'))
    let arrResult = []
    for (let i = 0; i < arrData.length; i++) {
      let arrTmp = Object.assign({}, arrData[i])
      let intArrive = 0
      let selfArrive = parseInt(arrData[i].arrive_time.replace(':',''))
      let intStart = parseInt(arrData[i].start_time.replace(':',''))
      if (arrData[i].arrive_time_zwd && arrData[i].arrive_time_zwd!=='无数据') {
        selfArrive = parseInt(arrData[i].arrive_time_zwd.replace(':',''))
      }
      if (arrData[i].start_time_zwd && arrData[i].start_time_zwd!=='无数据') {
        intStart = parseInt(arrData[i].start_time_zwd.replace(':',''))
      }
      if (i===arrData.length-1) {
        intArrive = selfArrive
        intStart = selfArrive
      } else {
        if (arrData[i+1].arrive_time_zwd && arrData[i+1].arrive_time_zwd!=='无数据') {
          intArrive = parseInt(arrData[i+1].arrive_time_zwd.replace(':',''))
        } else {
          intArrive = parseInt(arrData[i+1].arrive_time.replace(':',''))
        }
      }
      /* console.log(selfArrive, intStart, intArrive, intTime) */
      if (intTime > intStart && intTime < intArrive) {
        arrTmp.run = 1
      } else if (selfArrive <= intTime && intTime <= intStart) {
        arrTmp.run = 0
      } else if ((intTime > intStart && intTime > intArrive || intTime < intStart && intTime < intArrive) && intStart > intArrive && i !== 0 && i !== arrData.length - 1) {
        arrTmp.run = 1
      } else if (selfArrive <= intTime && intTime >= intStart && selfArrive > intStart && i !== 0 && i !== arrData.length - 1) {
        arrTmp.run = 0
      } else {
        arrTmp.run = -1
      }
      arrResult.push(arrTmp)
    }
    this.setData({
      arrData: arrResult
    })
    this.$_dealData()
  },
  handlerInput: function (e) {
    let objTmp = {}
    let pos = e.target.cursor
    let value = e.detail.value
    if (e.target.dataset.name === 'no') {
      value = value.toLocaleUpperCase()
    }
    objTmp[e.target.dataset.name] = value
    this.setData(objTmp)
    return {
      value: value,
      cursor: pos
    }
  },
  onLoad: function (options) {
    /* console.log(options) */
    this.setData({
      no: options.no ? options.no : ''
    })
    if (options.no) {
      let objData = {
        ticket_no: options.no,
        train_code: options.code
      }
      this.$_queryTrainList([objData])
      this.setData({arrDataBy: [objData]})
    }
  }
})