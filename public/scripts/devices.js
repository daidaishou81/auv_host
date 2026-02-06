// #region 设备定义
// #region 设备定义 - 添加轨迹颜色属性
// 预设一组轨迹颜色
const trailColors = [ '#2ecc71', '#f1c40f', '#00a8aa','#9b59b6', '#e67e22', '#e74c3c', '#1abc9c'];


// 设备信息
const devicePresets = {
    'auv1': { 
        name: 'AUV-01', 
        type: 'auv',
        trailColor: trailColors[0], // 分配颜色
        iconUrl: 'img/auv/auv-icon-red.svg '// 自定义图标
    },
    'auv2': { 
        name: 'AUV-02', 
        type: 'auv',
        trailColor: trailColors[1], // 分配颜色
        iconUrl: 'img/auv/auv-icon-pink.svg' // 自定义图标
    },
    'auv3': { 
        name: 'AUV-03', 
        type: 'auv',
        trailColor: trailColors[2], // 分配颜色
        iconUrl: 'img/auv/auv-icon-yellow.svg' // 自定义图标
    },
    'sailboat1': { 
        name: 'Sailboat-01', 
        type: 'sailboat',
        trailColor: trailColors[3], // 分配颜色
        iconUrl: 'img/sailboat/sailboat-icon.svg' ,// 自定义图标
    },
    'sailboat2': { 
        name: 'Sailboat-02', 
        type: 'sailboat',
        trailColor: trailColors[4], // 分配颜色
       iconUrl: 'img/sailboat/sailboat-icon-pink.svg' // 自定义图标
    }
};
// #endregion
       // 设备状态管理
        window.deviceStatus = {
            'auv1': 'stopped',
            'auv2': 'stopped',
            'auv3': 'stopped',
            'sailboat1': 'stopped',
            'sailboat2': 'stopped'
        };
        
        // 设备信息
        const devices = {
            'auv1': { name: 'AUV-01', type: 'auv' },
            'auv2': { name: 'AUV-02', type: 'auv' },
            'auv3': { name: 'AUV-03', type: 'auv' },
            'sailboat1': { name: 'Sailboat-01', type: 'sailboat' },
            'sailboat2': { name: 'Sailboat-02', type: 'sailboat' }
        };
        
    
        // 创建基站标记
        let baseStationMarker = null;

        function initBaseStationMarker() {
            // 使用自定义图标
            const baseStationIcon = L.icon({
                iconUrl: '/img/BaseStation/base-station-icon.png',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            
            // 初始位置设为地图中心
            baseStationMarker = L.marker([22.373858, 113.610768], {
                icon: baseStationIcon
            }).addTo(map);
            
            // 添加经纬度标签
            //  baseStationMarker.bindPopup("基站位置").openPopup();
        }
    // #endregion 

 // #region 设备管理器
        class DeviceManager {
            constructor() {
                    this.devices = {};
                    this.currentDeviceId = 'auv1';
                     this.trailColors = ['#9b59b6','#00a8aa', '#2ecc71', '#f1c40f', '#e67e22'];
                    
                }

                addDevice(id, name, type, status = 'stopped') {
                     const colorIndex = Object.keys(this.devices).length % this.trailColors.length;
                    this.devices[id] = {
                        id,
                        name,
                        type,
                        status,
                        trailColor: devicePresets[id]?.trailColor || trailColors[Object.keys(this.devices).length % trailColors.length],
                       
                        iconUrl: devicePresets[id]?.iconUrl || 'img/ship-icon.png', // 使用自定义图标
                        position: { lat: 22.373936  , lng:113.610863 },
                        heading: 0,
                        speed: 0,
                        signal: 0,
                        depth: 0,
                        trailPath: null,
                        trailPoints: [], // 每个设备维护自己的轨迹点
                        lastPointTime: 0,
                        markerCounter: 0, // 每个设备有自己的计数器
                        marker: null,
                        pathPolyline: null,
                        pathMarkers: []
                    };
                }


            getDevice(id) {
                return this.devices[id];
            }

            getCurrentDevice() {
                return this.devices[this.currentDeviceId];
            }

            switchDevice(id) {
                if (this.devices[id]) {
                    this.currentDeviceId = id;
                    return true;
                }
                return false;
            }

            updateDevicePosition(id, lat, lng, heading) {
                const device = this.getDevice(id);
                if (device) {
                    device.position.lat = lat;
                    device.position.lng = lng;
                    device.heading = heading;
                }
            }

            updateDeviceData(id, speed, signal, depth) {
                const device = this.getDevice(id);
                if (device) {
                    device.speed = speed;
                    device.signal = signal;
                    device.depth = depth;
                }
              
            }

            setDeviceStatus(id, status) {
                const device = this.getDevice(id);
                if (device) {
                    device.status = status;
                }
            }
        }

        // 初始化设备管理器
        const deviceManager = new DeviceManager();
        deviceManager.addDevice('auv1', 'AUV-01 水下探测器', 'auv', 'stopped');
        deviceManager.addDevice('auv2', 'AUV-02 水下探测器', 'auv', 'stopped');
        deviceManager.addDevice('auv3', 'AUV-03 水下探测器', 'auv', 'stopped');
        deviceManager.addDevice('sailboat1', 'Sailboat-01 帆船', 'sailboat', 'stopped');
        deviceManager.addDevice('sailboat2', 'Sailboat-02 帆船', 'sailboat', 'stopped');
        // #endregion

// #region 设备切换相关逻辑
// 设备切换相关变量
let currentDevice = "auv1";
let selectedDevice = null;
let activeDevices = {
     "auv1": { 
        name: "AUV-01", 
        type: "auv", 
        status: "running",
        battery: 100              // 新增电池电量
    },
     "auv2": { 
        name: "AUV-02", 
        type: "auv", 
        status: "stopped",
        battery: 100              // 新增电池电量
    }, "auv3": { 
        name: "AUV-03", 
        type: "auv", 
        status: "stopped",
        battery: 100              // 新增电池电量
    }, "sailboat1": { 
        name: "Sailboat-01", 
        type: "sailboat", 
        status: "stopped",
        battery: 100              // 新增电池电量
    }, "sailboat2": { 
        name: "Sailboat-02", 
        type: "sailboat", 
        status: "stopped",
        battery: 100              // 新增电池电量
    },
};
let contextMenuDevice = null;
// #region 大状态显示
// 设备状态管理

// 更新设备状态指示器 中间大的
        // 更新设备状态指示器
        function updateDeviceStatusIndicator(deviceId) {
            const indicator = document.getElementById('device-status-indicator-1');
            const device = deviceManager.getDevice(deviceId);
            if (!device) return;

            // 移除所有状态类
            indicator.classList.remove('status-running', 'status-stopped', 'status-warning');
            
            // 添加当前状态类
            switch(device.status) {
                case "running":
                    indicator.classList.add('status-running');
                    break;
                case "stopped":
                    indicator.classList.add('status-stopped');
                    break;
                case "warning":
                    indicator.classList.add('status-warning');
                    break;
            }
        }
        // 设备切换
        function switchDevice(deviceId) {
            if (deviceManager.switchDevice(deviceId)) {
                const device = deviceManager.getDevice(deviceId);
                
                // 更新设备名称
                document.getElementById('current-device').textContent = device.name;
                
                // 更新状态指示器
                updateDeviceStatusIndicator(deviceId);
                
                // 将地图中心切换到设备位置
                map.setView([device.position.lat, device.position.lng], map.getZoom());
                
                // 显示消息
                showMessage(`已切换到设备: ${device.name}`, 'success');
                
                return true;
            }
            return false;
        }
// 设备右键菜单操作
function startDevice(deviceId) {
    deviceStatus[deviceId] = "running";
    updateDeviceStatusIndicator(deviceId);
    showMessage(`设备已启动`, 'success');
}

function stopDevice(deviceId) {
    deviceStatus[deviceId] = "stopped";
    updateDeviceStatusIndicator(deviceId);
    showMessage(`设备已停止`, 'warning');
}

// 初始化设备状态
document.addEventListener('DOMContentLoaded', function() {
    // 设置初始设备状态
    updateDeviceStatusIndicator('auv1');
});

// 设备模态框关闭
// #endregion
document.querySelector('#device-modal .close-modal').addEventListener('click', () => {
    document.getElementById('device-modal').style.display = 'none';
});
// 设备切换按钮事件 弹出选择窗口
document.getElementById('device-switch-btn').addEventListener('click', () => {
    document.getElementById('device-modal').style.display = 'flex';
});

// 设备模态框外部关闭
document.getElementById('device-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('device-modal')) {
        document.getElementById('device-modal').style.display = 'none';
    }
});

// 设备选项卡切换
document.querySelectorAll('#device-modal .tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // 移除所有活动状态
        document.querySelectorAll('#device-modal .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#device-modal .tab-content').forEach(c => c.classList.remove('active'));
        
        // 添加当前活动状态
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});

// 设备选择
document.querySelectorAll('.device-item').forEach(item => {
    item.addEventListener('click', () => {
        // 移除之前的选择
        document.querySelectorAll('.device-item').forEach(i => i.classList.remove('selected'));
        
        // 设置新选择
        item.classList.add('selected');
        selectedDevice = item.getAttribute('data-id');
    });
    
    // 右键菜单
    item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        contextMenuDevice = item.getAttribute('data-id');
        
        const contextMenu = document.getElementById('device-context-menu');
        contextMenu.style.display = 'block';
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';
    });
});
let selectedDeviceType = null;
let selectedDeviceName = null;
 // 设备切换功能
        document.addEventListener('DOMContentLoaded', function() {
            // 设备切换按钮
            const deviceSwitchBtn = document.getElementById('device-switch-btn');
            const deviceModal = document.getElementById('device-modal');
            const closeModalBtn = document.querySelector('.close-modal');
            const confirmDeviceBtn = document.getElementById('confirm-device');
            const currentDeviceDisplay = document.getElementById('current-device');
            
            // 设备列表
            const deviceItems = document.querySelectorAll('.device-item');
            
            // 当前选中的设备
            let selectedDevice = null;
            
            // 打开设备模态框
            deviceSwitchBtn.addEventListener('click', () => {
                deviceModal.style.display = 'flex';
            });
            
            // 关闭设备模态框
            closeModalBtn.addEventListener('click', () => {
                deviceModal.style.display = 'none';
            });
            
            // 点击模态框外部关闭
            deviceModal.addEventListener('click', (e) => {
                if (e.target === deviceModal) {
                    deviceModal.style.display = 'none';
                }
            });
            
            // 选择设备
            deviceItems.forEach(item => {
                item.addEventListener('click', () => {
                    // 移除之前的选择
                    deviceItems.forEach(i => i.classList.remove('selected'));
                    
                    // 设置新选择
                    item.classList.add('selected');
                    selectedDevice = item;
                });
            });
            
            // 确认设备选择
            confirmDeviceBtn.addEventListener('click', () => {
                if (selectedDevice) {
                    const deviceName = selectedDevice.querySelector('.device-name').textContent;
                    const deviceId = selectedDevice.getAttribute('data-id');
                    const deviceType = selectedDevice.getAttribute('data-type');
                    // 添加切换动画
                    currentDeviceDisplay.classList.add('device-switch-animation');
                      // 检查权限
                    const hasPermission = checkDevicePermission(deviceId);
                    
                
                     // 更新设备显示名称
                    setTimeout(() => {
                        currentDeviceDisplay.textContent = deviceName;
                        currentDeviceDisplay.classList.remove('device-switch-animation');
                          // 更新状态指示器
                         updatePermissionHint(deviceId);
                         switchDevice(deviceId);
                        // 显示成功消息
                        showMessage(`已切换到设备: ${deviceName}`, 'success');
                    }, 500);
                    
                    // 关闭模态框
                    deviceModal.style.display = 'none';
                    
                    // 发送设备信息到服务器
                    if (window.ws && ws.readyState === WebSocket.OPEN) {
                        
                        ws.send(JSON.stringify({
                            type: 'device-change',
                            deviceId: deviceId,
                            deviceType: deviceType,
                            deviceName: deviceName
                        }));
                    }

                } else {
                    showMessage('请先选择一个设备', 'error');
                }
            });
            
            // 刷新设备状态
            document.getElementById('refresh-devices').addEventListener('click', () => {
                showMessage('设备状态已刷新', 'success');
                // 在实际应用中，这里应该请求服务器获取最新设备状态
            });
            
            // 模拟设备粒子效果
            function initParticles() {
                const particlesContainer = document.getElementById('particles-container');
                const particleCount = 20;
                
                for (let i = 0; i < particleCount; i++) {
                    const particle = document.createElement('div');
                    particle.className = 'particle';
                    
                    // 随机位置
                    const left = Math.random() * 100;
                    const top = Math.random() * 100;
                    particle.style.left = `${left}%`;
                    particle.style.top = `${top}%`;
                    
                    // 随机大小
                    const size = Math.random() * 2 + 1;
                    particle.style.width = `${size}px`;
                    particle.style.height = `${size}px`;
                    
                    // 随机动画延迟
                    const delay = Math.random() * 5;
                    particle.style.animationDelay = `${delay}s`;
                    
                    particlesContainer.appendChild(particle);
                }
            }
            
            // 初始化粒子效果
            initParticles();
        });

// 右键菜单功能 启动设备
document.getElementById('start-device').addEventListener('click', () => {
    if (contextMenuDevice) {
        // 添加到已启动设备
        const deviceName = document.querySelector(`.device-item[data-id="${contextMenuDevice}"] .device-name`).textContent;
        const deviceType = document.querySelector(`.device-item[data-id="${contextMenuDevice}"]`).getAttribute('data-type');
        

        activeDevices[contextMenuDevice] = {
            name: deviceName,
            type: deviceType,
            status: "running",
            battery: 100              // 初始化电池电量
        };
        // 更新设备状态显示
        document.querySelector(`.device-item[data-id="${contextMenuDevice}"] .status-indicator`).className = "status-indicator status-connected";
        document.querySelector(`.device-item[data-id="${contextMenuDevice}"] .status-text`).textContent = "运行中";
        deviceStatus[deviceName] = "running";
        updateDeviceStatusIndicator(deviceName);
        // 更新已启动设备列表
        updateActiveDevicesPanel();
        
        showMessage(`已启动设备: ${deviceName}`, 'success');
    }
    document.getElementById('device-context-menu').style.display = 'none';
});
//右键删除设备
document.getElementById('stop-device').addEventListener('click', () => {
    if (contextMenuDevice) {
        // 从已启动设备中移除
        const deviceName = document.querySelector(`.device-item[data-id="${contextMenuDevice}"] .device-name`).textContent;
        
        if (activeDevices[contextMenuDevice]) {
            delete activeDevices[contextMenuDevice];
        }
        
        // 更新设备状态显示
        document.querySelector(`.device-item[data-id="${contextMenuDevice}"] .status-indicator`).className = "status-indicator status-disconnected";
        document.querySelector(`.device-item[data-id="${contextMenuDevice}"] .status-text`).textContent = "已停止";
        
        deviceStatus[deviceName] = "stopped";
        updateDeviceStatusIndicator(deviceName);
        // 更新已启动设备列表
        updateActiveDevicesPanel();
        
        showMessage(`已停止设备: ${deviceName}`, 'warning');
    }
    document.getElementById('device-context-menu').style.display = 'none';
});

document.getElementById('restart-device').addEventListener('click', () => {
    if (contextMenuDevice) {
        const deviceName = document.querySelector(`.device-item[data-id="${contextMenuDevice}"] .device-name`).textContent;
        showMessage(`正在重启设备: ${deviceName}`, 'success');
       
        // 模拟重启过程
        setTimeout(() => {
            showMessage(`设备重启完成: ${deviceName}`, 'success');
        }, 2000);
         document.getElementById('start-device').click();
    }
    document.getElementById('device-context-menu').style.display = 'none';
});

// 关闭右键菜单
document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-marker-context-menu')) {
        document.getElementById('device-context-menu').style.display = 'none';
    }
});

// 更新已启动设备面板
// 更新已启动设备面板
function updateActiveDevicesPanel() {
    // const activeDevicesList = document.getElementById('active-devices-panel');
    // activeDevicesList.innerHTML = '';
    
    // if (Object.keys(activeDevices).length === 0) {
    //     activeDevicesList.style.display = 'none';
    //     return;
    // }
    
    // activeDevicesList.style.display = 'block';
    
    // for (const deviceId in activeDevices) {
    //     const device = activeDevices[deviceId];
    //     if(device.status == "running")
    // {
    //     const deviceItem = document.createElement('div');
    //     deviceItem.className = 'active-device-item';
        
    //     let icon = '🤖';
    //     if (device.type === 'sailboat') icon = '⛵';
        
    //     let batteryClass = 'battery-high';
    //     if (device.battery < 30) batteryClass = 'battery-low';
    //     else if (device.battery < 70) batteryClass = 'battery-medium';
        
    //     deviceItem.innerHTML = `
    //         <span>${device.name}</span>
    //         <div class="device-status-info">
    //             <div class="device-status-row">
    //                 <span class="status-label">北斗:</span>
    //                 <span class="status-value">${device.battery}</span>
    //             </div>
    //             <div class="device-status-row">
    //                 <span class="status-label">声通:</span>
    //                 <span class="status-value">${device.battery}</span>
    //             </div>
    //             <div class="device-status-row">
    //                 <span class="status-label">图传:</span>
    //                 <span class="status-value">${device.battery}</span>
    //             </div>
    //             <div class="device-status-row">
    //                 <span class="status-label">电量:</span>
    //                 <span class="status-value ${batteryClass}">${device.battery}%</span>
    //             </div>
    //         </div>
    //     `;
        
    //     activeDevicesList.appendChild(deviceItem);
    //         }
    // }
}

// 设备切换相关变量





// 确认设备选择
document.getElementById('confirm-device').addEventListener('click', () => {
    if (selectedDevice) {
        // 更新当前设备
        currentDevice = selectedDevice;
        

    } else {
        showMessage('请先选择一个设备', 'error');
    }
});


 
// 初始化已启动设备面板
updateActiveDevicesPanel();
// #endregion
