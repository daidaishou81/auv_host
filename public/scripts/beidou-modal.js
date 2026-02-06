// 北斗数据模态框控制逻辑
document.addEventListener('DOMContentLoaded', function() {
    // 获取元素
    const beidouDevice = document.getElementById('beidou-device');
    const beidouModal = document.getElementById('beidou-modal');
    const closeModalBtn = beidouModal.querySelector('.close-modal');
    const refreshBtn = document.getElementById('beidou-refresh-btn');
    const exportBtn = document.getElementById('beidou-export-btn');
    
    // 存储北斗数据
    let beidouData = {
        receiveTime: null,
        deviceId: '未知',
        // 解析后的数据字段
        Beidou_pos_x: 0,
        Beidou_pos_y: 0,
        Beidou_auv_e_code: 0,
        Beidou_current_state: 0,
        Beidou_depth: 0,
        Beidou_altitude: 0,
        Beidou_battery_soc: 0,
        Beidou_gps_lat: 0,
        Beidou_gps_lon: 0,
        rawData: '等待数据...'
    };
    
    // 打开模态框
    beidouDevice.addEventListener('click', function() {
        beidouModal.style.display = 'block';
        updateBeidouDisplay();
    });
    
    // 关闭模态框
    closeModalBtn.addEventListener('click', function() {
        beidouModal.style.display = 'none';
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === beidouModal) {
            beidouModal.style.display = 'none';
        }
    });
    
    // 刷新按钮点击事件
    refreshBtn.addEventListener('click', function() {
        // 发送请求获取最新北斗数据
        requestBeidouData();
    });
    
    // 导出按钮点击事件
    exportBtn.addEventListener('click', function() {
        exportBeidouData();
    });
    
    // 更新北斗数据显示
    function updateBeidouDisplay() {
        document.getElementById('beidou-receive-time').textContent = 
            beidouData.receiveTime ? beidouData.receiveTime.toLocaleTimeString() : '--:--:--';
        document.getElementById('beidou-device-id').textContent = beidouData.deviceId;
        // 显示解析后的数据
        document.getElementById('beidou-pos-x').textContent = beidouData.Beidou_pos_x;
        document.getElementById('beidou-pos-y').textContent = beidouData.Beidou_pos_y;
        document.getElementById('beidou-error-code').textContent = beidouData.Beidou_auv_e_code;
        document.getElementById('beidou-current-state').textContent = beidouData.Beidou_current_state;
        document.getElementById('beidou-depth').textContent = beidouData.Beidou_depth + '米';
        document.getElementById('beidou-altitude').textContent = beidouData.Beidou_altitude + '米';
        document.getElementById('beidou-battery').textContent = beidouData.Beidou_battery_soc + '%';
        document.getElementById('beidou-longitude').textContent = beidouData.Beidou_gps_lon.toFixed(6);
        document.getElementById('beidou-latitude').textContent = beidouData.Beidou_gps_lat.toFixed(6);
        document.getElementById('beidou-raw-data').textContent = beidouData.rawData;
    }
    
    // 请求北斗数据
    function requestBeidouData() {
        // 在实际应用中，这里应该发送请求到服务器获取北斗数据
        console.log('请求北斗数据...');
        
        // 模拟从服务器获取数据
        setTimeout(() => {
            // 模拟数据更新
          
            
            // 更新显示
            updateBeidouDisplay();
            
            // 显示成功消息
            showMessage('北斗数据已更新', 'success');
        }, 1000);
    }
    
    // 导出北斗数据
    function exportBeidouData() {
        const dataStr = JSON.stringify(beidouData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `beidou_data_${new Date().toISOString().replace(/:/g, '-')}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        showMessage('北斗数据已导出', 'success');
    }
    
    // 从WebSocket接收北斗数据
    function handleBeidouData(data) {
        if (data.type === 'beidou') {
            beidouData.receiveTime = new Date();
            // 更新解析后的数据字段
            beidouData.Beidou_pos_x = data.Beidou_pos_x || 0;
            beidouData.Beidou_pos_y = data.Beidou_pos_y || 0;
            beidouData.Beidou_auv_e_code = data.Beidou_auv_e_code || 0;
            beidouData.Beidou_current_state = data.Beidou_current_state || 0;
            beidouData.Beidou_depth = data.Beidou_depth || 0;
            beidouData.Beidou_altitude = data.Beidou_altitude || 0;
            beidouData.Beidou_battery_soc = data.Beidou_battery_soc || 0;
            beidouData.Beidou_gps_lat = data.Beidou_gps_lat || 0;
            beidouData.Beidou_gps_lon = data.Beidou_gps_lon || 0;
            beidouData.rawData = data.rawData || '无原始数据';
            
            // 如果模态框是打开的，更新显示
            if (beidouModal.style.display === 'block') {
                updateBeidouDisplay();
            }
        }
    }
    
    // 暴露函数以便其他脚本可以调用
    window.beidouModal = {
        handleBeidouData: handleBeidouData
    };
});