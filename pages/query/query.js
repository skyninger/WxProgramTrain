const util = require('../../utils/util.js')
const station = require('../../utils/station.js')

Page({
  data: {
    citystart: '上海',
    cityend: '海宁',
    date: util.formatTime(new Date(), '-', 'date'),
    arrData: []
  },
  handlerSelect: function (e) {
    let objProp = e.currentTarget.dataset
    wx.reLaunch({
      url: '../main/main?no=' + objProp.no + '&code=' + objProp.code
    })
  },
  query: function () {
    let objPost = {
      'leftTicketDTO.train_date': this.data.date,
      'leftTicketDTO.from_station': this.$_convertCity(this.data.citystart, true),
      'leftTicketDTO.to_station': this.$_convertCity(this.data.cityend, true),
      'purpose_codes': 'ADULT'
    }
    console.log(objPost)
    wx.showNavigationBarLoading()
    util.$http.get('https://kyfw.12306.cn/otn/leftTicket/query', {
      data: objPost
    }).then(response => {
      console.log(response)
      wx.hideNavigationBarLoading()
      const objData = response.data
      const arrData = objData.data.result
      let arrTmp = []
      for (let i = 0; i < arrData.length; i++) {
        let arrTmpSplit = arrData[i].split('|')
        arrTmp.push({
          no: arrTmpSplit[3],
          start_end: this.$_convertCity(arrTmpSplit[4], false) + '-' + this.$_convertCity(arrTmpSplit[5], false),
          start_time: arrTmpSplit[8],
          arrive_time: arrTmpSplit[9],
          code: arrTmpSplit[2]
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
    })
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
    return ''
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
        that.setData({
          date: res.data
        })
      } 
    })
    wx.getStorage({
      key: 'strQueryData',
      success: function(res) {
        console.log('strQueryData', res)
        that.setData({
          arrData: JSON.parse(res.data)
        })
      } 
    })
  }
})