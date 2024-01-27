// pages/charge/charge.js
const blueDevice = require('../../utils/blueDevice.js')
Page({

  /**
   * 页面的初始数据
   */
  data: {
    chargeId: '',
    strMinute: '360'
  },

  handleTap (e) {
    console.log('e', e, blueDevice);
    const { dataset } = e.target;
    this.onCharge(dataset.name, dataset.id);
  },

  onCharge (deviceName, deviceId) {
    if (this.data.chargeId === deviceId) {
      wx.showLoading({
        title: '断开中'
      })
      blueDevice.offBlue(deviceId, status => {
        wx.hideLoading();
        if (status === 'success') {
          this.data.chargeId = '';
        }
      });
    } else {
      blueDevice.initBlue({
        connectable: true,
        deviceId: deviceId,
        name: deviceName
      }, {
        success: () => {
          // 发送指令，开始充电
          blueDevice.sendMy(this.data.strMinute).then(() => {
            console.log('充电成功')
            this.data.chargeId = deviceId;
          }).catch(() => {
            console.log('充电失败')
            this.data.chargeId = '';
          });
        },
        fail: () => {
        },
        process: (num) => {
        },
        openFail: () => {
        }
      });
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})