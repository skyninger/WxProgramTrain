const util = require('../../utils/util.js')

let pAutoTimeOut = null
let pAutoRunning = false
let pAutoPosIndex = 0
Page({
  data: {
    no: '',
    objTrainList: {},
    arrData: [],
    arrDataBy: [],
    arrDataPic: [],
    strTrainListDate: util.formatTime(new Date(), '-', 'date'),
    boolZwdRunning: false
  },
  handlerSelect: function () {
    clearTimeout(pAutoTimeOut)
    pAutoRunning = false
    wx.navigateTo({
      url: '../query/query'
    })
  },
  query: function () {
    /* 从外网查询车次并处理 */
    const myDate = new Date()
    let strDate = util.formatTime(myDate, '', 'date')
    let strNo = this.data.no ? this.data.no.substr(0, 1) : ''
    let objTrainList = this.data.objTrainList
    if (!objTrainList[strDate]) {
      objTrainList[strDate] = {}
    }
    if (objTrainList[strDate][strNo]) {
      let strDateTmp = util.formatTime(myDate, '-', 'date')
      this.$_queryTrainList(objTrainList[strDate][strNo], strDateTmp)
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
  $_queryTrainList: function (data, date) {
    /* 从外网获取列车时刻表并处理 */
    let strTrainNo = ''
    let strDate = date || util.formatTime(new Date(), '-', 'date')
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
      /*
      * wap:https://mobile.12306.cn/weixin/czxx/queryByTrainNo
      * pc:https://kyfw.12306.cn/otn/czxx/queryByTrainNo
      */
      // util.$http.get('https://mobile.12306.cn/weixin/czxx/queryByTrainNo', {
      util.$http.get('https://kyfw.12306.cn/otn/czxx/queryByTrainNo', {
        data: {
          train_no: strTrainNo,
          from_station_telecode: 'BBB',
          to_station_telecode: 'BBB',
          depart_date: strDate
        }
      }).then(response => {
        console.log(response)
        wx.hideLoading()
        const objData = response.data
        /* wx.showModal({
          content: JSON.stringify(objData)
        }) */
        let arrDataDeal = objData.data.data || []
        for (let i = 0; i < arrDataDeal.length; i++) {
          arrDataDeal[i].arrive_time_deal = arrDataDeal[i].arrive_time
          arrDataDeal[i].arrive_time_zwd_sign = -1
          arrDataDeal[i].start_time_deal = arrDataDeal[i].start_time
          arrDataDeal[i].start_time_zwd_sign = -1
        }
        this.setData({
          arrData: objData.data.data
        })
        this.$_computedRun()
        // this.$_autoZwdUpdate()
        if (!objData.data.data.length) {
          this.setData({arrDataPic: []})
          wx.showModal({
            content: `${this.data.no}不存在`,
            showCancel: false
          })
        }
      }).catch(err => {
        wx.hideLoading()
        wx.showModal({
          content: `${JSON.stringify(err)}`,
          showCancel: false
        })
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
    const objSelectData = this.data.arrData[parseInt(objProp.index)]
    /* console.log('handlerZwdPic', objSelectData) */
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
    } else {
      if (objSelectData.arrive_time_zwd_sign === -1) {
        objPost.cxlx = 0
      } else if (objSelectData.start_time_zwd_sign === -1) {
        objPost.cxlx = 1
      }
    }
    /* if (!this.data.boolZwdRunning) {
      this.setData({
        boolZwdRunning: true
      }) */
      this.$_getZwd(objPost, objProp.index, () => {
        this.$_computedRun()
        if (!boolSingle) {
          setTimeout(() => {
            let objPost1 = Object.assign({}, objPost, {
              cxlx: objPost.cxlx === 0 ? 1 : 0
            })
            this.$_getZwd(objPost1, objProp.index, () => {
              this.$_computedRun()
              /* this.setData({
                boolZwdRunning: false
              }) */
            })
          }, parseInt(Math.random() * 2000) + 500)
        } else {
          /* this.setData({
            boolZwdRunning: false
          }) */
        }
      })
    /* } */
  },
  $_getZwd: function (objPost, index, callback) {
    /* 从外网获取正晚点信息并处理 */
    let arrData = this.data.arrData
    util.$http.get('https://kyfw.12306.cn/otn/zwdch/query', {
      data: objPost,
      header: {'Content-Type':'application/json; charset=utf-8'}
    }).then(response => {
      console.log(response)
      const objValue = response.data.data || {};
      const strData = objValue.message || '';
      let arrValue = strData.match(/(\d{2}:\d{2})/g)
      let strOut = '未定'
      let intType = -11
      if(arrValue) {
        strOut = arrValue[0];
        // if (/预计/g.test(strData)){
        //   intType=0;
        // } else {
        //   intType=1;
        // }
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
        if (intType === -11) {
          // arrData[parseInt(index)].arrive_time_deal = arrData[parseInt(index)].arrive_time
        } else {
          arrData[parseInt(index)].arrive_time_deal = strOut
        }
      } else if (parseInt(objPost.cxlx) === 1) {
        arrData[parseInt(index)].start_time_zwd_sign = intType
        arrData[parseInt(index)].start_time_zwd = strOut
        if (intType === -11) {
          // arrData[parseInt(index)].start_time_deal = arrData[parseInt(index)].start_time
        } else {
          arrData[parseInt(index)].start_time_deal = strOut
        }
      }
      this.setData({
        arrData: arrData
      })
      callback && callback(strOut)
    })
    /* util.$http.get('https://dynamic.12306.cn/mapping/kfxt/zwdcx/LCZWD/cx.jsp', {
      data: objPost,
      header: {'Content-Type':'application/json; charset=utf-8'}
    }).then(response => {
      console.log(response)
      const strData = response.data
      let arrValue = strData.match(/(\d{2}:\d{2})/g)
      let strOut = '未定'
      let intType = -11
      if(arrValue) {
        strOut = arrValue[0];
        // if (/预计/g.test(strData)){
        //   intType=0;
        // } else {
        //   intType=1;
        // }
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
        if (intType === -11) {
          // arrData[parseInt(index)].arrive_time_deal = arrData[parseInt(index)].arrive_time
        } else {
          arrData[parseInt(index)].arrive_time_deal = strOut
        }
      } else if (parseInt(objPost.cxlx) === 1) {
        arrData[parseInt(index)].start_time_zwd_sign = intType
        arrData[parseInt(index)].start_time_zwd = strOut
        if (intType === -11) {
          // arrData[parseInt(index)].start_time_deal = arrData[parseInt(index)].start_time
        } else {
          arrData[parseInt(index)].start_time_deal = strOut
        }
      }
      this.setData({
        arrData: arrData
      })
      callback && callback(strOut)
    }) */
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
    /* 处理火车位置 */
    let arrData = this.data.arrData
    let intTime = parseInt(util.formatTime(new Date(), '', 'time'))
    let arrResult = []
    for (let i = 0; i < arrData.length; i++) {
      let arrTmp = Object.assign({}, arrData[i])
      let intArrive = 0
      let planArrive = 0
      let planSelfArrive = parseInt(arrData[i].arrive_time.replace(':',''))
      let planStart = parseInt(arrData[i].start_time.replace(':',''))
      let selfArrive = parseInt(arrData[i].arrive_time_deal.replace(':',''))
      let intStart = parseInt(arrData[i].start_time_deal.replace(':',''))
      if (i===arrData.length-1) {
        intArrive = selfArrive
        intStart = selfArrive
        planArrive = planSelfArrive
      } else {
        intArrive = parseInt(arrData[i+1].arrive_time_deal.replace(':',''))
        planArrive = parseInt(arrData[i+1].arrive_time.replace(':',''))
      }
      /* console.log(selfArrive, intStart, intArrive, intTime) */
      /* intTime:当前时间
       *
       * intArrive:下一个站到达时间
       * intStart:本站出发时间
       * selfArrive:本站到达时间
       * 
       * planArrive:计划下一个站到达时间
       * planStart:计划本站出发时间
       * planSelfArrive:计划本站到达时间
       */
      /* console.log(arrData[i]); */
      arrTmp.run = -1;
      if (planSelfArrive > planStart && selfArrive > intStart) {
        /* console.log('planSelfArrive > planStart && selfArrive > planStart', planSelfArrive, planStart, selfArrive, planArrive, intStart) */
        if (intTime >= selfArrive || intStart >= intTime) {
          arrTmp.run = 0
        } else if (planArrive > planStart) {
          if (intArrive > intTime && intTime > intStart) {
            arrTmp.run = 1
          }
        } else if (planArrive < planStart) {
          if (intArrive < intTime && intTime < intStart) {
            arrTmp.run = 1
          }
        }
      } else if (planSelfArrive < planStart && selfArrive <= intStart) {
        /* console.log('planSelfArrive < planStart && selfArrive < planStart', planSelfArrive, planStart, selfArrive, planArrive, intStart) */
        if (selfArrive <= intTime && intTime <= intStart) {
          arrTmp.run = 0
        } else if (planArrive > planStart) {
          if (intArrive > intTime && intTime > intStart) {
            arrTmp.run = 1
          }
        } else if (planArrive < planStart) {
          if (intArrive < intStart && (intTime > intStart || intTime < intArrive)) {
            arrTmp.run = 1
          }
        }
      } else if (i === 0) {
        var intBefore30 = intStart - 30;
        intBefore30 = intBefore30 < 0 ? (intBefore30 + 2399) : intBefore30
        if (intBefore30 <= intTime && intTime < intStart) {
          arrTmp.run = 0
        }
        if (
          (planArrive > planStart && (intTime >= intStart && intTime < intArrive)) 
          || 
          (planArrive < planStart && (intTime >= intStart || intTime < intArrive))
        ) {
          if (intTime === intStart) {
            arrTmp.run = 0
          } else {
            arrTmp.run = 1
          }
        }
      } else if (i === arrData.length - 1 && intTime === selfArrive) {
        let planBeforeStart = parseInt(arrData[i-1].start_time.replace(':',''))
        let selfBeforeArrive = parseInt(arrData[i-1].arrive_time_deal.replace(':',''))
        if (
          planBeforeStart < planSelfArrive && selfBeforeArrive < selfArrive
          ||
          planBeforeStart > planSelfArrive && selfBeforeArrive > selfArrive
        ) {
          if (intTime === selfArrive) arrTmp.run = 0
        }
      }

      arrResult.push(arrTmp)
    }
    this.setData({
      arrData: arrResult
    })
    this.$_dealData()
  },
  $_autoZwdUpdate: function(){
    /* 更新火车位置智能化 */
    let _this = this
    let arrData = this.data.arrData
    let intTime = parseInt(util.formatTime(new Date(), '', 'time'))
    let intTimeToInt = function(data){
      return parseInt(data.replace(':',''))
    }
    let objPost = function(city){
      return {
        cxlx: 0,
        cz: city,
        cc: _this.data.no,
        rq: util.formatTime(new Date(), '-', 'date'),
        czEn: encodeURI(city.replace(/\s+/g,"")).replace(/%/g,"-")
      }
    }
    let arrMatchData = []
    if (getCurrentPages().reverse()[0].route !== 'pages/main/main' || arrData.length <= 0) {
      console.log('不是当前主页面或数据不存在，查询暂停。')
      clearTimeout(pAutoTimeOut)
      return false
    }
    pAutoRunning = true
    for (let i = 0; i < arrData.length; i++) {
      /* let intArriveTime = intTimeToInt(arrData[i].arrive_time_deal)
      let intStartTime = intTimeToInt(arrData[i].start_time_deal)
      let intTimeB1 = (intTime - 100) < 0 ? (intTime - 100 + 2359) : (intTime - 100)
      let intTimeA3 = (intTime + 200) > 2359 ? (intTime + 200 - 2359) : (intTime + 200)
      if (
        intTimeA3 > intArriveTime && intArriveTime > intTimeB1
        ||
        intTimeA3 > intStartTime && intStartTime > intTimeB1
      ) {
        arrMatchData.push(Object.assign(arrData[i], {
          index: i
        }))
      } */
      if (arrData[i].run >= 0) {
        arrMatchData.push(Object.assign(arrData[i], {
          index: i
        }))
      } else if (i > 0) {
        if (arrData[i - 1].run >= 0) {
          arrMatchData.push(Object.assign(arrData[i], {
            index: i
          }))
        }
      }
    }
    console.log(arrMatchData);
    let updateLoop = function(index){
      if (!pAutoRunning) return false
      if (index < arrMatchData.length) {
        let objPostData = objPost(arrMatchData[index].station_name)
        if (arrMatchData[index].index === 0) {
          let objPost1 = Object.assign({}, objPostData, {
            cxlx: 1
          })
          _this.$_getZwd(objPost1, arrMatchData[index].index, () => {
            _this.$_computedRun()
            setTimeout(() => {
              updateLoop(index + 1)
            }, parseInt(Math.random() * 1000) + 500)
          })
        } else if (arrMatchData[index].index === arrData.length - 1) {
          let objPost1 = Object.assign({}, objPostData, {
            cxlx: 0
          })
          _this.$_getZwd(objPost1, arrMatchData[index].index, () => {
            _this.$_computedRun()
            setTimeout(() => {
              updateLoop(index + 1)
            }, parseInt(Math.random() * 1000) + 500)
          })
        } else {
          _this.$_getZwd(objPostData, arrMatchData[index].index, (strZwd1) => {
            _this.$_computedRun()
            setTimeout(() => {
              let objPost1 = Object.assign({}, objPostData, {
                cxlx: objPostData.cxlx === 0 ? 1 : 0
              })
              _this.$_getZwd(objPost1, arrMatchData[index].index, (strZwd2) => {
                _this.$_computedRun()
                if (intTimeToInt(strZwd1) > intTime && (index % 2 === 0)) {
                  console.log('火车时间未到，5秒后重新查。')
                  pAutoPosIndex = index
                  pAutoRunning = false
                  pAutoTimeOut = setTimeout(function(){
                    _this.$_autoZwdUpdate()
                  }, 1 * 5 * 1000)
                } else {
                  setTimeout(() => {
                    updateLoop(index + 1)
                  }, parseInt(Math.random() * 1000) + 500)
                }
              })
            }, parseInt(Math.random() * 1000) + 500)
          })
        }
      } else if (arrMatchData.length > 0) {
        pAutoPosIndex = 0
        pAutoRunning = false
        pAutoTimeOut = setTimeout(function(){
          _this.$_autoZwdUpdate()
        }, 1 * 60 * 1000)
      }
    }
    updateLoop(pAutoPosIndex)
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
  onShow: function() {
    this.$_autoZwdUpdate()
  },
  onLoad: function (options) {
    /* console.log(options)
    this.setData({
      no: options.no ? options.no : ''
    })
    if (options.no) {
      let objData = {
        ticket_no: options.no,
        train_code: options.code
      }
      this.$_queryTrainList([objData], options.date)
      this.setData({arrDataBy: [objData]})
    } */
  }
})