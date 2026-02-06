// 获取最新声通数据
function getLatestAcousticData() {
    return window.latestAcousticData;

}

// 格式化声通数据用于显示
function formatAcousticData(data) {
    if (!data) return "暂无数据";
    
    let result = "<div class='data-section'>";
    result += `<h4>帧类型: ${data.type || '未知'}</h4>`;
    console.log(data);
    if (data.timestamp) {
        result += `<p><strong>时间戳:</strong> ${JSON.stringify(data.acoustic_timestamp)}</p>`;
    }
    
    if (data.acoustic_auvId !== undefined) {
        result += `<p><strong>AUV ID:</strong> ${data.acoustic_auvId}</p>`;
    }
    
    if (data.usvId !== undefined) {
        result += `<p><strong>USV ID:</strong> ${data.acoustic_usvId}</p>`;
    }
    
    if (data.acoustic_latitude !== undefined) {
        result += `<p><strong>纬度:</strong> ${data.acoustic_latitude.toFixed(6)}</p>`;
    }
    
    if (data.acoustic_longitude !== undefined) {
        result += `<p><strong>经度:</strong> ${data.acoustic_longitude.toFixed(6)}</p>`;
    }
    
    if (data.acoustic_depth !== undefined) {
        result += `<p><strong>深度:</strong> ${data.acoustic_depth} 米</p>`;
    }
    
    if (data.acoustic_velocity !== undefined) {
        result += `<p><strong>速度:</strong> ${data.acoustic_velocity} 节</p>`;
    }
    
    if (data.acoustic_heading !== undefined) {
        result += `<p><strong>航向:</strong> ${data.acoustic_heading}°</p>`;
    }
    
    if (data.acoustic_status !== undefined) {
        result += `<p><strong>状态:</strong> ${data.acoustic_status}</p>`;
    }
    
    if (data.acoustic_errorCode !== undefined) {
        result += `<p><strong>错误码:</strong> ${data.acoustic_errorCode}</p>`;
    }
    
    if (data.acoustic_altitude !== undefined) {
        result += `<p><strong>高度:</strong> ${data.acoustic_altitude} 米</p>`;
    }
    
    if (data.acoustic_battery !== undefined) {
        result += `<p><strong>电池电量:</strong> ${data.acoustic_battery}%</p>`;
    }
    

    
    result += "</div>";
    return result;
}

// 显示声通数据模态框
function showAcousticModal(data) {
    const modal = document.getElementById('acoustic-modal');
    const rawDataElement = document.getElementById('acoustic-raw-data');
    const parsedDataElement = document.getElementById('acoustic-parsed-data');
    
    // 显示原始数据
    rawDataElement.textContent = data ? JSON.stringify(data, null, 2) : "暂无数据";
    
    // 显示格式化后的解析数据
    parsedDataElement.innerHTML = formatAcousticData(data);
    
    modal.style.display = 'block';
}

// 声通设备点击事件
document.getElementById('acoustic-device').addEventListener('click', () => {
    // 获取最近接收到的声通数据
    const acousticData = getLatestAcousticData();
    
    // 显示模态框并解析数据
    showAcousticModal(acousticData);
});

// 关闭模态框事件
document.querySelector('#acoustic-modal .close-modal').addEventListener('click', () => {
    document.getElementById('acoustic-modal').style.display = 'none';
});

// 点击模态框外部关闭
document.getElementById('acoustic-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('acoustic-modal')) {
        document.getElementById('acoustic-modal').style.display = 'none';
    }
});