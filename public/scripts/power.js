
// 设备数据 - 简化名称以确保紧凑显示
const devices_power = [
    { id: 'DE1', name: '无刷电机' },
    { id: 'DE2', name: '声通24V' },
    { id: 'DE3', name: '舵机信号' },
    { id: 'DE4', name: '多波束' }, // 简化名称
    { id: 'DE5', name: '位移传感器' }, // 简化名称
    { id: 'DE6', name: '声通48V' },
    { id: 'DE7', name: '高度计' },
    { id: 'DE8', name: '推进器' }, // 简化名称
    { id: 'DE9', name: '舵机动力1' },
    { id: 'DE10', name: '应急抛载' },
    { id: 'DE11', name: '惯导' },
    { id: 'DE12', name: '舵机动力2' },
    { id: 'DE13', name: '换向阀3' }, // 简化名称
    { id: 'DE14', name: '换向阀2' }, // 简化名称
    { id: 'DE15', name: '换向阀1' }, // 简化名称
    { id: 'DE16', name: '备用24V' },
    { id: 'DE17', name: '电磁滑阀' },
    { id: 'DE18', name: 'DVL' },
    { id: 'DE19', name: '无线通信' }, // 简化名称
    { id: 'DE20', name: '高性能板' }
];

// 设备状态存储 - 提前初始化
let deviceStates_power = {};

// 初始化设备状态对象
function initializeDeviceStates() {
    devices_power.forEach(device => {
        deviceStates_power[device.id] = false; // 默认所有设备关闭
    });
}

// 在脚本加载时就初始化设备状态
initializeDeviceStates();

// 初始化函数
function initPowerControl() {
    const devicesGrid = document.getElementById('devicesGrid');
    
    // 生成设备网格卡片
    devices_power.forEach(device => {
        const card = document.createElement('div');
        card.className = 'power-device-card';
        card.title = getFullDeviceName(device.id); // 添加完整名称作为提示
        
        card.innerHTML = `
            <div class="device-id">${device.id}</div>
            <div class="device-name">${device.name}</div>
            <div class="device-status">
                <span class="power-status-indicator power-status-off"></span>
                <span>离线</span>
            </div>
            <label class="power-switch">
                <input type="checkbox" id="switch-${device.id}" onchange="toggleDevice('${device.id}')">
                <span class="power-slider"></span>
            </label>
        `;
        
        devicesGrid.appendChild(card);
    });
    
   // updatePowerSummary();
}

// 获取完整设备名称（用于提示）
function getFullDeviceName(deviceId) {
    const fullNames = {
        'DE1': '无刷电机',
        'DE2': '声通24V',
        'DE3': '舵机信号',
        'DE4': '多波束24V及12V',
        'DE5': '拉线位移传感器',
        'DE6': '声通48V',
        'DE7': '高度计',
        'DE8': '推进器（包括信号）',
        'DE9': '舵机动力1',
        'DE10': '应急抛载',
        'DE11': '惯导',
        'DE12': '舵机动力2',
        'DE13': '电磁换向阀3',
        'DE14': '电磁换向阀2',
        'DE15': '电磁换向阀1',
        'DE16': '备用24V',
        'DE17': '电磁滑阀',
        'DE18': 'DVL',
        'DE19': '无线通信舱',
        'DE20': '高性能板'
    };
    
    return fullNames[deviceId] || deviceId;
}

// 切换设备状态
function toggleDevice(deviceId) {
    // const checkbox = document.getElementById(`switch-${deviceId}`);
    // const card = checkbox.closest('.power-device-card');
    // const statusIndicator = card.querySelector('.power-status-indicator');
    // const statusText = card.querySelector('.device-status span:last-child');
    
    //deviceStates_power[deviceId] = checkbox.checked;
    
    // 发送控制指令到服务器
    sendPathDataToServer({
        type: 'power-contorl',
        powerControltpye: deviceId,
        //state: checkbox.checked ? 'on' : 'off'
    });
  //  console.log("deviceId",deviceId);
   // console.log(`设备 ${deviceId} 状态: ${checkbox.checked ? '开启' : '关闭'}`);
    
    // if (checkbox.checked) {
    //     statusIndicator.classList.remove('power-status-off');
    //     statusIndicator.classList.add('power-status-on');
    //     statusText.textContent = '运行中';
    // } else {
    //     statusIndicator.classList.remove('power-status-on');
    //     statusIndicator.classList.add('power-status-off');
    //     statusText.textContent = '离线';
    // }
    
    //updatePowerSummary();
}

// 更新电源摘要信息
function updatePowerSummary() {
    // 计算活跃设备数量
    let activeCount = 0;
    
    devices_power.forEach(device => {
        if (deviceStates_power[device.id]) {
            activeCount++;
        }
    });
    
   // console.log(`当前运行设备: ${activeCount}/20`);
}

// 全部上电
function powerOnAll() {
    devices_power.forEach(device => {
        deviceStates_power[device.id] = true;
        const checkbox = document.getElementById(`switch-${device.id}`);
    
    });
    
   // updatePowerSummary();
    
    //     // if (checkbox) {
        //     checkbox.checked = true;
            
        //     const card = checkbox.closest('.power-device-card');
        //     const statusIndicator = card.querySelector('.power-status-indicator');
        //     const statusText = card.querySelector('.device-status span:last-child');
            
        //     statusIndicator.classList.remove('power-status-off');
        //     statusIndicator.classList.add('power-status-on');
        //     statusText.textContent = '运行中';
        // }发送全部上电指令
    sendPathDataToServer({
        type: 'power-control',
        powerControlType: 'all',
        //state: 'on'
    });
}

// 全部断电
function powerOffAll() {
    devices_power.forEach(device => {
        deviceStates_power[device.id] = false;
        const checkbox = document.getElementById(`switch-${device.id}`);
        // if (checkbox) {
        //     checkbox.checked = false;
            
        //     const card = checkbox.closest('.power-device-card');
        //     const statusIndicator = card.querySelector('.power-status-indicator');
        //     const statusText = card.querySelector('.device-status span:last-child');
            
        //     statusIndicator.classList.remove('power-status-on');
        //     statusIndicator.classList.add('power-status-off');
        //     statusText.textContent = '离线';
        // }
    });
    
   // updatePowerSummary();
    
    // 发送全部断电指令
    sendPathDataToServer({
        type: 'power-control',
        powerControlType: 'all',
      //  state: 'off'
    });
}

// 应用电源设置
function applyPowerSettings() {
    // // 显示成功消息
    //     sendPathDataToServer({
    //     type: 'xbox-control',
    //     leftStickX: 1.00,
    //     leftStickY:1.00,
    //     rightStickX: 1.00,
    //     rightStickY: 1.00
    // });
    // showMessage('电源设置已成功应用！', 'success');
    // closePowerModal();
}

// 打开电源模态框
function openPowerModal() {
    document.getElementById('powerModal').style.display = 'flex';
    console.log("打开电源模态框");
}

// 关闭电源模态框
function closePowerModal() {
    document.getElementById('powerModal').style.display = 'none';
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('powerModal');
    if (event.target === modal) {
        closePowerModal();
    }
};

// 更新设备电源状态显示
function updatePowerStatusFromLoadPower(loadPowerData) {
    if (!loadPowerData) return;
    
    // 确保设备状态对象存在
    if (!deviceStates_power || Object.keys(deviceStates_power).length === 0) {
        console.warn('设备状态对象未初始化，正在重新初始化...');
        initializeDeviceStates();
    }
    
    // 解析负载功率数据
    const { load_Power1, load_Power2, load_Power3 } = loadPowerData;
    //console.log("上电状态:", loadPowerData);
    
    // 将三个功率值合并为一个32位整数（假设每个都是8位）
    const powerStatus = (load_Power1 ) | (load_Power2 << 8) | (load_Power3<< 16);
    
    // 遍历所有设备，根据位状态更新开关
    devices_power.forEach((device, index) => {
        // 设备索引从0开始，对应位0（最低位）
        const bitIndex = index;
        const isPowered = (powerStatus & (1 << bitIndex)) !== 0;
        
        // 更新设备状态
        deviceStates_power[device.id] = isPowered;
        
        // 更新界面元素
        const checkbox = document.getElementById(`switch-${device.id}`);
        if (!checkbox) {
            console.warn(`未找到设备 ${device.id} 的开关元素`);
            return;
        }
        
        const card = checkbox.closest('.power-device-card');
        const statusIndicator = card.querySelector('.power-status-indicator');
        const statusText = card.querySelector('.device-status span:last-child');
        
        if (checkbox && statusIndicator && statusText) {
            // 更新复选框状态（不触发change事件）
            checkbox.checked = isPowered;
            
            // 更新状态指示器
            if (isPowered) {
                statusIndicator.classList.remove('power-status-off');
                statusIndicator.classList.add('power-status-on');
                statusText.textContent = '运行中';
            } else {
                statusIndicator.classList.remove('power-status-on');
                statusIndicator.classList.add('power-status-off');
                statusText.textContent = '离线';
            }
        }
    });
    
    // 更新电源摘要
    updatePowerSummary();
}


// 获取指定设备的上断电状态
function getDevicePowerStatus(deviceId) {
    // 确保设备状态已初始化
    if (!deviceStates_power || Object.keys(deviceStates_power).length === 0) {
        console.warn('设备状态未初始化，正在初始化...');
        initializeDeviceStates();
    }
    
    // 检查设备ID是否存在
    if (!deviceStates_power.hasOwnProperty(deviceId)) {
        console.error(`设备ID ${deviceId} 不存在`);
        return null;
    }
    
    return deviceStates_power[deviceId];
}

// 专门获取应急抛载状态的便捷函数
function getEmergencyLoadStatus() {
    return getDevicePowerStatus('DE10');
}
// 暴露函数以便其他脚本可以调用
window.updatePowerStatusFromLoadPower = {
   update: updatePowerStatusFromLoadPower,
   getEmergencyLoadStatus:getEmergencyLoadStatus,
   getDevicePowerStatus:getDevicePowerStatus
};

// 确保在页面加载完成后初始化
function initializePowerControl() {
    // 如果网格容器存在，则初始化界面
    if (document.getElementById('devicesGrid')) {
        initPowerControl();
    }
}

// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', initializePowerControl);
// } else {
//    // initializePowerControl();
// }