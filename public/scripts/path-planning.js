
//#region 绘制路径相关逻辑


    // 手动路径相关变量
       // const {clearTime} = require('./time');
        //const {startCountdown} = require('./time');
        let isPathDrawing = false;
        let pathPoints = [];
        let pathMarkers = [];
        let pathPolyline = null;
        // 添加测绘相关变量
        let isSurveying = false;
        let surveyPoints = [];
        let surveyRectangle = null;
        let surveyMarkers = [];
        
        // 模态框操作
        const pathModal = document.getElementById('path-modal');
        const pathPlanningBtn = document.getElementById('path-planning-btn');
        const closeModalBtn = document.getElementById('path-close-modal');
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        // DOM元素
        const startPathBtn = document.getElementById('start-path-btn');
        const clearPathBtn = document.getElementById('clear-path-btn');
        
        const surveyclearPathBtn = document.getElementById('survey-clear-btn');
        const sendPathBtn = document.getElementById('send-path-btn');
        
        const surveysendPathBtn = document.getElementById('survey-send-btn');

        const pointCount = document.getElementById('point-count');
        const pathList = document.getElementById('path-list');
        
        const surveypathList = document.getElementById('path-list-survey');

        const pathStatus = document.getElementById('path-status');
        const endDrawingBtn =   document.getElementById('end-drawing-btn');
        const assignmentBtn = document.getElementById('assignment-start-btn');
        const surveyassignmentBtn = document.getElementById('survey-surveyassignment-start-btn');
         // 打开模态框
        pathPlanningBtn.addEventListener('click', () => {
            pathModal.style.display = 'flex';
         
        });
        // 关闭模态框
        closeModalBtn.addEventListener('click', () => {
            pathModal.style.display = 'none';
        });
        
        // 点击模态框外部关闭
        pathModal.addEventListener('click', (e) => {
            if (e.target === pathModal) {
                pathModal.style.display = 'none';
            }
        });              
        // 选项卡切换
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // 移除所有活动状态
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                // 添加当前活动状态
                tab.classList.add('active');
                const tabId = tab.getAttribute('data-tab');
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
         //任务开始
         assignmentBtn.addEventListener('click',()=>{
            let startflag = 0;
            const currentDeviceId = deviceManager.currentDeviceId;
            if(assignmentBtn.textContent == '开始任务'){
                if (ws && ws.readyState === WebSocket.OPEN) {   // 发送路径点数组
 
                    sendPathDataToServer({
                            
                            type: 'start-mission',
                            path_mission_state: 'ture'
                        });
                        showMessage("任务开始","success");
                        pathModal.style.display = 'none'; //关闭弹窗
        
                     startCountdown();
                        assignmentBtn.textContent = '结束任务';
                    }
                else{
                    console.log("开始任务发送出错");
                }
                }
             else if(assignmentBtn.textContent == '结束任务'){
                   sendPathDataToServer({
                     
                      type: 'start-mission',
                      path_mission_state: 'flase'
                });
              showMessage("任务结束","success");

                clearTime();
                
                pathModal.style.display = 'none'; //关闭弹窗
                assignmentBtn.textContent = '开始任务';
                 }
           
          
         });
        // 开始/停止绘制自主规划路径
        startPathBtn.addEventListener('click', () => {
            isPathDrawing = !isPathDrawing;
            if(isPathDrawing){
                pathModal.style.display = 'none'; //关闭弹窗
               // endDrawingBtn.style.display = 'flex'; // 显示结束绘制按钮
            }
            else{
                endDrawingBtn.style.display = 'none'; // 显示结束绘制按钮
            }
            
            
            if (isPathDrawing) {
                startPathBtn.textContent = '停止绘制';
                pathStatus.textContent = '点击地图添加路径点';
                pathStatus.className = 'status-message';
                
                map.off('click', handleMapClick); // 先移除
                 map.on('click', handleMapClick);  // 再绑定
            } else {
                startPathBtn.textContent = '开始绘制路径';
                pathStatus.textContent = '路径绘制已停止';
                pathStatus.className = 'status-message';
                        
                // 计算总距离
                const totalDistance = calculateTotalDistance(pathPoints);
                const formattedDistance = formatDistance(totalDistance);
                
                // 显示消息
                showMessage(`本次路径规划完成，总距离: ${formattedDistance}`, 'success');
                // 移除地图点击事件监听
                map.off('click', handleMapClick);
            }
        });
        endDrawingBtn.addEventListener('click', () => {
            
             startPathBtn.click(); // 直接触发点击
            endDrawingBtn.style.display = 'none'; // 隐藏结束绘制按钮
             pathModal.style.display = 'flex';
            // 结束绘制路径的逻辑...
        });
        // 清除路径
        clearPathBtn.addEventListener('click', () => {
            clearPath();
            showMessage("路径已清除");
            pathStatus.textContent = '路径已清除';
            pathStatus.className = 'status-message';
        });
      
         surveyclearPathBtn.addEventListener('click', () => {
            clearPath();
           // 添加测绘特定清除逻辑
            clearSurveyGraphics();
            surveyPoints = [];
            isSurveying = false;
            
            // 恢复测绘按钮状态
            const surveyBtn = document.getElementById('survey-start-btn');
            surveyBtn.textContent = '开始测绘';
            document.querySelector('.survey-params').style.display = 'none';
            
            showMessage("路径已清除");
            pathStatus.textContent = '路径已清除';
            pathStatus.className = 'status-message';

        });
        surveysendPathBtn.addEventListener('clock',()=>{
            sendPathBtn.click();
        });
        // 发送路径
        surveysendPathBtn.addEventListener('click',()=>{
            sendPathBtn.click();
        });
        sendPathBtn.addEventListener('click', () => {
               startPathBtn.textContent = '开始绘制路径';
              //  startPathBtn.style.background = 'linear-gradient(135deg, #00a8ff, #007bff)';
                pathStatus.textContent = '路径绘制已停止';
                pathStatus.className = 'status-message';
                
                // 移除地图点击事件监听
                map.off('click', handleMapClick);
            //pathModal.style.display = 'none'; //关闭弹窗
            if (pathPoints.length === 0) {
                pathStatus.textContent = '错误：没有路径点可发送';
                pathStatus.className = 'status-message error';
                return;
            }
                 
            const currentDeviceId = deviceManager.currentDeviceId;
            
            const timerInput = document.getElementById('timer-input');
          if(timerInput.value == 0||timerInput.value == '00:00:00'){
                    showMessage("输入任务时间",'error');
                    return 0;
                }
          const parts = timerInput.value.split(':').map(Number);
          totalSeconds = parts[0] * 60 + parts[1] ;
          //console.log(totalSeconds);
           if (ws && ws.readyState === WebSocket.OPEN) {
                // 发送路径点数组
                sendPathDataToServer({
                     
                      type: 'path-data',
                      points: pathPoints.map(point => ({
                            deviceId: currentDeviceId,
                            time:totalSeconds,
                            lat: point.lat,
                            lng: point.lng,
                            depth: point.depth || 0, // 包含深度字段
                            speed: point.speed || 0, // 包含速度字段
                            phi: point.phi || 0, // 包含phi字段
                            mode: point.mode || 0 // 包含模式字段
                        }))
                });
             //   console.log('tim111e',totalSeconds);
                showMessage('路径发送成功');
                pathStatus.textContent = '路径已发送至服务器';
                pathStatus.className = 'status-message success';
            } else {
                pathStatus.textContent = '错误：服务器连接未建立';
                pathStatus.className = 'status-message error';
            }
        });      
        // 地图点击事件处理
        function handleMapClick(e) {
            if (!isPathDrawing) return;
            
          const point = {
                            lat: e.latlng.lat,
                            lng: e.latlng.lng,
                            depth: 0, // 默认深度值
                            speed: 0, // 默认速度值
                            phi: 0, // 默认phi值
                            mode: 0 // 默认模式值
                        };
           
            const pointIndex = pathPoints.length; // 获取当前点的顺序号（1开始） 
            pathPoints.push(point);
            updatePathDisplay(); 
            // 创建标记
            const marker = L.marker(e.latlng, {
                icon: L.divIcon({
                 //   className: 'path-point',
                     html: `
                        <div class="marker-container">
                        <img src="img/marker/marker-icon.png" class="marker-icon" />
                        <span class="marker-number">${pointIndex}</span>
                        </div>
                    `,
                   className: 'custom-marker', // 自定义类名用于样式控制
                    iconSize: [20, 20],
                    iconAnchor: [12, 12]
                })
            }).addTo(map);
           // console.log("进入点击时间");
            pathMarkers.push(marker);
            
            // 更新路径线
            updatePathLine();
        }
        // 更新路径线
        function updatePathLine() {
            // 移除现有路径线
            if (pathPolyline) {
                map.removeLayer(pathPolyline);
                pathPolyline = null; // 释放引用
            }
            
            if (pathPoints.length > 1) {
                // 创建新的路径线
                pathPolyline = L.polyline(pathPoints, {
                    color: '#ff6b6b',
                    dashArray: '5, 10',
                    className: 'path-line'
                }).addTo(map);
            }
        }
        
        // 清除路径
        function clearPath() {
            // 清除所有标记
            
            pathMarkers.forEach(marker => {
                map.removeLayer(marker);
            if (marker.getElement()) {
                 marker.getElement().remove(); // 显式删除DOM元素
                 }
                // 移除所有事件监听器
                marker.off('dragend');
            });
            
            pathMarkers.forEach(marker => map.removeLayer(marker));
            pathMarkers = [];
            
            // 清除路径线
            if (pathPolyline) {
                map.removeLayer(pathPolyline);
                pathPolyline = null;
            }
            
            // 重置数据
            pathPoints = [];
            
            // 更新显示
            updatePathDisplay();
        }
        

// 修改updatePathDisplay函数，确保深度值显示正确
function updatePathDisplay() {
    surveypointcountist.textContent = pathPoints.length;
    pathList.innerHTML = ''; 
    surveypathList.innerHTML = ''; // 清空测绘列表
    pathPoints.forEach((point, index) => {
        const item = document.createElement('div');
        item.className = 'path-item';
        item.innerHTML = `
    <div class="path-index">${index + 1}.</div>
    <div class="path-coords">${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}</div>
    <div class="depth-input">
        <input type="number" class="depth-value" value="${point.depth || 0}" 
               min="0" step="0.1" data-index="${index}">
    </div>
    <div class="speed-input">
        <input type="number" class="speed-value" value="${point.speed || 0}" 
               min="0" step="0.1" data-index="${index}">
    </div>
    <div class="phi-input">
        <input type="number" class="phi-value" value="${point.phi || 0}" 
               min="0" step="0.1" data-index="${index}">
    </div>
    <div class="mode-input">
        <input type="number" class="mode-value" value="${point.mode || 0}" 
               min="0" step="1" data-index="${index}">
    </div>
`;
        pathList.appendChild(item);
        if(isSurveying)
            {
                const surveyItem = item.cloneNode(true);
                surveypathList.appendChild(surveyItem);
            }
        // 添加深度输入框事件监听
        const depthInput = item.querySelector('.depth-value');
        depthInput.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            pathPoints[index].depth = parseFloat(this.value);
        });
        
        // 添加速度输入框事件监听
        const speedInput = item.querySelector('.speed-value');
        speedInput.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            pathPoints[index].speed = parseFloat(this.value);
        });
        
        // 添加phi输入框事件监听
        const phiInput = item.querySelector('.phi-value');
        phiInput.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            pathPoints[index].phi = parseFloat(this.value);
        });
        
        // 添加模式输入框事件监听
        const modeInput = item.querySelector('.mode-value');
        modeInput.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            pathPoints[index].mode = parseFloat(this.value);
        });
    });
    
}   // 清除当前设备轨迹
        document.getElementById('clear-trail-btn').addEventListener('click', () => {
            clearDeviceTrailPoints(deviceManager.currentDeviceId);
            
            // 重新创建轨迹线
            const device = deviceManager.getCurrentDevice();
            if (device.trailPath) {
                map.removeLayer(device.trailPath);
                device.trailPath = L.polyline([], {
                    color: '#00a8ff',
                    className: 'trail-path'
                }).addTo(map);
            }
            
            showMessage("轨迹已清除", "success");
        });

//#region 右键删除功能
 // 右键菜单变量
        const contextMenu = document.getElementById('context-menu');
        const deletePointBtn = document.getElementById('delete-point');
        const addBeforeBtn = document.getElementById('insert-before');
        const addAfterBtn  = document.getElementById('insert-after');
        let isInserting = false;     
        let insertType = '';         
        let currentMarkerIndex = -1; // 当前右键点击的标记点索引

    // 修改：创建路径标记点函数
function createPathMarker(point, index) {
    const marker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({
            html: `
                <div class="marker-container">
                <img src="img/marker/marker-icon.png" class="marker-icon" />
                <span class="marker-number">${index + 1}</span>
                </div>
            `,
            className: 'custom-marker',
            iconSize: [20, 20],
            iconAnchor: [12, 12]
        }),
        draggable: true
    }).addTo(map);

    // 存储索引引用
    marker._index = index;

    // 添加拖动结束事件
    marker.on('dragend', function(e) {
        const newPos = e.target.getLatLng();
        const idx = this._index; // 使用存储的索引
        pathPoints[idx] = { 
            lat: newPos.lat, 
            lng: newPos.lng,
            depth: pathPoints[idx].depth || 0,
            speed: pathPoints[idx].speed || 0,
            phi: pathPoints[idx].phi || 0,
            mode: pathPoints[idx].mode || 0
        };
        updatePathDisplay();
        updatePathLine();
        pathStatus.textContent = `已移动路径点 ${idx + 1}`;
        pathStatus.className = 'status-message';
    });

    // 添加右键点击事件
    marker.on('contextmenu', function(e) {
        e.originalEvent.preventDefault();
        currentMarkerIndex = this._index; // 使用存储的索引
        contextMenu.style.display = 'block';
        contextMenu.style.left = e.originalEvent.pageX + 'px';
        contextMenu.style.top = e.originalEvent.pageY + 'px';
        return false;
    });

    return marker;
}

        // 处理地图点击事件
        function handleMapClick(e) {
            if (!isPathDrawing) return;
            
            const point = { 
                lat: e.latlng.lat, 
                lng: e.latlng.lng,
                depth: 0,
                speed: 0,
                phi: 0,
                mode: 0
            };
            pathPoints.push(point);
            const newMarker = createPathMarker(point, pathPoints.length - 1);
            pathMarkers.push(newMarker);
            
            updatePathDisplay(); 
            updatePathLine();
        }

        // 删除路径点
        function deletePathPoint(index) {
            // 移除地图上的标记
            map.removeLayer(pathMarkers[index]);
            
            // 从数组中移除
            pathPoints.splice(index, 1);
            pathMarkers.splice(index, 1);
            
            // 更新剩余标记的序号
            updateMarkersIndex();
            
            // 更新路径显示
            updatePathDisplay();
            updatePathLine();
            
            // 更新状态消息
            pathStatus.textContent = `已删除路径点 ${index + 1}`;
            pathStatus.className = 'status-message';
        }

        // 更新标记点序号
function updateMarkersIndex() {
    pathMarkers.forEach((marker, index) => {
        // 获取标记的DOM元素
        const el = marker.getElement();
        if (el) {
            // 更新序号
            const numberEl = el.querySelector('.marker-number');
            if (numberEl) {
                numberEl.textContent = index + 1;
            }
        }
        
        // 更新标记的索引引用（重要！）
        marker._index = index;
        
        // 重新绑定右键事件（确保使用正确的索引）
        marker.off('contextmenu');
        marker.on('contextmenu', function(e) {
            e.originalEvent.preventDefault();
            currentMarkerIndex = index; // 使用更新后的索引
            contextMenu.style.display = 'block';
            contextMenu.style.left = e.originalEvent.pageX + 'px';
            contextMenu.style.top = e.originalEvent.pageY + 'px';
            return false;
        });
    });
}
        // 右键菜单事件监听
        deletePointBtn.addEventListener('click', () => {
            if (currentMarkerIndex !== -1) {
                deletePathPoint(currentMarkerIndex);
                contextMenu.style.display = 'none';
                currentMarkerIndex = -1;
            }
        });
        // 新增：在前面插入点
addBeforeBtn.addEventListener('click', () => {
    if (currentMarkerIndex !== -1) {
        isInserting = true;
        insertType = 'before';
        contextMenu.style.display = 'none';
        pathStatus.textContent = '请点击地图添加新点（插入到当前点前）';
        pathStatus.className = 'status-message';
        
        // 移除现有点击监听，添加插入模式监听
        map.off('click', handleMapClick);
        map.on('click', handleInsertClick);
    }
});

// 新增：在后面插入点
addAfterBtn.addEventListener('click', () => {
    if (currentMarkerIndex !== -1) {
        isInserting = true;
        insertType = 'after';
        contextMenu.style.display = 'none';
        pathStatus.textContent = '请点击地图添加新点（插入到当前点后）';
        pathStatus.className = 'status-message';
        
        // 移除现有点击监听，添加插入模式监听
        map.off('click', handleMapClick);
        map.on('click', handleInsertClick);
    }
});

// 新增：处理插入模式的点击
function handleInsertClick(e) {
    if (!isInserting) return;
    
    const point = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        depth: 0,
        speed: 0,
        phi: 0,
        mode: 0
    };
    
    // 确定插入位置
    let insertIndex;
    if (insertType === 'before') {
        insertIndex = currentMarkerIndex;
    } else {
        insertIndex = currentMarkerIndex + 1;
    }
    
    // 插入新点
    pathPoints.splice(insertIndex, 0, point);
    
    // 创建新标记
    const newMarker = createPathMarker(point, insertIndex);
    pathMarkers.splice(insertIndex, 0, newMarker);
    
    // 更新所有后续标记的序号
    updateMarkersIndex();
    
    // 更新显示
    updatePathDisplay();
    updatePathLine();
    
    // 退出插入模式
    isInserting = false;
    insertType = '';
    
    // 恢复正常的点击监听
    map.off('click', handleInsertClick);
    if (isPathDrawing) {
        map.on('click', handleMapClick);
    }
    
    pathStatus.textContent = `已在点 ${currentMarkerIndex + 1} ${insertType === 'before' ? '前' : '后'}插入新点`;
    pathStatus.className = 'status-message';
}

        // 点击页面其他地方隐藏右键菜单
        document.addEventListener('click', (e) => {
            if (contextMenu.style.display === 'block' && 
                !contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
            }
        });
//#endregion
//#region XMl导入

                // XML导入功能
        const fileUploadArea = document.getElementById('file-upload-area');
        const xmlFileInput = document.getElementById('xml-file');
        const browseBtn = document.getElementById('browse-btn');
        const importBtn = document.getElementById('import-btn');
        const xmlPreview = document.getElementById('xml-preview');
        const fileInfo = document.getElementById('file-info');
        
        // 点击浏览按钮触发文件选择
        browseBtn.addEventListener('click', () => {
            xmlFileInput.click();
        });
        
        // 文件选择处理
        xmlFileInput.addEventListener('change', handleFileSelect);
        
        // 拖拽处理
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('drag-over');
        });
        
        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('drag-over');
        });
        
        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('drag-over');
            
            if (e.dataTransfer.files.length) {
                xmlFileInput.files = e.dataTransfer.files;
                handleFileSelect();
            }
        });
        
        // 处理文件选择
            function handleFileSelect() {
                const file = xmlFileInput.files[0];
                if (!file) return;
                
                fileInfo.textContent = `已选择: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const fileContent = e.target.result;
                    xmlPreview.textContent = fileContent;
                    
                    // 启用导入按钮
                    importBtn.disabled = false;
                };
                reader.readAsText(file);
            }
        // 添加TXT解析函数
        function parseTXT(txtContent) {
            const points = [];
            const lines = txtContent.split(/\r?\n/);
            
            // 跳过标题行
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const parts = line.split(',');
                if (parts.length >= 3) {
                    const point = {
                        lat: parseFloat(parts[1]),
                        lng: parseFloat(parts[2]),
                        depth: parts.length >= 4 ? parseFloat(parts[3]) : 0,
                        speed: parts.length >= 5 ? parseFloat(parts[4]) : 0,
                        phi: parts.length >= 6 ? parseFloat(parts[5]) : 0,
                        mode: parts.length >= 7 ? parseFloat(parts[6]) : 0
                    };
                    points.push(point);
                }
            }
            return points;
        }
        // 导入按钮点击事件
       // 修改导入按钮点击事件
importBtn.addEventListener('click', () => {
    const file = xmlFileInput.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const fileContent = e.target.result;
            let points = [];
            
            // 根据文件类型解析
            if (file.name.toLowerCase().endsWith('.txt')) {
                points = parseTXT(fileContent);
            } 
            else if (file.name.toLowerCase().endsWith('.xml')) {
                // 原有XML解析逻辑（这里保持原有模拟数据）
                points = [
                    { lat: 30.1, lng: 121.1, depth: 0, speed: 0, phi: 0, mode: 0 },
                    { lat: 30.2, lng: 121.2, depth: 0, speed: 0, phi: 0, mode: 0 },
                    { lat: 30.3, lng: 121.3, depth: 0, speed: 0, phi: 0, mode: 0 }
                ];
            }
            
            if (points.length === 0) {
                alert('未找到有效路径点数据');
                return;
            }
            
            // 清除现有路径
            clearPath();
            
            // 添加新路径点
            points.forEach((point, index) => {
                pathPoints.push(point);
                
                const marker = createPathMarker(point, index);
                pathMarkers.push(marker);
            });
            
            // 更新路径显示
            updatePathDisplay();
            updatePathLine();
            
            // 显示成功消息
            alert(`成功导入 ${points.length} 个路径点`);
            
            // 关闭模态框
            pathModal.style.display = 'none';
            
        } catch (error) {
            alert('导入失败: ' + error.message);
        }
    };
    reader.readAsText(file);
});
    //#endregion    
  //#endregion              

 // #region 路径信息相关逻辑
  // 轨迹点相关变量
        let trailPoints = []; // 存储所有轨迹点对象（包含标记和数字标签）
        let lastPointTime = 0;
        const pointInterval = 10000; 
        let markerCounter = 0;

        // 全局变量存储当前打开的弹窗和标记计数
        let currentOpenPopup = null;

       // 创建自定义轨迹点图标
            L.TrailIcon = L.Icon.extend({
            options: {
                iconUrl: '/img/marker/marker-icon.svg',
               // html: '<div style="width:8px;height:8px;background:red;border-radius:50%;box-shadow:0 0 8px rgba(0,168,255,0.8);"></div>',
                closeOnClick: false,//阻止
                iconSize: [30, 30],
                
                popupAnchor: [0, 0]  //打开坐标锚点
            }
            }); 
            // 创建带数字的标签图层
            function createNumberLabel(number, lat, lng) {
            // 创建数字标签的HTML元素
            const label = L.divIcon({
                className: 'marker-number-label',
                html: `<div class="number-badge" >${number}</div>`,
                color:origin,
                background:origin,
                iconSize: [20, 20],
                iconAnchor: [30, 10] // 调整数字相对于标记的位置
            });

            // 创建标签标记并添加到地图
            return L.marker([lat, lng], {
                icon: label,
                zIndexOffset: 1000 // 确保数字显示在标记上方
            }).addTo(map);
            }
        // 创建轨迹点
         // 创建轨迹点
        function createTrailPoint(device, data) {

            // 增加标记计数器（每次创建新标记时+1）
            
            device.markerCounter++;
            const currentNumber = device.markerCounter;
            // 2. 创建地图标记
            const trailMarker = L.marker([data.lat, data.lng], {
            icon: new L.TrailIcon()
            }).addTo(map);
        // 创建并关联数字标签 
        const numberLabel = createNumberLabel(device.markerCounter, data.lat, data.lng, device.trailColor);
            // 存储轨迹点对象（包含标记和数字标签）
            const trailPoint = {
                marker: trailMarker,
                color: device.trailColor , // 使用设备特定的颜色
                numberLabel: numberLabel,
                data: data
            };
            
            // 3. 生成详情内容（带数据验证）
            const safeData = {
            deviceName: device.name,
            timestamp: data.timestamp || '未知',
            lng: data.lng ? data.lng.toFixed(6) : '未知',
            lat: data.lat ? data.lat.toFixed(6) : '未知',
            depth: data.depth || '未知',
            heading: data.heading || '未知',
            speed: data.speed || '未知'
            };

    // 4. 构建HTML内容（添加调试标识）
    const detailContent = `
      <div class="trail-point-content" data-id="${data.id || 'unknown'}">
        <div class="point-header">
          <div class="point-title">${safeData.deviceName} - 轨迹点详情</div>
        </div>
        <div class="point-data">
          <div class="data-row">
            <span class="data-label">时间:</span>
            <span class="data-value">${safeData.timestamp}</span>
          </div>
          <div class="data-row">
            <span class="data-label">序号:</span>
            <span class="data-value">${currentNumber}</span>
          </div>
          <div class="data-row">
            <span class="data-label">经度:</span>
            <span class="data-value">${safeData.lng}</span>
          </div>
          <div class="data-row">
            <span class="data-label">纬度:</span>
            <span class="data-value">${safeData.lat}</span>
          </div>
          <div class="data-row">
            <span class="data-label">深度:</span>
            <span class="data-value">${safeData.depth} m</span>
          </div>
         <div class="data-row">
            <span class="data-label">高度:</span>
            <span class="data-value">${safeData.depth} m</span>
          </div>
          <div class="data-row">
            <span class="data-label">航向:</span>
            <span class="data-value">${safeData.heading}°</span>
          </div>
          <div class="data-row">
            <span class="data-label">速度:</span>
            <span class="data-value">${safeData.speed} kn</span>
          </div>
        </div>
      </div>
    `;

   
    trailMarker.bindPopup(detailContent, {
      className: 'trail-popup',
      maxWidth: 300
    });
  // 关闭按钮事件
    trailMarker.on('popupopen', function() {
      const popup = this.getPopup();
      const closeBtn = popup.getElement().querySelector('.point-close');
      
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.closePopup();
        });
      }
    });



        device.trailPoints.push(trailPoint);
         return trailPoint;



        }
        
        
        // 创建带数字的标签图层 - 添加颜色参数
function createNumberLabel(number, lat, lng, color = '#00a8ff') {
    const label = L.divIcon({
        className: 'marker-number-label',
        html: `<div class="number-badge" style="background-color: ${color}">${number}</div>`,
        iconSize: [20, 20],
        iconAnchor: [30, 10]
    });

    return L.marker([lat, lng], {
        icon: label,
        zIndexOffset: 1000
    }).addTo(map);
}
      // 清除所有轨迹点（修改后）
function clearTrailPoints() {
    // 遍历所有轨迹点，移除标记和数字标签
    trailPoints.forEach(point => {
        if (point.marker) {
            map.removeLayer(point.marker);
        }
        if (point.numberLabel) {
            map.removeLayer(point.numberLabel);
        }
    });
    
    // 重置相关变量
    trailPoints = [];
    lastPointTime = 0;
    markerCounter = 0; // 重置计数器
}
// 保存路径按钮点击事件
document.getElementById('save-path-btn').addEventListener('click', () => {
    if (pathPoints.length === 0) {
        pathStatus.textContent = '错误：没有路径点可保存';
        pathStatus.className = 'status-message error';
        return;
    }
    
    // 格式化路径数据为TXT内容
    let txtContent = "序号,纬度,经度,深度(米),速度,phi,模式\n"; // 表头
    pathPoints.forEach((point, index) => {
        txtContent += `${index + 1},${point.lat.toFixed(6)},${point.lng.toFixed(6)},${point.depth || 0},${point.speed || 0},${point.phi || 0},${point.mode || 0}\n`;
    });
    
    // 创建Blob对象并触发下载
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `路径规划_${new Date().toLocaleString().replace(/[/: ]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
    
    pathStatus.textContent = '路径已保存为TXT文件';
    pathStatus.className = 'status-message success';
});        

      
// #endregion

// #region 测绘

        const surveypointcountist = document.getElementById('survey-point-count');


// 开始测绘按钮事件
document.getElementById('survey-start-btn').addEventListener('click', () => {
    isSurveying = !isSurveying;
    const surveyBtn = document.getElementById('survey-start-btn');
    if (isSurveying) {
        // 进入测绘模式
        surveyPoints = [];
        surveyBtn.innerText = '停止测绘';
        document.querySelector('.survey-params').style.display = 'block';
        pathStatus.textContent = '点击地图确定矩形区域的两个对角点';
        showMessage('点击地图确定矩形区域的两个对角点');
        pathStatus.className = 'status-message';
        
        // 关闭模态框
        pathModal.style.display = 'none';
        // 移除其他事件监听器
        map.off('click', handleMapClick);
        
        // 添加测绘点击事件
        map.on('click', handleSurveyClick);
    } else {
        // 退出测绘模式
        surveyBtn.textContent = '开始测绘';
        document.querySelector('.survey-params').style.display = 'none';
        pathStatus.textContent = '测绘已取消';
        showMessage('测绘已取消');
        pathStatus.className = 'status-message';
        
        // 清除测绘图形
        clearSurveyGraphics();
        map.off('click', handleSurveyClick);
    }
});

// 测绘点击处理
function handleSurveyClick(e) {
    if (!isSurveying) return;
    
    const point = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
    };
    
    surveyPoints.push(point);
    
    // 创建临时标记
    const marker = L.marker(e.latlng, {
        icon: L.divIcon({
            className: 'survey-marker',
            html: `<div class="survey-point">${surveyPoints.length}</div>`,
            iconSize: [20, 20]
        })
    }).addTo(map);
    surveyMarkers.push(marker);
    
    if (surveyPoints.length === 2) {
        // 绘制矩形
        drawSurveyRectangle();
        pathStatus.textContent = '矩形区域已确定，设置参数后点击"生成路径点"';
    } else if (surveyPoints.length > 2) {
        // 重置测绘
        clearSurveyGraphics();
        surveyPoints = [point];
        
        // 重新创建标记
        surveyMarkers = [];
        const newMarker = L.marker(e.latlng, {
            icon: L.divIcon({
                className: 'survey-marker',
                html: `<div class="survey-point">1</div>`,
                iconSize: [20, 20]
            })
        }).addTo(map);
        surveyMarkers.push(newMarker);
    }
}

// 绘制测绘矩形
function drawSurveyRectangle() {
    if (surveyRectangle) {
        map.removeLayer(surveyRectangle);
    }
    
    surveyRectangle = L.rectangle([
        [surveyPoints[0].lat, surveyPoints[0].lng],
        [surveyPoints[1].lat, surveyPoints[1].lng]
    ], {
        color: '#00a8ff',
        weight: 2,
        fillOpacity: 0.1
    }).addTo(map);
}

// 清除测绘图形
function clearSurveyGraphics() {
    if (surveyRectangle) {
        map.removeLayer(surveyRectangle);
        surveyRectangle = null;
    }
    
    surveyMarkers.forEach(marker => map.removeLayer(marker));
    surveyMarkers = [];
}

// 生成路径点按钮事件
document.getElementById('generate-points-btn').addEventListener('click', () => {
    if (surveyPoints.length !== 2) {
        pathStatus.textContent = '错误：需要先确定矩形区域';
        pathStatus.className = 'status-message error';
        return;
    }
    
    const widthSpacing = parseFloat(document.getElementById('width-spacing').value) || 10;
    const lengthSpacing = parseFloat(document.getElementById('length-spacing').value) || 10;
    const direction = document.getElementById('direction-select').value;
    const startCorner = document.getElementById('start-corner-select').value;
    // 计算矩形边界
    const minLat = Math.min(surveyPoints[0].lat, surveyPoints[1].lat);
    const maxLat = Math.max(surveyPoints[0].lat, surveyPoints[1].lat);
    const minLng = Math.min(surveyPoints[0].lng, surveyPoints[1].lng);
    const maxLng = Math.max(surveyPoints[0].lng, surveyPoints[1].lng);
        // 根据选择的起点位置调整点的顺序
    const adjustedPoints = adjustPointsByStartCorner(surveyPoints[0], surveyPoints[1], startCorner);
    
    // 计算网格点
    const gridPoints = calculateGridPoints(minLat, maxLat, minLng, maxLng, widthSpacing, lengthSpacing, direction, startCorner);
    
    // 添加到路径点
    gridPoints.forEach(point => {
        pathPoints.push({
            lat: point.lat,
            lng: point.lng,
            depth: 0,
            speed: 0,
            phi: 0,
            mode: 0
        });
        const marker = createPathMarker(point, pathPoints.length - 1);
        pathMarkers.push(marker);
    });

    // 更新显示
    updatePathDisplay();
    updatePathLine();
    
    // 重置测绘
    clearSurveyGraphics();
    document.querySelector('.survey-params').style.display = 'none';
    isSurveying = false;
    map.off('click', handleSurveyClick);
    
    pathStatus.textContent = `成功生成 ${gridPoints.length} 个路径点`;
    pathStatus.className = 'status-message success';
});
// 根据起点位置调整矩形边界
function adjustPointsByStartCorner(point1, point2, startCorner) {
    const minLat = Math.min(point1.lat, point2.lat);
    const maxLat = Math.max(point1.lat, point2.lat);
    const minLng = Math.min(point1.lng, point2.lng);
    const maxLng = Math.max(point1.lng, point2.lng);
    
    // 根据选择的起点位置返回调整后的坐标
    switch(startCorner) {
        case 'top-left':
            return { minLat, maxLat, minLng, maxLng, startLat: maxLat, startLng: minLng };
        case 'top-right':
            return { minLat, maxLat, minLng, maxLng, startLat: maxLat, startLng: maxLng };
        case 'bottom-left':
            return { minLat, maxLat, minLng, maxLng, startLat: minLat, startLng: minLng };
        case 'bottom-right':
            return { minLat, maxLat, minLng, maxLng, startLat: minLat, startLng: maxLng };
        default:
            return { minLat, maxLat, minLng, maxLng, startLat: maxLat, startLng: minLng };
    }
}

// 计算网格点
function calculateGridPoints(minLat, maxLat, minLng, maxLng, widthSpacing, lengthSpacing, direction,startCorner) {
    const points = [];
    
    // 计算网格大小（以米为单位）
    const widthInMeters = haversineDistance(minLat, minLng, minLat, maxLng);
    const lengthInMeters = haversineDistance(minLat, minLng, maxLat, minLng);
    
    // 计算步数
    let widthSteps = Math.floor(widthInMeters / widthSpacing);
    let lengthSteps = Math.floor(lengthInMeters / lengthSpacing);
    
    // 计算经纬度增量
    let latStep = (maxLat - minLat) / lengthSteps;
    let lngStep = (maxLng - minLng) / widthSteps;
    // 根据起点位置调整生成顺序
    let startLat, startLng, latDir, lngDir;
    
    switch(startCorner) {
        case 'top-left':
            startLat = maxLat;
            startLng = minLng;
            latDir = -1; // 向下
            lngDir = 1;  // 向右
            break;
        case 'top-right':
            startLat = maxLat;
            startLng = maxLng;
            latDir = -1; // 向下
            lngDir = -1; // 向左
            break;
        case 'bottom-left':
            startLat = minLat;
            startLng = minLng;
            latDir = 1;  // 向上
            lngDir = 1;  // 向右
            break;
        case 'bottom-right':
            startLat = minLat;
            startLng = maxLng;
            latDir = 1;  // 向上
            lngDir = -1; // 向左
            break;
        default:
            startLat = maxLat;
            startLng = minLng;
            latDir = -1;
            lngDir = 1;
    } 
    if (direction === 'horizontal') {
        // 横向扫描 - Z字形
       
        lngStep = (maxLng - minLng);
        widthSteps = 1;
        for (let i = 0; i <= lengthSteps; i++) {
            const lat = startLat + (i * latStep * latDir);
            const currentRow = [];
            
            // 生成当前行的所有点
            for (let j = 0; j <= widthSteps; j++) {
                const lng = startLng + (j * lngStep * lngDir);
                currentRow.push({ lat, lng });
            }
            
            // 偶数行保持方向，奇数行反转
            if (i % 2 === 1) {
                currentRow.reverse();
            }
            
            points.push(...currentRow);
        }
    } else {
         latStep = (maxLat - minLat);
         lengthSteps = 1;
        // 纵向扫描 - Z字形
        for (let j = 0; j <= widthSteps; j++) {
            const lng = startLng + (j * lngStep * lngDir);
            const currentCol = [];
            
            // 生成当前列的所有点
            for (let i = 0; i <= lengthSteps; i++) {
                const lat = startLat + (i * latStep * latDir);
                currentCol.push({ lat, lng });
            }
            
            // 偶数列保持方向，奇数列反转
            if (j % 2 === 1) {
                currentCol.reverse();
            }
            
            points.push(...currentCol);
        }
    }
    
    return points;
}

// 计算两点间距离（米）
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // 地球半径（米）
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2 - lat1) * Math.PI/180;
    const Δλ = (lon2 - lon1) * Math.PI/180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
}

// #endregion
// #region 计算距离
// 计算路径总距离（米）
function calculateTotalDistance(points) {
    if (points.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
        const prevPoint = points[i - 1];
        const currPoint = points[i];
        totalDistance += haversineDistance(
            prevPoint.lat, prevPoint.lng,
            currPoint.lat, currPoint.lng
        );
    }
    return totalDistance;
}

// 格式化距离显示
function formatDistance(distance) {
    if (distance < 1000) {
        return distance.toFixed(2) + ' 米';
    } else {
        return (distance / 1000).toFixed(2) + ' 公里';
    }
}

// #endregion
// #region 应用到所有
  // 应用到所有点
     // 应用到所有路径点
        function applyToAll(param) {
            if (pathPoints.length === 0) {
                showMessage('错误：没有路径点可应用', 'error');
                return;
            }
            
            // 获取第一行的值
            const firstValue = parseFloat(document.querySelector(`.${param}-value`).value);
            console.log(firstValue);
            if (isNaN(firstValue)) {
                showMessage(`错误：请输入有效的${param}数值`, 'error');
                return;
            }
            
            // 更新所有路径点
            pathPoints.forEach(point => {
                point[param] = firstValue;
            });
            
            // 更新显示
            updatePathDisplay();
            
            showMessage(`已将第一行的${param}值应用到所有路径点`, 'success');
        }

// #endregion
// #region 北斗下发
//#region 北斗下发功能

// 北斗下发相关DOM元素
const beidouSendBtn = document.getElementById('beidou-send-btn');
const beidouSendControls = document.getElementById('beidou-send-controls');
const beidouSendMode = document.getElementById('beidou-send-mode');
const beidouReceiverId = document.getElementById('beidou-receiver-id');
const confirmBeidouSend = document.getElementById('confirm-beidou-send');
const cancelBeidouSend = document.getElementById('cancel-beidou-send');

// 北斗下发按钮点击事件
beidouSendBtn.addEventListener('click', () => {
    if (pathPoints.length === 0) {
        pathStatus.textContent = '错误：没有路径点可下发';
        pathStatus.className = 'status-message error';
        return;
    }
    
    // 显示北斗下发控制区域
    beidouSendControls.style.display = 'block';
    pathStatus.textContent = '请选择下发模式和设置北斗接收ID';
    pathStatus.className = 'status-message';
});

// 确认北斗下发
confirmBeidouSend.addEventListener('click', () => {
    let mode = 1;
    if(beidouSendMode.value == 'virtual-anchor')mode = 0;
    console.log(beidouSendMode.value);
    const receiverId = beidouReceiverId.value.trim();
    
    if (!receiverId) {
        pathStatus.textContent = '错误：请输入北斗接收ID';mo
        pathStatus.className = 'status-message error';
        return;
    }
    
  
    
    // 发送北斗下发数据
    if (ws && ws.readyState === WebSocket.OPEN) {
        sendPathDataToServer({
            type: 'beidou-send',
            beidousendmode: mode,
            beidousendreceiverId: receiverId,
            beidousendpoints: pathPoints.map(point => ({
                lat: point.lat,
                lng: point.lng,
            })),
          
        });
        console.log("sss", pathPoints.map(point => ({
                lat: point.lat,
                lng: point.lng,
            })),
          );
        showMessage(`北斗${mode == 1 ? '任务下发' : '虚拟锚泊'}指令已发送`, 'success');
        pathStatus.textContent = `北斗${mode === 'mission' ? '任务下发' : '虚拟锚泊'}指令已发送`;
        pathStatus.className = 'status-message success';
        
        // 隐藏控制区域
        beidouSendControls.style.display = 'none';
    } else {
        pathStatus.textContent = '错误：服务器连接未建立';
        pathStatus.className = 'status-message error';
    }
});

// 取消北斗下发
cancelBeidouSend.addEventListener('click', () => {
    beidouSendControls.style.display = 'none';
    pathStatus.textContent = '北斗下发已取消';
    pathStatus.className = 'status-message';
});

//#endregion

// #endregion

