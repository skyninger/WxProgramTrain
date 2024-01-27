const utils = require('./util.js');
class blueDevices {
	#findBlueTater = 0;
	#callSuccess = null;
	#callFail = null;
	#callProcess = null;
	#sendSuccess = null;
	#strOrder = '';
	#tryConnect = null;
	#saveParams = {deviceData: {}, callback: {}};
	
	strDeviceName = '';
	objBlueData = {};
	objBlueDataTmp = {};
	
	constructor () {}
	
	// crc32算法
	getCRC32Hex (strHex) {
		const Invert_byte = (byte) => {
			var i = 0;
			var re_dat = 0;
			for (i = 0; i < 8; i++) {
					if (byte & (0x01 << i)) {
							re_dat |= (0x80 >> i)
					}
			}
			return re_dat
		}
		const unsigned_dword = (dat) => {
			if (dat < 0) {
				dat += 0xffffffff + 1;
			}
			return dat
		}
		const str_len8 = (dat) => {
			let x = dat;
			while (x.length < 8) {
				x = "0" + x;
			}
			return x
		}
		const Invert_dword = (dword) => {
			var i;
			var re_dat = 0;
			for (i = 0; i < 32; i++) {
				if (dword & ((1 << i)))
					re_dat |= (0x80000000 >>> i);
			}
			return re_dat
		}
		const CRC32 = (Data_arr, DataLen, POLY, INIT, REFIN, REFOUT, XOROUT) => {
			var wCRCin = INIT;
			var wCPoly = POLY;
			var wChar = 0;
			var i = 0;
			var p = 0;
			while (DataLen--) {
					wChar = Data_arr[p++];
					wChar = REFIN ? Invert_byte(wChar) : wChar;
					wCRCin ^= (wChar << 24);
					wCRCin = unsigned_dword(wCRCin);
					for (i = 0; i < 8; i++) {
							if (wCRCin & 0x80000000)
									wCRCin = (wCRCin << 1) ^ wCPoly;
							else
									wCRCin = wCRCin << 1
					}
			}
			wCRCin &= 0xffffffff;
			wCRCin = REFOUT ? Invert_dword(wCRCin) : wCRCin;
			wCRCin ^= XOROUT;
			wCRCin = unsigned_dword(wCRCin);
			wCRCin = wCRCin.toString(16);
			return str_len8(wCRCin);
		}
		const x = strHex.toLocaleUpperCase().split('');
		const byte_num = strHex.length / 2
		const arr1 = new Array();
		const arr2 = new Array();
		for (let i = 0; i < byte_num; i++) {
			arr1[i] = x[2 * i] + x[2 * i + 1]
		}
		for (let i = 0; i < arr1.length; i++) {
			arr2[i] = parseInt(arr1[i], 16);
		}
		return CRC32(arr2, byte_num, 0x04C11DB7, 0xffffffff, true, true, 0xffffffff);
	}
	
	// ascii转换16进制
	convertToHexa (str = '') {
	   const res = [];
	   const { length: len } = str;
	   for (let n = 0, l = len; n < l; n ++) {
	      const hex = Number(str.charCodeAt(n)).toString(16);
	      res.push(hex);
	   };
	   return res.join('');
	}
	
	// 设置指令 - 前端js计算
	getOrderFront (time = '1') {
		return new Promise((resolve, reject) => {
			// 指令计算 包头 + 随机数 + mac地址 + 充电时间(分钟) + crc
			const head = '710a';
			const rand = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
			const macId = this.objBlueData.deviceId.replace(/:/g, '');
			const chargeTime = time.toString(16).padStart(4, '0');
			const deviceNo = this.objBlueData.name.split('-')[0];
			const deviceNoHex = this.convertToHexa(deviceNo);
			const crcHex = `${rand}${macId}${deviceNoHex}`;
			const crc = this.getCRC32Hex(crcHex);
			const strOrder = `${head}${rand}${macId}${chargeTime}${crc}`.toLocaleLowerCase();
			console.log('推算出指令是', strOrder, macId, chargeTime, crcHex, crc);
			resolve(strOrder);
		})
	}
	
	// 设置指令 - 后端接口返回
	getOrderBack (time = '1') {
		return new Promise((resolve, reject) => {
			let objBlueDataTmp = this.objBlueData;
			if (this.objBlueDataTmp.deviceId && this.objBlueDataTmp.name) {
				objBlueDataTmp = this.objBlueDataTmp;
			}
			// 指令计算 包头 + 随机数 + mac地址 + 充电时间(分钟) + crc
			const head = '710a';
			const rand = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
			const macId = objBlueDataTmp.deviceId.replace(/:/g, '');
			const chargeTime = time.toString(16).padStart(4, '0');
			const deviceNo = objBlueDataTmp.name.split('-')[0];
			const deviceNoHex = this.convertToHexa(deviceNo);
			const crcHex = `${rand}${macId}${deviceNoHex}`;
			const crc = this.getCRC32Hex(crcHex);
			const strOrder = `${head}${rand}${macId}${chargeTime}${crc}`.toLocaleLowerCase();
			console.log('推算出指令是', strOrder, macId, chargeTime);
			resolve(strOrder);
		})
	}
	
	string2buffer(str) {
	  let val = ""
	  if(!str) return;
	  let length = str.length;
	  let index = 0;
	  let array = []
	  while(index < length){
	    array.push(str.substring(index,index+2));
	     index = index + 2;
	  }
	  val = array.join(",");
	  // 将16进制转化为ArrayBuffer
	  return new Uint8Array(val.match(/[\da-f]{2}/gi).map(function (h) {
	    return parseInt(h, 16)
	  })).buffer
	}

	// 将ArrayBuffer转换成字符串
	ab2hex(buffer) {
		let hexArr = Array.prototype.map.call(
			new Uint8Array(buffer),
			function(bit) {
				return ('00' + bit.toString(16)).slice(-2)
			}
		)
		return hexArr.join('');
	}
	
	// 将从后台服务获取的指令写入到蓝牙设备当中
	sendMy(value){
		return new Promise((resolve, reject) => {
			this.getOrderBack(value).then(order => {
				this.#strOrder = order;
				wx.writeBLECharacteristicValue({
					deviceId: this.objBlueData.deviceId,
					serviceId: this.objBlueData.serviceId,
					characteristicId: this.objBlueData.writeId,//第二步写入的特征值
					value: this.string2buffer(this.#strOrder),
					success: (res) => {
						console.log("写入指令成功", value, res)
						this.#sendSuccess = resolve;
					},
					fail: (err) => {
						console.log('写入指令失败', value, err)
						reject();
					},
					complete:() => {
						console.log("调用结束");
					}
				})
			}).catch(() => {
				reject();
			});
		});
	}
	
	// 创建连接，发送指令
	startNotice (uuid) {
		this.#callProcess && this.#callProcess(85);
		wx.notifyBLECharacteristicValueChange({
			state: true, // 启用 notify 功能
			deviceId: this.objBlueData.deviceId,
			serviceId: this.objBlueData.serviceId,
			characteristicId: uuid,  //第一步 开启监听 notityid  第二步发送指令 write
			success: (res) => {
				console.log('notifyBLECharacteristicValueChange', res)
				this.#callProcess && this.#callProcess(100);
				this.#callSuccess && this.#callSuccess();
				// 设备返回的方法
				wx.onBLECharacteristicValueChange((res) => {
					// 此时可以拿到蓝牙设备返回来的数据是一个ArrayBuffer类型数据，
					//所以需要通过一个方法转换成字符串
					const arrayBuffer = this.ab2hex(res.value); // 这个是硬件返回的值
					/* this.arrayBuffer = arrayBuffer.slice(4); */
					console.log('onBLECharacteristicValueChange', res, arrayBuffer, this.#strOrder);
					/* if (arrayBuffer.indexOf(this.#strOrder) > -1) { */
					this.#sendSuccess && this.#sendSuccess();
					/* } else {
						utils.dialog.alert({
							title: '充电失败'
						}).then(() => {
							this.#callFail && this.#callFail();
						})
					} */
			　})
			
				// 这一步不能发
				/* setTimeout(res => {
					this.sendMy('3');
				}, 500); */
			},
			fail: err => {
				console.log('notifyBLECharacteristicValueChange->err', err)
				this.#callFail && this.#callFail();
			}
		})
	}
	// 如果一个蓝牙设备需要进行数据的写入以及数据传输，就必须具有某些特征值，所以通过上面步骤获取的id可以查看当前蓝牙设备的特征值
	getCharacteId () {
		console.log('getCharacteId->this.objBlueData', this.objBlueData)
		this.#callProcess && this.#callProcess(75);
		wx.getBLEDeviceCharacteristics({
		 deviceId: this.objBlueData.deviceId,
		 serviceId: this.objBlueData.serviceId,
		 success: (res) => {
			 this.#callProcess && this.#callProcess(80);
			 console.log('getBLEDeviceCharacteristics', res)
			 for (var i = 0; i < res.characteristics.length; i++) {//2个值
				 var model = res.characteristics[i]
				 if (model.properties.notify == true) {
					 this.objBlueData['notifyId'] = model.uuid//监听的值
					 this.startNotice(model.uuid)//7.0
				 }
				 if (model.properties.write == true){
					 this.objBlueData['writeId'] = model.uuid//监听的值
				 }
			 }
			},
			fail: err => {
				console.log('getBLEDeviceCharacteristics->err', err)
				this.#callFail && this.#callFail();
			}
		})
	}
	// 获取蓝牙设备服务uuid
	getServiceId () {
		this.#callProcess && this.#callProcess(65);
		wx.getBLEDeviceServices({
			deviceId: this.objBlueData.deviceId,
			success: (res) => {
				console.log('getBLEDeviceServices', res)
				this.#callProcess && this.#callProcess(70);
				const arrServices = res.services || [];
				let model = null;
				model = arrServices.length > 0 ? arrServices[0] : null;
				model = arrServices.length > 1 ? arrServices[1] : null;
				model = arrServices.find(item => item.uuid.indexOf('0000FF10-0000') > -1);
				if (this.objBlueData.advertisServiceUUIDs && this.objBlueData.advertisServiceUUIDs.length) {
					model = arrServices.find(item => item.uuid === this.objBlueData.advertisServiceUUIDs[0]);
				}
				 
				if (model) {
					this.objBlueData['serviceId'] = model.uuid;
					this.getCharacteId()//6.0
				} else {
					utils.dialog.alert({
						title: '没找到可用服务UUID'
					}).then(() => {
						this.#callFail && this.#callFail();
					})
				}
			},
			fail: err => {
				console.log('getBLEDeviceServices->fail', err)
				this.#callFail && this.#callFail();
			}
		})
	}
	// 连接蓝牙设备
	connetBlue (deviceId) {
		console.log('connetBlue', deviceId)
		this.#callProcess && this.#callProcess(55);
		wx.createBLEConnection({
			deviceId: deviceId,//设备id
			success: (res) => {
				console.log("连接蓝牙成功!", res)
				this.#callProcess && this.#callProcess(60);
				// 连接成功后关闭蓝牙搜索
				wx.stopBluetoothDevicesDiscovery({
					 success: (res) => {
						 console.log('连接蓝牙成功之后关闭蓝牙搜索', res);
					 }
				})
				this.getServiceId()//5.0
			},
			fail: (err) => {
				console.log("连接蓝牙失败!", err)
				wx.hideLoading();
				if (err.errCode === -1) {
					// 若已连接
					this.getServiceId()//5.0
				} else {
					this.#callFail && this.#callFail();
					utils.dialog.alert({
						title: '连接蓝牙失败',
						content: `${err.errMsg}${err.errCode ? ('(' + err.errCode + ')') : ''}`
					}).then(() => {
						if (this.#tryConnect) {
							this.#tryConnect();
						}
					});
				}
			}
		})
	}
	
	// 获取搜索到的蓝牙设备信息
	getBlue () {
		this.#callProcess && this.#callProcess(30);
		wx.getBluetoothDevices({
			success: (res) => {
				wx.hideLoading();
				this.#callProcess && this.#callProcess(50);
				// 如果搜索到设备列表为空的话
				console.log('getBluetoothDevices', this.strDeviceName, res)
				if (res.devices.length == 0) {
					 // 监听搜索到新设备
					 /* wx.onBluetoothDeviceFound((bres) => {
						 console.log('onBluetoothDeviceFound', this.strDeviceName, bres)
						 // utils.dialog.alert({
							//  title: this.strDeviceName,
							//  content: 'onBluetoothDeviceFound：' + JSON.stringify(bres.devices.map(item => item.name))
						 // });
						 for (var i = 0; i < bres.devices.length; i++) {
								const strDeviceName = bres.devices[i].name;
								if (strDeviceName === this.strDeviceName){
									this.objBlueData = bres.devices[i] || {};
									this.connetBlue(bres.devices[i].deviceId);//4.0
									break
								}
							}
						}) */
						setTimeout(() => {
							this.findBlue();
						}, 500);
				} else {
					 /* utils.dialog.alert({
						 title: this.strDeviceName,
						 content: 'getBluetoothDevices：' + JSON.stringify(res.devices.map(item => item.name))
					 }); */
					for (var i = 0; i < res.devices.length; i++){
						// 判断里面是否有我想要的蓝牙设备
						const strDeviceName = res.devices[i].name;
						if (strDeviceName === this.strDeviceName || res.devices[i].localName === this.strDeviceName){
							this.objBlueData = res.devices[i];
							this.connetBlue(res.devices[i].deviceId);//4.0
									
							/* blueDevice.start(res.devices[i].deviceId); */
							return;
						}
					}    
				}
			},
			fail: (err) =>{
				console.log("搜索蓝牙设备失败", err)
				this.#callFail && this.#callFail();
				utils.dialog.alert({
					title: '搜索蓝牙设备失败',
					content: `${err.errMsg}${err.errCode ? ('(' + err.errCode + ')') : ''}`
				}).then(() => {
					if (this.#tryConnect) {
						this.#tryConnect();
					}
				})
			}
		})
	}
	// 搜索周边蓝牙设备
	findBlue () {
		this.#callProcess && this.#callProcess(15);
		wx.startBluetoothDevicesDiscovery({
			allowDuplicatesKey: false,
			interval: 0,
			success: res => {
				this.#callProcess && this.#callProcess(20);
				this.#findBlueTater++;
				if (this.#findBlueTater == 12) {
					this.#callFail && this.#callFail();
				} else {
					wx.showLoading({
						title: '正在搜索设备'
					});
					this.getBlue();
				}
				console.log('正在搜索设备', this.strDeviceName, res)
			},
			fail: err => {
				console.log('搜索附近的蓝牙设备失败', err);
				wx.hideLoading();
				this.#callFail && this.#callFail();
				utils.dialog.alert({
					title: '搜索附近的蓝牙设备失败',
					content: `${err.errMsg}${err.errCode ? ('(' + err.errCode + ')') : ''}`
				}).then(() => {
					if (this.#tryConnect) {
						this.#tryConnect();
					}
				})
			}
		})
	}
	// 初始化蓝牙设备
	initBlue (deviceData = {}, callback = {}) {
		this.#saveParams = {
			deviceData: deviceData,
			callback: callback
		};
		this.#callSuccess = callback.success;
		this.#callFail = () => {
			this.offBlue();
			callback.fail && callback.fail();
		};
		this.#callProcess = callback.process;
		this.#tryConnect = callback.try;
		
		const strPlatform = this.getPlatform();
		console.warn('strPlatform', strPlatform);
		this.strDeviceName = deviceData.name || '';
		wx.showLoading({
			title: '初始化中'
		})
		this.#callProcess && this.#callProcess(5);
		wx.openBluetoothAdapter({
			success: res => {
				wx.hideLoading();
				console.log('初始化蓝牙设备成功', res);
				this.#callProcess && this.#callProcess(10);
				if (this.objBlueData.deviceId) {
					if (this.strDeviceName === this.objBlueData.name) {
						this.#callProcess && this.#callProcess(100);
						this.#callSuccess && this.#callSuccess();
					} else {
						// 发现已连接蓝牙设备，先断开
						utils.dialog.confirm({
							title: '断开提醒',
							content: '发现已连接设备，是否先断开？'
						}).then(() => {
							this.#callFail && this.#callFail();
						}).catch(() => {
							this.objBlueDataTmp = deviceData;
							if (deviceData.deviceId && strPlatform === 'android') {
								this.objBlueData = deviceData;
								this.connetBlue(deviceData.deviceId);//4.0
							} else {
								this.#findBlueTater = 0;
								this.findBlue();
							}
						})
					}
				} else {
					this.objBlueDataTmp = deviceData;
					if (deviceData.deviceId && strPlatform === 'android') {
						this.objBlueData = deviceData;
						this.connetBlue(deviceData.deviceId);//4.0
					} else {
						this.#findBlueTater = 0;
						this.findBlue();
					}
				}
			},
			fail: (err) => {
				wx.hideLoading();
				console.log('蓝牙未打开', err);
				if (callback.openFail) {
					this.#callFail && this.#callFail();
					callback.openFail();
				} else {
					utils.dialog.alert({
						title: '温馨提示' || err.errCode,
						content: '蓝牙未打开，请确保手机蓝牙保持开启状态' || err.errMsg
					}).then(() => {
						this.#callFail && this.#callFail();
					})
				}
			}
		});
	}
	
	// 断开蓝牙，deviceId：MAC的id
	offBlue (deviceId, callback) {
		if (deviceId || this.objBlueData.deviceId) {
			console.log(`this.objBlueData.deviceId`, this.objBlueData)
			// 若卡在搜索中，先停止搜索
			wx.stopBluetoothDevicesDiscovery();
			
			wx.closeBLEConnection({
				deviceId: deviceId || this.objBlueData.deviceId,
				success: res => {
					console.log('断开蓝牙连接成功', res);
					this.objBlueData = {};
					callback('success');
				},
				fail: err => {
					console.log('断开蓝牙连接失败', err);
					this.objBlueData = {};
					callback('fail');
				}
			})
		}
	}
	
	// 获取平台名
	getPlatform () {
		const res = wx.getSystemInfoSync();
		return res.platform;
	}
}

module.exports = new blueDevices();