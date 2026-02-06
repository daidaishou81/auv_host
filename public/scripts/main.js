//#region 服务器连接相关逻辑


      // 获取服务器状态指示灯元素
        const serverStatusLight = document.getElementById('server-status-light');
        const serverStatusText = document.getElementById('server-status-text');
        const reconnectBtn = document.getElementById('reconnect-btn');
        // WebSocket连接状态
        let ws = null;
        let dataCounter = 0;
        let lastUpdateTime = null;
        let reconnectAttempts = 0;
        const MAX_RECONNECT_ATTEMPTS = 5;   
        //设置声通全局变量 
        // 在文件开头添加声通标记变量
        let acousticMarkers = [];
        window.latestAcousticData = null;   
        // 在文件开头添加声通数据接收时间记录
        
        let lastAcousticReceiveTime = null;
        // 添加视频设备连接状态历史记录
        let videoConnectionHistory = [false,false,false,false,false,false,false,false,false,false]; // 存储最近10秒的视频设备连接状态
        const VIDEO_HISTORY_MAX = 10; // 记录10秒的数据
        //平滑旋转变量
        let previousHeadings = {};
  
        const FAULT_CODES = {
                    1: "定位心跳丢失",
                    2: "DVL心跳丢失", 
                    3: "深度高度计心跳丢失",
                    4: "惯导心跳丢失",
                   // 5: "设备故障（包含17~24）",
                    6: "范围越界",
                    7: "深度越界",
                    8: "高度过低",
                    9: "电量过低",
                    10: "抛载超时",
                    11: "任务取消超时",
                    17: "推进器故障",
                    18: "舵机故障",
                    19: "无刷直流电机故障",
                   // 20: "电池故障",
                    21: "惯导故障",
                    22: "DVL故障",
                    23: "声学通信定位设备自检异常",
                    24: "CTD/AHRS无数据"
                };
        //帆船模型初始化变量
        let sailboatModel = null;
       // 在文件开头修改设备计时器对象
window.deviceTimers = {
    video: {
        connected: false,
        lastStatusChange: Date.now(),
        currentStatusDuration: 0
    },
    beidou: {
        connected: false,
        lastStatusChange: Date.now(),
        currentStatusDuration: 0
    },
    acoustic: {
        connected: false,
        lastStatusChange: Date.now(),
        currentStatusDuration: 0
    }
};
        // 更新服务器状态显示
        function updateServerStatus(text, color) {
            serverStatusText.textContent = text;
            serverStatusLight.style.background = color;
            serverStatusLight.style.boxShadow = `0 0 6.4px ${color}`;
        }
        

        
        // 连接服务器函数
        function connectToServer() {
            // 清除之前的重连定时器
            if (window.reconnectTimer) {
                clearTimeout(window.reconnectTimer);
                window.reconnectTimer = null;
            }
            
            // 关闭现有连接
            if (ws) {
                try {
                    ws.close();
                } catch (e) {
                    console.log("关闭现有连接时出错:", e);
                }
            }
            
            // 更新UI状态
            reconnectBtn.classList.add('connecting');
            updateServerStatus('连接中...', '#f1c40f');
            
     try {     // 使用当前页面主机地址
        const wsHost = window.location.hostname || '192.168.1.100';
        const wsPort = window.location.port || 4000;
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        ws = new WebSocket(`${wsProtocol}//${wsHost}:${wsPort}`);
                
                ws.onopen = () => {
                    updateServerStatus('已连接', '#2ecc71');
                    console.log('已连接到服务器');
                };
               
                ws.onmessage = (event) => {
                    dataCounter++;
                    lastUpdateTime = new Date();
                    
                    const data = JSON.parse(event.data);
                     //console.log("近卫队的");  
                  console.log(data.type);
                    if (data.GNRMClatitude||data.GNRMClongitude) {
                      //  const { GNRMClatitude, lng } = [data.GNRMClatitude,data.GNRMClongitude];
                       // console.log(data.GNRMClatitude,data.GNRMClongitude);  
                        if (baseStationMarker) {
                            baseStationMarker.setLatLng([data.GNRMClatitude,data.GNRMClongitude]);
                            // 更新弹窗显示经纬度
                          // baseStationMarker.bindPopup(`基站位置: ${lat.toFixed(6)}, ${lng.toFixed(6)}`).openPopup();
                        } else {
                            initBaseStationMarker();
                            baseStationMarker.setLatLng([data.GNRMClatitude,data.GNRMClongitude]);
                        }    
                    }
                    
                    if(data.type === 'normal')
                    {
                         
                            updateData(
                                data.timestamp,
                                data.deviceId,
                                data.lat, 
                                data.lng, 
                                data.heading, 
                                data.speed, 
                                data.signal,
                                data.depth,
                                data.videoStatusMap,
                                data.beidouStatusMap,
                                data.acousticStatusMap,
                                data.battery

                            ); 
                            //更行报错
                           // if (data.faultCode && data.faultCode !== 0) parseFaultCode(data.faultCode); 
                            // 更新舵机推进器
                            if (data.Rudder || window.thrusterControl.ThrusterStatus)window.thrusterControl.updateThrusterStatus(data.Rudder,data.Brushlessmotor_position);//更新舵机数据
                            //更新载荷状态
                            if (data.load_Power && window.updatePowerStatusFromLoadPower)window.updatePowerStatusFromLoadPower.update(data.load_Power); //更新设备上断电
                            //更新状态机
                            updateDeviceStatuscode(data.stateMachine);
                           //更新高度
                           
                            if(data.g_altitude)updateAltitude(data.g_altitude);
                             //更新拉线位移
                            if(data.Inertial_guidance_state)updatedata_Inertial_guidance_stae(data.Inertial_guidance_state);
                            if (data.Pullwire.value1 !== undefined || data.Pullwire.value2 !== undefined) {
                                    window.oilTankManager.updateWireDisplacement({
                                            frontWireDisplacement: data.Pullwire.value1 ,  // 前拉线位移，单位mm
                                            rearWireDisplacement: data.Pullwire.value2     // 后拉线位移，单位mm
                                });
                                }
                               
                            //更新抛载状态
                            if(data.Throw_away){
                                updateDeviceThrow_away( window.updatePowerStatusFromLoadPower.getEmergencyLoadStatus(),data.Throw_away.Throw_away_Time_remaining); // 注意：断电表示已抛载
                            }
                           
                    }
                     if (data.dataType === 'acoustic') {
                        // 存储声通数据
                        window.latestAcousticData = data;
                          // 记录当前接收时间
                      
                                            
                        // 记录当前接收时间 - 确保这里正确更新时间戳
                        lastAcousticReceiveTime = Date.now();
                        console.log("声通数据更新时间:", new Date(lastAcousticReceiveTime).toLocaleTimeString());
                        // 更新声通设备状态
                        updateDeviceStatus("acoustic", {connected: true});
                        //声通故障码       
                        parseFaultCode(data.acoustic_errorCode) ;
                        //声通位置 
                        updateData(
                                data.timestamp,
                                "auv1",
                                data.acoustic_latitude, 
                                data.acoustic_longitude, 
                                data.acoustic_heading, 
                                undefined, 
                                undefined,
                                data.acoustic_depth,
                                undefined,
                                undefined,
                                undefined,
                                data.acoustic_battery

                            );   
                         // 在地图上创建声通标记点
                        createAcousticMarker(data);
                    }
                    if(data.type === 'DRPR_receive')calculateSignalStrengthFromVideo(data.tc_snr);
                     // 处理北斗数据
                    if (data.type === 'beidou') {
                       
                        if (window.beidouModal && typeof window.beidouModal.handleBeidouData === 'function') {
                            window.beidouModal.handleBeidouData(data);
                            
                            updateDeviceStatus("beidou", {connected: true});
                            //document.getElementById('timestamp').textContent = new Date().toLocaleTimeString();
                        }
                    }
                    // 新增：处理控制模式更新消息同步
                    if (data.type === 'control-mode-update') {
                        handleControlModeUpdate(data);
                    }
                    if(data.type === 'sailboat_Status'){
                        updateSailboatData(data.sailboat_Status);
                    }
                    if(data.type === 'self-check')
                        {
                              
                            addFeedbackMessage(data.message,data.deviceName);
                        }
                    // 计算延迟
                    const now = Date.now();
                    if (data.timestamp) {
                        const latency = now - data.timestamp;
                        document.getElementById('latency').textContent = latency + ' ms';
                    }
                    
                };
                
                ws.onerror = (error) => {
                    updateServerStatus('连接错误', '#ff6b6b');
                    console.error('WebSocket错误:', error);
                };
                
                ws.onclose = () => {
                    updateServerStatus('已断开', '#f1c40f');
                    console.log('连接已关闭');
                };
                 
            } catch (error) {
                console.error('连接失败:', error);
                updateServerStatus('连接失败', '#ff6b6b');
            }
        }
        // #region 声通相关
        // 添加创建声通标记函数
function createAcousticMarker(acousticData) {
    // 检查是否有有效的经纬度数据
    if (acousticData.acoustic_latitude !== undefined && 
        acousticData.acoustic_longitude !== undefined &&
        !isNaN(acousticData.acoustic_latitude) && 
        !isNaN(acousticData.acoustic_longitude)) {
        
        const lat = acousticData.acoustic_latitude;
        const lng = acousticData.acoustic_longitude;
        
        // 创建SVG图标
        const acousticIcon = L.icon({
            iconUrl: 'img/marker/acousticMarker.svg ',//'data:image/svg+xml;base64,' + btoa(`<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg t="1764499647074" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="13611" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="200"><path d="M512 85.333333c-164.949333 0-298.666667 133.738667-298.666667 298.666667 0 164.949333 298.666667 554.666667 298.666667 554.666667s298.666667-389.717333 298.666667-554.666667c0-164.928-133.717333-298.666667-298.666667-298.666667z m0 448a149.333333 149.333333 0 1 1 0-298.666666 149.333333 149.333333 0 0 1 0 298.666666z" fill="#1afa29" p-id="13612"></path></svg>`),
            iconSize: [20, 20],
            iconAnchor: [10, 20],
            popupAnchor: [0, -20]
        });
        
        // 创建标记
        const marker = L.marker([lat, lng], {
            icon: acousticIcon,
            title: '声通数据点'
        }).addTo(map);
        
        // 创建弹出窗口内容
        const popupContent = formatAcousticPopupContent(acousticData);
        marker.bindPopup(popupContent);
        
        // 将标记存入数组
        acousticMarkers.push(marker);
        
        //console.log(`声通标记已创建: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
}

// 格式化声通弹窗内容
function formatAcousticPopupContent(data) {
    let content = `<div class="acoustic-popup">
        <h4>声通数据详情</h4>`;
    
    if (data.type) {
        content += `<p><strong>帧类型:</strong> ${data.type}</p>`;
    }
    
    if (data.acoustic_timestamp) {
        content += `<p><strong>时间戳:</strong> ${new Date(data.acoustic_timestamp).toLocaleString()}</p>`;
    }
    
    if (data.acoustic_auvId !== undefined) {
        content += `<p><strong>AUV ID:</strong> ${data.acoustic_auvId}</p>`;
    }
    
    if (data.acoustic_usvId !== undefined) {
        content += `<p><strong>USV ID:</strong> ${data.acoustic_usvId}</p>`;
    }
    
    if (data.acoustic_latitude !== undefined) {
        content += `<p><strong>纬度:</strong> ${data.acoustic_latitude.toFixed(6)}</p>`;
    }
    
    if (data.acoustic_longitude !== undefined) {
        content += `<p><strong>经度:</strong> ${data.acoustic_longitude.toFixed(6)}</p>`;
    }
    
    if (data.acoustic_depth !== undefined) {
        content += `<p><strong>深度:</strong> ${data.acoustic_depth} 米</p>`;
    }
    
    if (data.acoustic_velocity !== undefined) {
        content += `<p><strong>速度:</strong> ${data.acoustic_velocity} 节</p>`;
    }
    
    if (data.acoustic_heading !== undefined) {
        content += `<p><strong>航向:</strong> ${data.acoustic_heading}°</p>`;
    }
    
    if (data.acoustic_status !== undefined) {
        content += `<p><strong>状态:</strong> ${data.acoustic_status}</p>`;
    }
    
    if (data.acoustic_errorCode !== undefined) {
        content += `<p><strong>错误码:</strong> ${data.acoustic_errorCode}</p>`;
    }
    
    if (data.acoustic_altitude !== undefined) {
        content += `<p><strong>高度:</strong> ${data.acoustic_altitude} 米</p>`;
    }
    
    if (data.acoustic_battery !== undefined) {
        content += `<p><strong>电池电量:</strong> ${data.acoustic_battery}%</p>`;
    }
    
    content += `<button class="locate-btn" onclick="centerMapOnAcoustic(${data.acoustic_latitude}, ${data.acoustic_longitude})">
                <i class="fas fa-crosshairs"></i> 定位到此点
               </button>`;
    
    content += `</div>`;
    return content;
}

// 定位到声通点
function centerMapOnAcoustic(lat, lng) {
    if (window.map) {
        window.map.setView([lat, lng], 15);
        showMessage(`已定位到声通点: ${lat.toFixed(6)}, ${lng.toFixed(6)}`, "success");
    }
}

// 清除所有声通标记
function clearAllAcousticMarkers() {
    acousticMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    acousticMarkers = [];
    console.log('所有声通标记已清除');
}
        
        // #endregion
        // 新增：处理控制模式更新
        function handleControlModeUpdate(data) {
            const { deviceId, mode, timestamp } = data;
            console.log(`收到控制模式更新: 设备 ${deviceId} 模式切换为 ${mode}`);
            
            // 更新当前控制模式
            currentControlMode = mode;
            
            // 更新UI显示
            updateControlModeUI(mode);
            
            // 根据模式执行相应操作
            if (mode === 'manual') {
                xboxstart();
                showMessage(`控制模式已切换为: 手动模式`, "success");
            } else {
                xboxstop();
                showMessage(`控制模式已切换为: 自动模式`, "success");
            }
        }

        // 新增：更新控制模式UI
        function updateControlModeUI(mode) {
            const modeBtn = document.getElementById('control-mode');
            const modeText = modeBtn.querySelector('span');
            const icon = modeBtn.querySelector('i');
            
            // 移除所有按钮的active类
            document.querySelectorAll('.task-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // 为当前模式按钮添加active类
            modeBtn.classList.add('active');
            
            if (mode === 'manual') {
                modeText.textContent = '手动模式';
                icon.className = 'fas fa-cogs';
                modeBtn.classList.add('manual');
                modeBtn.classList.remove('auto');
            } else {
                modeText.textContent = '自动模式';
                icon.className = 'fas fa-robot';
                modeBtn.classList.add('auto');
                modeBtn.classList.remove('manual');
            }
        }
            // 手动重连
        reconnectBtn.addEventListener('click', () => {
            reconnectAttempts = 0; // 重置尝试次数
            connectToServer();
        });
        
        // 页面加载时连接服务器
        connectToServer();
        
function connect_device_vedio() {
    const now = Date.now();
    const vedio_lastText = document.getElementById('timestamp').textContent;
    const beidou_lastText = document.getElementById('beidou-receive-time').textContent; 
    
    const vedio_lastTimestamp = parseTimeToTimestamp(vedio_lastText);
    const beidou_lastTimestamp = parseTimeToTimestamp(beidou_lastText);
    
    const vedio_diff = now - vedio_lastTimestamp;
    const beidou_diff = now - beidou_lastTimestamp;
 //声通设备断开时间判断
    if (vedio_diff <= 2000) { // 2秒内认为连接正常
        updateDeviceTimers("video", true);
        
        updateVideoConnectionHistory(true);
    } else {
       // if(isNaN(vedio_diff)) return;
        updateDeviceTimers("video", false);
        
        updateVideoConnectionHistory(false);
    }
    

//声通断开时间判断
  // 声通设备断开时间判断 - 修复这部分
    if (lastAcousticReceiveTime) {
        const acoustic_diff = now - lastAcousticReceiveTime;
        //console.log("声通时间差:", acoustic_diff, "ms");
        
        // 判断是否在指定时间内收到数据（这里设为5秒）
        if (acoustic_diff <= (1000*60)) { // 5秒内收到过声通数据
            updateDeviceTimers("acoustic", true);
        } else {
            updateDeviceTimers("acoustic", false);
           // console.log(`声通设备断开：${Math.round(acoustic_diff/1000)}秒未收到数据`);
        }
    } else {
        // 如果从未收到过声通数据，则认为断开
        updateDeviceTimers("acoustic", false);
      //  console.log("声通设备：从未收到过数据");
    }
//console.log("beidou_diff",beidou_diff);
     //北斗断开时间判断   
    if (beidou_diff <= (2000*60*3)) { // 2分钟内认为连接正常
        updateDeviceTimers("beidou", true);
    } else {
       // if(isNaN(beidou_diff)) return;
        updateDeviceTimers("beidou", false);
    }
}
  
    //#endregion 


//#region  更新数据相关逻辑
 // 更新仪表盘
        // 更新高度值的函数
        function updateAltitude(altitude) {
            // 根据你的HTML结构选择对应的元素ID
            const altitudeElement = document.getElementById('galtitude');
            altitude = altitude.toFixed(2);    
            altitudeElement.textContent =  ` ${altitude} 米`;
           
        }
           // 更新惯导状态参数函数
        function updatedata_Inertial_guidance_stae(altitude) {
            // 根据你的HTML结构选择对应的元素ID
            const altitudeElement = document.getElementById('updatedata-Inertial-guid-state');
            if (altitudeElement) {
                altitudeElement.textContent = altitude ;
            }
        }


                //更新电量
            function updateBatteryDisplay(percentage) {
                const batteryLevel = document.getElementById('battery-level');
                const batteryPercentage = document.getElementById('battery-percentage');
                
                // 确保百分比在0-100范围内
                percentage = Math.max(0, Math.min(100, percentage));
                
                // 更新填充高度
                batteryLevel.style.height = `${percentage}%`;
                
                // 根据电量设置颜色
                if (percentage > 70) {
                    batteryLevel.style.backgroundColor = '#2ecc71'; // 绿色 - 高电量
                } else if (percentage > 30) {
                    batteryLevel.style.backgroundColor = '#f1c40f'; // 黄色 - 中等电量
                } else {
                    batteryLevel.style.backgroundColor = '#e74c3c'; // 红色 - 低电量
                }
                
                // 更新百分比文本
                batteryPercentage.textContent = `${Math.round(percentage)}%`;
            }
      // 更新仪表盘
        function updateDashboard(device) {
            // 更新速度表
            document.querySelector('.speed-gauge .gauge-value').textContent = device.speed.toFixed(1);
            const speedNeedle = document.querySelector('.speed-gauge .needle');
          //  console.log('speed',device.speed );
            const speedRotation = (device.speed ) ;
            speedNeedle.style.transform = `translateX(-50%) rotate(${speedRotation}deg)`;
            
            // 更新航向表
            document.querySelector('.heading-gauge .gauge-value').textContent = device.heading.toFixed(0) + '°';
            const headingPointer = document.querySelector('.heading-gauge .compass-pointer');
            headingPointer.style.transform = `translateX(-50%) rotate(${device.heading}deg)`;
            
          
            // 更新位置信息
            document.getElementById('latitude').textContent = device.position.lat.toFixed(6);
            document.getElementById('longitude').textContent = device.position.lng.toFixed(6);
            document.getElementById('timestamp').textContent = new Date().toLocaleTimeString();
        }
 
        // 更新设备状态
    // 修改更新设备状态函数
function updateDeviceStatus(deviceType, statusMap) {
    const deviceElement = document.getElementById(`${deviceType}-device`);
    if (!deviceElement) return;
    const indicator = deviceElement.querySelector('.status-indicator');
    const statusText = deviceElement.querySelector('.status-text');
    
   // if (indicator && statusText) {
        const isConnected = statusMap.connected;
        // 更新计时器
        updateDeviceTimers(deviceType, isConnected);
        
   
  //  }
}
        
       
     // 更新船舶数据
function updateData(
    timestamp = Date.now(),
    deviceId = deviceManager.currentDeviceId || 'auv1',
    lat = 0,
    lng = 0,
    heading = 0,
    speed = 0,
    signal = null,
    depth = 0,
    videoStatusMap = { connected: false },
    beidouStatusMap = { connected: false },
    acousticStatusMap = { connected: false },
    battery = 100
) {
    const device = deviceManager.getDevice(deviceId);
    console.log(device);
    if (!device) return;
    // 检查位置数据是否有效
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        console.warn(`设备 ${deviceId} 接收到无效的位置数据: lat=${lat}, lng=${lng}`);
        return;
    }
    
    // 距离过滤：检查与上一帧的距离差距
    if (device.lastPosition) {
        const distance = calculateDistance(
            device.lastPosition.lat, 
            device.lastPosition.lng, 
            lat, 
            lng
        );
        
        // 如果距离大于20km，跳过该帧更新
        if (distance > 20000) {
            console.warn(`设备 ${deviceId} 位置跳变过大: ${distance.toFixed(2)}m，跳过该帧更新`);
            return;
        }
    }
    
    // 更新上一帧位置
    device.lastPosition = { lat, lng };
    
    // 更新设备位置和方向
    deviceManager.updateDevicePosition(deviceId, lat, lng, heading);
    deviceManager.updateDeviceData(deviceId, speed, signal, depth);
    device.battery = battery;
    console.log("zje");
    // #region 角度平滑设计
    // 角度平滑处理
    if (device.marker) {
        device.marker.setLatLng([lat, lng]);
        
        // 获取上一次的角度
        if (!previousHeadings[deviceId]) {
            previousHeadings[deviceId] = heading;
        }
        
        let currentHeading = heading;
        let previousHeading = previousHeadings[deviceId];
        
        // 处理角度跨越180°边界的情况
        let angleDiff = currentHeading - previousHeading;
        
        // 如果角度变化超过180°，说明跨越了边界
        if (angleDiff > 180) {
            // 从正角度跨越到负角度
            currentHeading -= 360;
        } else if (angleDiff < -180) {
            // 从负角度跨越到正角度
            currentHeading += 360;
        }
        
        // 设置旋转角度
        device.marker.setRotationAngle(currentHeading);
        
        // 更新上一次的角度（使用原始角度值）
        previousHeadings[deviceId] = heading;
    }
    
    // #endregion
    // 更新权限提示
    if (deviceId === deviceManager.currentDeviceId) {
        //updatePermissionHint(deviceId);
    }  
    
    // 更新设备标记位置和方向
    if (device.marker) {
        device.marker.setLatLng([lat, lng]);
        device.marker.setRotationAngle(heading);
    }
    
    // 添加轨迹点 - 使用设备特定的轨迹
    if (device.trailPath) {
        const newPos = [lat, lng];
        device.trailPath.addLatLng(newPos);
        
        const now = Date.now();
        const pointInterval = 30000; // 10秒
        
        // 为所有设备创建轨迹点（移除对当前设备的判断）
        if (now - device.lastPointTime > pointInterval) {
            const pointData = {  
                timestamp: new Date().toLocaleTimeString(),
                lat: lat,
                lng: lng,
                depth: depth.toFixed(1),
                heading: heading.toFixed(1),
                speed: speed.toFixed(1)
            };  
            
            createTrailPoint(device, pointData);
            device.lastPointTime = now;
        }
    }
    
    // 更新电池显示
    if (deviceId === deviceManager.currentDeviceId) {
        updateBatteryDisplay(device.battery);
    }
        
    // 如果当前设备是仪表盘显示设备，更新仪表盘
    if (deviceId === deviceManager.currentDeviceId) {
        updateDashboard(device);
    }
}

// 计算两点之间的距离（单位：米）
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // 地球半径（米）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
}
        // #region 清除轨迹 - 修改为清除当前设备轨迹
// 清除设备轨迹点
function clearDeviceTrailPoints(deviceId) {
    const device = deviceManager.getDevice(deviceId);
    if (device) {
        // 清除该设备的所有轨迹点
        device.trailPoints.forEach(point => {
            if (point.marker) map.removeLayer(point.marker);
            if (point.numberLabel) map.removeLayer(point.numberLabel);
        });
        device.trailPoints = [];
        device.lastPointTime = 0;
        device.markerCounter = 0;
        
        // 重置轨迹线
        if (device.trailPath) {
            map.removeLayer(device.trailPath);
            device.trailPath = L.polyline([], {
                color: device.trailColor,
                className: 'trail-path'
            }).addTo(map);
        }
    }
    
    // 清除所有声通标记
    clearAllAcousticMarkers();
}  
// 修改清除轨迹按钮事件
document.getElementById('clear-trail-btn').addEventListener('click', () => {
    clearDeviceTrailPoints(deviceManager.currentDeviceId);
    showMessage("当前设备轨迹和所有声通标记已清除", "success");
});
document.getElementById('clear-trail-btn').addEventListener('click', () => {
    clearDeviceTrailPoints(deviceManager.currentDeviceId);
    showMessage("当前设备轨迹已清除", "success");
});
// #endregion

  //#endregion       


// #region 消息提醒相关逻辑
 // 消息提醒函数
  // 消息提醒函数
            function showMessage(text, type = 'default', duration = 3000) {
                const notification = document.getElementById('message-notification');
                const messageText = document.getElementById('message-text');
                
                // 设置消息内容
                messageText.textContent = text;
                
                // 移除所有类型类，添加新类型
                notification.classList.remove('message-success', 'message-error', 'message-warning');
                notification.classList.add(`message-${type}`);
                notification.classList.add('message-visible');
                
                // 自动隐藏
                clearTimeout(window.messageTimer);
                window.messageTimer = setTimeout(() => {
                    hideMessage();
                }, duration);
            }
            
            // 隐藏消息函数
            function hideMessage() {
                const notification = document.getElementById('message-notification');
                notification.classList.remove('message-visible');
                notification.classList.add('message-hidden');
            }
            // 添加故障码解析函数
// #region 故障显示相关逻辑

// 显示故障信息在任务栏下方
function showFaultDisplay(faults, faultCode) {
    const faultDisplayArea = document.getElementById('fault-display-area');
    const faultContent = document.getElementById('fault-content');
    
  // 构建故障信息HTML
    let faultsHTML = `
        <div class="fault-summary">
            <span class="fault-code-display">故障码: 0x${faultCode.toString(16).toUpperCase().padStart(8, '0')}</span>
            <span class="fault-count">检测到 ${faults.length} 个故障</span>
        </div>
        <ul class="fault-list">
    `;
    
    faults.forEach(fault => {
        faultsHTML += `
            <li class="fault-item">
                <span class="fault-bit">位 ${fault.bit}</span>
                <span class="fault-description">${fault.description}</span>
                <span class="fault-code">${fault.code}</span>
            </li>
        `;
    });
    
    faultsHTML += `</ul>`;
    faultContent.innerHTML = faultsHTML;
    
    // 显示故障区域 - 不再自动隐藏
   
    if(faults.length<1)
        {
           hideFaultDisplay(); 
        }
    else{
         faultDisplayArea.style.display = 'block';
    }
    // console.warn('检测到设备故障:', {
    //     faultCode: `0x${faultCode.toString(16).toUpperCase().padStart(8, '0')}`,
    //     activeFaults: faults
    // });
}

// 隐藏故障显示
function hideFaultDisplay() {
    const faultDisplayArea = document.getElementById('fault-display-area');
    faultDisplayArea.style.display = 'none';
}

// 故障码解析函数
function parseFaultCode(faultCode) {
    const activeFaults = [];
    
    // 检查每一位是否被设置
    for (let i = 1; i <= 32; i++) {
        const bitValue = 1 << (i - 1);
        if (faultCode & bitValue) {
            const faultDescription = FAULT_CODES[i];
            if (faultDescription) {
                activeFaults.push({
                    bit: i,
                    code: `0x${bitValue.toString(16).toUpperCase().padStart(8, '0')}`,
                    description: faultDescription
                });
            }
        }
    }
    

      showFaultDisplay(activeFaults, faultCode);
 
}

// #endregion

            
// #endregion


// #region 登入相关逻辑
// 页面加载时显示用户信息并自动切换设备
document.addEventListener('DOMContentLoaded', () => {
    const userData = localStorage.getItem('user');
    if (userData) {
        const user = JSON.parse(userData);
        document.getElementById('current-user').textContent = user.username;
        
        // 根据用户类型显示提示并自动切换设备
        const hintElement = document.getElementById('hint-text');
        let controlledDeviceId = null;
        
        switch(user.type) {
            case 'auv':
                hintElement.textContent = '当前账号权限：AUV设备控制';
                // 查找该用户控制的AUV设备
                controlledDeviceId = findDeviceByUser(user);
                break;
            case 'sailboat':
                hintElement.textContent = '当前账号权限：帆船设备控制';
                // 查找该用户控制的帆船设备
                controlledDeviceId = findDeviceByUser(user);
                break;
            case 'admin':
                hintElement.textContent = '当前账号权限：管理员（所有设备）';
                // 管理员默认使用第一个设备
                controlledDeviceId = 'auv1';
                break;
            default:
                hintElement.textContent = '当前账号权限：未知';
        }
        
        // 自动切换到对应的设备
        if (controlledDeviceId && deviceManager.devices[controlledDeviceId]) {
            setTimeout(() => {
             autoSwitchToDevice(controlledDeviceId, user);
            deviceManager.setDeviceStatus(controlledDeviceId,'running');
          
           // console.log(deviceManager.devices);
            // 为所有设备创建标记和轨迹线
Object.values(deviceManager.devices).forEach(device => {
     
        
   // console.log(device);
    
    if (device.status === 'running') {
        //   console.log('running',device.type);
        const shipIcon = L.icon({
            iconUrl: device.iconUrl,
            iconSize: [52, 52],
            className: 'ship-icon',
            iconAnchor: [26, 26]
        });
        //  device.marker = L.marker([30.106898, 121.995997], {
        //     icon: shipIcon,
            
        //     rotationAngle: 90,
        //     rotationOrigin: 'center'
        // }).addTo(map);
         if (device.type != 'sailboat'){
        device.marker = L.marker([device.position.lat, device.position.lng], {
            icon: shipIcon,
            
            rotationAngle: 90,
            rotationOrigin: 'center'
        }).addTo(map);
             }
        // 使用设备特定的颜色创建轨迹线
        device.trailPath = L.polyline([], {
            color: device.trailColor, // 使用设备颜色
            weight: 3,
            className: 'trail-path'
        }).addTo(map);
        console.log(device.type === 'sailboat');
        // 如果是帆船设备，创建风标
        if (device.type == 'sailboat') {
            
            console.log('chuangjianfanchuan');
           onSailboatDeviceSelected();
        }
    }
});    
            }, 50);
        }
        
    } else {
        // 未登录则跳转到登录页面
        window.location.href = 'login.html';
    }
});
    // 登出功能
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });

// 根据用户信息查找对应的设备ID
function findDeviceByUser(user) {
    // 如果用户有具体的设备控制权限，使用该设备
    if (user.controlled_device && user.controlled_device !== '*') {
        return user.controlled_device;
    }
    
    // 否则根据用户名推断设备
    const username = user.username.toLowerCase();
    if (username.includes('auv1') || username === 'auv1') return 'auv1';
    if (username.includes('auv2') || username === 'auv2') return 'auv2';
    if (username.includes('auv3') || username === 'auv3') return 'auv3';
    if (username.includes('sail1') || username.includes('sailboat1')) return 'sailboat1';
    if (username.includes('sail2') || username.includes('sailboat2')) return 'sailboat2';
    
    // 默认返回第一个设备
    return 'auv1';
}

// 自动切换到指定设备
function autoSwitchToDevice(deviceId, user) {
    const device = deviceManager.getDevice(deviceId);
    if (!device) return;
    
    // 更新当前设备
    deviceManager.currentDeviceId = deviceId;
    currentDevice = deviceId;
    
    // 更新设备名称显示
    document.getElementById('current-device').textContent = device.name;
    
    // 启动用户对应的设备，停止其他设备
    updateDeviceStatusForUser(deviceId, user);
    
    // 更新状态指示器
    updateDeviceStatusIndicator(deviceId);
    
    // 更新权限提示
    updatePermissionHint(deviceId);
    
    // 将地图中心切换到设备位置
    if (device.position && device.position.lat && device.position.lng) {
        map.setView([device.position.lat, device.position.lng], map.getZoom());
    }
    
    // 更新设备图标显示
   // updateDeviceIconsVisibility(deviceId, user);
    
    console.log(`已自动切换到设备: ${device.name} (${deviceId})`);
}

// // 更新设备图标显示状态
// function updateDeviceIconsVisibility(targetDeviceId, user) {
//     Object.values(deviceManager.devices).forEach(device => {
//         console.log(device.marker);
//         if (device.marker) {
//             if (user.type === 'admin') {
//                 // 管理员可以看到所有设备
//                 device.marker.addTo(map);
//                 if (device.windMarker) {
//                     device.windMarker.addTo(map);
//                 }
//             } else {
//                 // 普通用户只能看到自己控制的设备
//                 if (device.id === targetDeviceId) {
//                     device.marker.addTo(map);
//                     if (device.windMarker) {
//                         device.windMarker.addTo(map);
//                     }
//                 } else {
//                     if (map.hasLayer(device.marker)) {
//                         map.removeLayer(device.marker);
//                     }
//                     if (device.windMarker && map.hasLayer(device.windMarker)) {
//                         map.removeLayer(device.windMarker);
//                     }
//                 }
//             }
//         }
//     });
// }

// 根据用户权限更新设备状态
function updateDeviceStatusForUser(targetDeviceId, user) {
    // 停止所有设备
    Object.keys(deviceManager.devices).forEach(deviceId => {
        const device = deviceManager.getDevice(deviceId);
        if (device) {
            // 更新 deviceManager 中的设备状态
            device.status = 'stopped';
            deviceManager.setDeviceStatus(deviceId, 'stopped');
            
            // 更新全局 deviceStatus
            if (window.deviceStatus && window.deviceStatus[deviceId] !== undefined) {
                window.deviceStatus[deviceId] = 'stopped';
            }
            
            // 更新设备状态显示
            const deviceItem = document.querySelector(`.device-item[data-id="${deviceId}"]`);
            if (deviceItem) {
                const statusIndicator = deviceItem.querySelector('.status-indicator');
                const statusText = deviceItem.querySelector('.status-text');
                if (statusIndicator && statusText) {
                    statusIndicator.className = "status-indicator status-disconnected";
                    statusText.textContent = "已停止";
                }
            }
            
            // 从已启动设备中移除
            if (activeDevices[deviceId]) {
                delete activeDevices[deviceId];
            }
        }
    });
    
    // 启动用户对应的设备
    const targetDevice = deviceManager.getDevice(targetDeviceId);
    if (targetDevice) {
        // 更新 deviceManager 中的设备状态
        targetDevice.status = 'running';
        deviceManager.setDeviceStatus(targetDeviceId, 'running');
        console.log("qiofngss",targetDeviceId);
        // 更新全局 deviceStatus
        if (window.deviceStatus && window.deviceStatus[targetDeviceId] !== undefined) {
            window.deviceStatus[targetDeviceId] = 'running';
        }
        
        // 更新设备状态显示
        const targetDeviceItem = document.querySelector(`.device-item[data-id="${targetDeviceId}"]`);
        if (targetDeviceItem) {
            const statusIndicator = targetDeviceItem.querySelector('.status-indicator');
            const statusText = targetDeviceItem.querySelector('.status-text');
            if (statusIndicator && statusText) {
                statusIndicator.className = "status-indicator status-connected";
                statusText.textContent = "运行中";
            }
        }
        
        // 添加到已启动设备
        activeDevices[targetDeviceId] = {
            name: targetDevice.name,
            type: targetDevice.type,
            status: "running",
            battery: targetDevice.battery || 100
        };
        
        // 如果是管理员，启动所有设备
        if (user.type === 'admin') {
            Object.keys(deviceManager.devices).forEach(deviceId => {
                if (deviceId !== targetDeviceId) {
                    const device = deviceManager.getDevice(deviceId);
                    if (device) {
                        // 更新 deviceManager 中的设备状态
                        device.status = 'running';
                        deviceManager.setDeviceStatus(deviceId, 'running');
                        
                        // 更新全局 deviceStatus
                        if (window.deviceStatus && window.deviceStatus[deviceId] !== undefined) {
                            window.deviceStatus[deviceId] = 'running';
                        }
                        
                        // 更新设备状态显示
                        const deviceItem = document.querySelector(`.device-item[data-id="${deviceId}"]`);
                        if (deviceItem) {
                            const statusIndicator = deviceItem.querySelector('.status-indicator');
                            const statusText = deviceItem.querySelector('.status-text');
                            if (statusIndicator && statusText) {
                                statusIndicator.className = "status-indicator status-connected";
                                statusText.textContent = "运行中";
                            }
                        }
                        
                        // 添加到已启动设备
                        activeDevices[deviceId] = {
                            name: device.name,
                            type: device.type,
                            status: "running",
                            battery: device.battery || 100
                        };
                    }
                }
            });
        }
    }
    
    // 更新已启动设备面板
    updateActiveDevicesPanel();
    
    // 确保设备标记在地图上正确显示
    //updateDeviceMarkersVisibility(targetDeviceId, user);
}
// #endregion
// #endregion
 

// #region 权限控制
// 检查设备控制权限
function checkDevicePermission(deviceId) {
    const user = JSON.parse(localStorage.getItem('user'));
    const currentDevice = deviceManager.getDevice(deviceId);
    // 管理员拥有所有权限

    if (user.type === 'admin') return true;
    
    // 检查用户是否拥有该设备权限
    return user.controlled_device === deviceId || 
           user.controlled_device === '*' || 
           user.controlled_device === currentDevice.type;
}
// 在发送路径数据前检查权限
// main.js

function sendPathDataToServer(pathData) {
    const currentDeviceId = deviceManager.currentDeviceId;
    if (!checkDevicePermission(currentDeviceId)) {
        showMessage("权限不足：您无法控制此设备", "error");
        return false;
    }
    
    // 检查 WebSocket 连接状态
    if (!ws) {
        console.error('❌ WebSocket未初始化');
        showMessage("网络连接未初始化，请刷新页面", "error");
        return false;
    }
    
    if (ws.readyState !== WebSocket.OPEN) {
        console.error('❌ WebSocket未连接');
        showMessage("网络连接已断开，请重新连接", "error");
        
        // 尝试重新连接
        connectToServer();
        return false;
    }
    
    try {
        ws.send(JSON.stringify(pathData));
        console.log('✅ 消息发送成功');
        return true;
    } catch (error) {
        console.error('❌ 消息发送失败:', error);
        showMessage("消息发送失败: " + error.message, "error");
        return false;
    }
}
// 在切换设备时更新权限提示
function updatePermissionHint(deviceId) {
    const hintElement = document.getElementById('hint-text');
    const hasPermission = checkDevicePermission(deviceId);
    console.log("权限提示",hasPermission);
    if (hasPermission) {
        hintElement.innerHTML = `<i class="fas fa-check-circle"></i> 权限：可完全控制此设备`;
        hintElement.style.color = '#2ecc71';
    } else {
        hintElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> 权限：仅可查看此设备`;
        hintElement.style.color = '#ff6b6b';
    }
}

// #endregion

        // #region 帆船模型
        // 在main.js中添加帆船模型管理


// 初始化帆船模型
// #region 帆船初始化模型
// 初始化帆船模型
// 初始化帆船模型
function initSailboatModel() {
    if (sailboatModel) {
        sailboatModel.destroy();
    }
    
    sailboatModel = new SailboatModel(map, {
        width: 100,
        height: 100
    });
    
    // 设置初始位置（示例）
    sailboatModel.setPosition([22.373858, 113.610768]);
    sailboatModel.setAngles(90, 0, 90, 0, 0);//(heading, course, sailAngle, rudderAngle, windDirection
    sailboatModel.setWindSpeed(8);
}

// 在切换到帆船设备时初始化模型
function onSailboatDeviceSelected() {
    console.log('切换到帆船设备，初始化模型');
    const model = initSailboatModel();
    if (model) {
        // 可以在这里设置初始状态
        model.updateState({
            heading: 90,
            course: 90,
            sailAngle: 90,
            rudderAngle: 90,
            windDirection: 90,
            windSpeed: 5
        });
        
        // 初始化地图集成
        const currentDevice = deviceManager.getCurrentDevice();
        if (currentDevice && currentDevice.type === 'sailboat') {
            initSailboatMapIntegration(currentDevice.id);
        }
    }
}
// 在 main.js 的 DOMContentLoaded 事件或其他适当位置添加
document.addEventListener('DOMContentLoaded', function() {
    // 其他初始化代码...
    
    // 添加地图移动监听，确保帆船模型位置正确
    if (map) {
        map.on('move', function() {
            if (sailboatModel && sailboatModel.isAttachedToMap) {
                const device = deviceManager.getCurrentDevice();
                if (device && device.type === 'sailboat' && device.position) {
                    sailboatModel.updateMapPosition(
                        device.position.lat, 
                        device.position.lng, 
                        device.heading
                    );
                }
            }
        });
    }
});
// 更新帆船数据（在接收到帆船设备数据时调用）
function updateSailboatData(deviceData) {
   // if (!sailboatModel) return;
    
    // sailboatModel.updateState({
    //     heading: deviceData.heading || 90,
    //     course: deviceData.course || 0,
    //     sailAngle: deviceData.sailAngle || 0,
    //     rudderAngle: deviceData.rudderAngle || 0,
    //     windDirection: deviceData.windDirection || 0,
    //     windSpeed: deviceData.windSpeed || 1
    // });
    //console.log("shoudao ");
    sailboatModel.setPosition([deviceData.latitude,deviceData.longitude]);//([22.373858, 113.610768]);
    sailboatModel.setAngles(deviceData.yaw, deviceData.course,  deviceData.sailEncoderAngle, deviceData.rudderVertical, deviceData.absoluteWindDirection);//(heading, course, sailAngle, rudderAngle, windDirection
    sailboatModel.setWindSpeed(deviceData.windSpeed);
    //                        //帆船位置位置 
    updateData(
            undefined,
            "sailboat1",
            deviceData.latitude, 
            deviceData.longitude, 
            deviceData.yaw, 
            undefined, 
            undefined,
            deviceData.depth,
            undefined,
            undefined,
            undefined,
            undefined,

        );  
     //     更新帆船推进系统状态UI
    if (window.sailboatThrusterDisplay && window.sailboatThrusterDisplay.update) {
        window.sailboatThrusterDisplay.update(deviceData);
    }
}

// 在切换到帆船设备时初始化模型
function onSailboatDeviceSelected() {
    initSailboatModel();
}
// #endregion


// #region 在设备切换逻辑中调用
deviceManager.onDeviceChange = function(deviceId) {
    const device = deviceManager.getDevice(deviceId);
    
    // 更新权限提示
    updatePermissionHint(deviceId);
    
    // 帆船设备特殊处理
    if (device && device.type === 'sailboat') {
        onSailboatDeviceSelected(); 
        console.log("初始化帆船模型");
    } else {
        // 如果不是帆船设备，隐藏帆船模型容器
        const sailboatContainer = document.getElementById('sailboat-model-container');
        if (sailboatContainer) {
            sailboatContainer.style.display = 'none';
        }
    }
};

// #endregion
  // 初始化仪表盘
        function initDashboard() {
            const bars = document.querySelectorAll('.signal-indicator .bar');
            bars.forEach(bar => {
                bar.style.background = '#3d3d3d';
            });
            
            // 初始化仪表盘数据
            const currentDevice = deviceManager.getCurrentDevice();
            updateDashboard(currentDevice);
        }


                // 清除设备轨迹点
// #region 计时

// 格式化时间为 HH:MM:SS
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
// 将时间字符串转换为毫秒时间戳
function parseTimeToTimestamp(timeStr) {
    // 如果已经是数字格式的时间戳，直接返回
    if (!isNaN(timeStr) && timeStr !== '') {
        return parseInt(timeStr);
    }
    
    // 处理 HH:MM:SS 格式的时间
    if (timeStr.includes(':')) {
        const timeParts = timeStr.split(':');
        if (timeParts.length === 3) {
            const currentDate = new Date();
            const parsedDate = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                currentDate.getDate(),
                parseInt(timeParts[0]),
                parseInt(timeParts[1]),
                parseInt(timeParts[2])
            );
            return parsedDate.getTime();
        }
    }
    
    // 处理其他日期时间格式
    try {
        const parsedDate = new Date(timeStr);
        if (!isNaN(parsedDate.getTime())) {
            return parsedDate.getTime();
        }
    } catch (e) {
        console.warn('无法解析时间字符串:', timeStr, e);
    }
    
    // 默认返回一个很旧的时间戳（确保会被判断为断开连接）
    return Date.now() - 10000;
}

// 更新设备计时器
function updateDeviceTimers(deviceType, isConnected) {
    const timer = window.deviceTimers[deviceType];
    if (!timer) return;
    const now = Date.now();
    // 如果状态发生变化
    if (timer.connected !== isConnected) {
        // 重置计时器
        timer.connected = isConnected;
        timer.lastStatusChange = now;
        timer.currentStatusDuration = 0;
        
      //  console.log(`设备 ${deviceType} 状态改变: ${isConnected ? '连接' : '断开'}`);
    } else {
        // 状态未变化，更新当前状态的持续时间
        timer.currentStatusDuration = now - timer.lastStatusChange;
    }
    
    // 更新UI显示
    updateDeviceTimerDisplay(deviceType);
}   
// 更新设备计时器显示
function updateDeviceTimerDisplay(deviceType) {
    const timer = window.deviceTimers[deviceType];
    if (!timer) return;
    
    const deviceElement = document.getElementById(`${deviceType}-device`);
    if (!deviceElement) return;
    
    const statusTimer = deviceElement.querySelector('.status-timer');
    if (!statusTimer) return;
    
    // 更新计时器显示
    statusTimer.textContent = formatTime(timer.currentStatusDuration);
    
    // 根据状态设置样式
    if (timer.connected) {
        statusTimer.className = 'timer-value status-timer connected';
    } else {
        statusTimer.className = 'timer-value status-timer disconnected';
    }
}
// 添加定时器，每秒更新一次显示
function startDeviceTimerUpdates() {
    setInterval(() => {
        // 更新所有设备的计时器显示
        Object.keys(window.deviceTimers).forEach(deviceType => {
            const timer = window.deviceTimers[deviceType];
            const now = Date.now();
            
            // 更新当前状态的持续时间
            timer.currentStatusDuration = now - timer.lastStatusChange;
            updateDeviceTimerDisplay(deviceType);

        });
    }, 1000);
}
// 重置设备计时器
function resetDeviceTimer(deviceType) {
    const timer = window.deviceTimers[deviceType];
    if (timer) {
        timer.currentStatusDuration = 0;
        timer.lastStatusChange = Date.now();
        updateDeviceTimerDisplay(deviceType);
    }
}
// 获取设备统计信息
function getDeviceStats(deviceType) {
    const timer = window.deviceTimers[deviceType];
    if (!timer) return null;
    
    return {
        deviceType: deviceType,
        isConnected: timer.connected,
        currentStatusDuration: timer.currentStatusDuration,
        formattedCurrentStatusDuration: formatTime(timer.currentStatusDuration),
        statusSince: new Date(timer.lastStatusChange).toLocaleTimeString()
    };
}
// 在页面加载完成后启动计时器更新
document.addEventListener('DOMContentLoaded', function() {
    // 初始化所有设备的计时器显示
    Object.keys(window.deviceTimers).forEach(deviceType => {
        updateDeviceTimerDisplay(deviceType);
    });
    
    // 启动定时更新
    startDeviceTimerUpdates();
    
    console.log('设备计时器系统已启动');
});

// #endregion


// #region 状态机更新
// 更新设备状态显示
function updateDeviceStatuscode(statusCode) {
    const statusMap = {
        0: { text: 'idle', class: 'status-idle' },
        1: { text: 'sink', class: 'status-sink' },
        2: { text: 'mission', class: 'status-mission' },
        3: { text: 'drop', class: 'status-drop' },
        4: { text: 'rise', class: 'status-rise' },
        5: { text: 'return', class: 'status-return' },
        6: { text: 'end', class: 'status-end' },
        7: { text: 'unexpected', class: 'status-unexpected' },
        8: { text: 'gilde', class: 'status-gilde' },
        9: { text: 'pre_sink', class: 'status-pre-sink' }
    };
    
    const statusElement = document.getElementById('state_codes');
    const statusInfo = statusMap[statusCode] || { text: 'unknown', class: 'status-unexpected' };
    
    statusElement.textContent = `${statusInfo.text}`;
    statusElement.className = 'info-value ' + statusInfo.class;
}

// #endregion 
// #region 初始化
document.addEventListener('DOMContentLoaded', function() {
// #region 倒计时
        const timerInput = document.getElementById('timer-input');
        // 初始化时间输入为00:00:00
        timerInput.value = '00:00:00'

 setInterval(connect_device_vedio, 1000);

// 新增：初始化基站标记
initBaseStationMarker();
  // 初始化仪表盘
initDashboard();
//设备上断电初始化
initPowerControl();
//图钉功能初始化
// 模拟故障显示（5秒后显示）
// setTimeout(() => {
//     // 模拟故障码3（二进制11，即位1和位2）
//     parseFaultCode(3);
//     console.log("guzhang");
// }, 5000);

});
// #endregion

// #region IDLE
// IDLE按钮点击事件
//#region IDLE按钮功能

// IDLE按钮点击事件
document.getElementById('idle-btn').addEventListener('click', function() {
    showIdleConfirmation();
});

// 显示IDLE确认对话框
function showIdleConfirmation() {
    // 创建自定义确认对话框
    const confirmationDialog = document.createElement('div');
    confirmationDialog.className = 'idle-confirmation-dialog';
    confirmationDialog.innerHTML = `
        <div class="idle-dialog-overlay"></div>
        <div class="idle-dialog-content">
            <div class="idle-dialog-header">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>确认进入IDLE状态</h3>
            </div>
            <div class="idle-dialog-body">
                <p>确定要结束当前任务吗？设备将：</p>
                <ul>
                    <li>停止所有推进器</li>
                    <li>舵机回归零位</li>
                    <li>进入空闲待命状态</li>
                </ul>
                <div class="idle-dialog-warning">
                    <i class="fas fa-info-circle"></i>
                    此操作无法撤销，请谨慎操作
                </div>
            </div>
            <div class="idle-dialog-footer">
                <button id="confirm-idle" class="idle-confirm-btn">
                    <i class="fas fa-check"></i> 确认IDLE
                </button>
                <button id="cancel-idle" class="idle-cancel-btn">
                    <i class="fas fa-times"></i> 取消
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmationDialog);
    
    // 确认按钮事件
    document.getElementById('confirm-idle').addEventListener('click', function() {
        sendEndMissionCommand();
        document.body.removeChild(confirmationDialog);
    });
    
    // 取消按钮事件
    document.getElementById('cancel-idle').addEventListener('click', function() {
        document.body.removeChild(confirmationDialog);
    });
    
    // 点击遮罩层关闭
    confirmationDialog.querySelector('.idle-dialog-overlay').addEventListener('click', function() {
        document.body.removeChild(confirmationDialog);
    });
}

// 发送结束任务指令
function sendEndMissionCommand() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        // 发送结束任务指令
          sendPathDataToServer({
                     
                      type: 'start-mission',
                      path_mission_state: 'flase'
                });
        
        showMessage("任务已结束，设备进入IDLE状态", "success");
        
        // 停止计时器
        clearTime();
        
        // 更新任务按钮状态
        const assignmentBtn = document.getElementById('assignment-start-btn');
        if (assignmentBtn) {
            assignmentBtn.textContent = '开始任务';
        }
        
        // 更新状态显示
        const stateCodesElement = document.getElementById('state_codes');
        if (stateCodesElement) {
            stateCodesElement.textContent = 'idle';
        }
        
        // 添加视觉反馈 - 按钮闪烁效果
        const idleBtn = document.getElementById('idle-btn');
        idleBtn.classList.add('idle-active');
        setTimeout(() => {
            idleBtn.classList.remove('idle-active');
        }, 2000);
        
    } else {
        showMessage("错误：服务器连接未建立", "error");
        console.log("结束任务发送出错：WebSocket连接不可用");
    }
}

//#endregion
//#endregion

// #endregion
// #region 信号强度
// 更新视频设备连接历史记录
function updateVideoConnectionHistory(isConnected) {
    videoConnectionHistory.push(isConnected);
    if (videoConnectionHistory.length > VIDEO_HISTORY_MAX) {
        videoConnectionHistory.shift();
    }
   // console.log("push",isConnected);
}

// 基于视频设备连接情况计算信号强度
function calculateSignalStrengthFromVideo(DATA) {
   
    deviceManager.updateDeviceData(DATA.deviceId, null, DATA.snr.toFixed(2)*100/33, null);
      // 更新信号强度
    // 更新信号强度 - 基于视频设备连接情况计算
    const calculatedSignal = (DATA.snr*100/33).toFixed(2);
    console.log("sss",DATA.snr);
    document.querySelector('.signal-value').textContent =  'SNR'+DATA.snr ;
    const bars = document.querySelectorAll('.signal-indicator .bar');
    const activeBars = Math.ceil(calculatedSignal / 20);
    
    bars.forEach((bar, index) => {
        if (index < activeBars) {
            if (calculatedSignal < 40) bar.style.background = 'linear-gradient(to top, #ff6b6b, #ff9f9f)';
            else if (calculatedSignal < 70) bar.style.background = 'linear-gradient(to top, #f1c40f, #f9e076)';
            else bar.style.background = 'linear-gradient(to top, #2ecc71, #6ef0ad)';
        } else {
            bar.style.background = '#3d3d3d';
        }
    });
   
}
// 在页面加载完成后初始化视频连接历史记录
document.addEventListener('DOMContentLoaded', function() {
    // 初始化视频连接历史记录为全连接状态
    videoConnectionHistory = Array(VIDEO_HISTORY_MAX).fill(true);
});
// #endregion