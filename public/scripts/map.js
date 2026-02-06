 // #region 初始化地图相关逻辑
        const map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            maxZoom: 20// 添加这一行
        }).setView([22.373936, 113.610863], 20);
        //29.487778, 119.216843  新安江
        //30.108997, 121.991936   水库
        //22.373858, 113.610768  珠海
        L.tileLayer('tiles/GoogleWXtiles/{z}/{x}/{y}.png', {
            minZoom: 1,
            maxNativeZoom: 20,  // 瓦片实际最大级别: 20,  
            maxZoom: 24,        // 图层支持的最大级别（包括过度缩放）
            tileSize: 256,
            tileSize: 256,
            detectRetina: true,
        }).addTo(map);
    const originalUpdate = L.Marker.prototype._update;  
        // 扩展Marker以支持旋转
        L.Marker.include({
            setRotationAngle: function(angle) {
                this.options.rotationAngle = angle;
                this.update();
                return this;
            },
            setRotationOrigin: function(origin) {
                this.options.rotationOrigin = origin;
                this.update();
                return this;
            }
            
        });
        // 在初始化地图后添加比例尺控件
        const scaleControl = L.control.scale({
            position: 'topright',
            
            imperial: false, // 不使用英制单位
            metric: true,    // 使用公制单位
            maxWidth: 200,
            updateWhenIdle: false
        }).addTo(map);

        // 添加自定义样式以匹配系统主题
        setTimeout(() => {
            const scaleElement = document.querySelector('.leaflet-control-scale');
            if (scaleElement) {
                scaleElement.style.background = 'rgba(10, 25, 41, 0.7)';
                scaleElement.style.border = '1px solid rgba(0, 167, 255, 0.3)';
                scaleElement.style.color = '#fff';
                scaleElement.style.fontSize = '10px';
                scaleElement.style.padding = '2px 4px';
                scaleElement.style.borderRadius = '4px';
                scaleElement.style.backdropFilter = 'blur(4px)';
                 scaleElement.style.right = '0px'; /* 确保右对齐 */
                 scaleElement.style.top = '0px'; /* 确保上对齐 */
            }
        }, 100);
   
        //图钉功能初始化
        window.initPinManager(map);
        // #endregion

 // #region 任务栏初始化
    // 添加按钮交互效果

        document.querySelectorAll('.task-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // 移除所有按钮的active类
                document.querySelectorAll('.task-btn').forEach(b => {
                    b.classList.remove('active');
                });
                
                // 为当前点击的按钮添加active类
                this.classList.add('active');
                
                // 如果是模式切换按钮，切换模式
                if (this.classList.contains('mode-btn')) {
                    const isManual = this.classList.contains('manual');
                    this.classList.toggle('manual', !isManual);
                    this.classList.toggle('auto', isManual);
                    const currentDeviceId = deviceManager.currentDeviceId;
                    const modeText = this.querySelector('span');
                    const icon = this.querySelector('i');
                    
                    const mode = isManual ? 'auto' : 'manual';
                    
                    if (ws && ws.readyState === WebSocket.OPEN) {
                       
                       const message = {
                            
                            deviceId: currentDeviceId,
                            type: 'control-mode',
                            mode: mode
                        };
                       if(sendPathDataToServer(message)== false)return 0;
                            
                        console.log(message);
                    }
                    console.log(`控制模式切换为: ${mode}`);
                    if (isManual) {
                        modeText.textContent = '自动模式';
                        icon.className = 'fas fa-robot';
                        xboxstop();

                    } else {
                        modeText.textContent = '手动模式';
                        icon.className = 'fas fa-cogs';
                        xboxstart();
                    }
                    showMessage(`控制模式切换为: ${mode}`,"success");
                }
            });
        });

      
 
        // 添加扫描动画
        const taskBar = document.querySelector('.top-task-bar');
        let scanTimeout;
        
        function startScanAnimation() {
            taskBar.style.animation = 'none';
            setTimeout(() => {
                taskBar.style.animation = '';
            }, 10);
            
            clearTimeout(scanTimeout);
            scanTimeout = setTimeout(startScanAnimation, 8000);
        }
        
       // startScanAnimation();
     
        // #endregion
// #region 
// #region 测距功能
// 测距功能变量
let measuring = false;
let startPoint = null;
let endPoint = null;
let distanceLine = null;
let distanceMarker = null;

// 创建测距按钮
function createMeasureControl() {
    const measureControl = L.Control.extend({
        options: {
            position: 'topright'
        },
        
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom measure-control');
            container.innerHTML = '<i class="fas fa-ruler"></i>';
            container.title = '测距工具';
            
            // 添加样式
            container.style.backgroundColor = 'rgba(10, 25, 41, 0.7)';
            container.style.border = '1px solid rgba(0, 167, 255, 0.3)';
            container.style.color = '#fff';
            container.style.padding = '5px';
            container.style.borderRadius = '4px';
            container.style.cursor = 'pointer';
            container.style.display = 'absolute';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.width = '30px';
            container.style.height = '30px';
            container.style.right = '10px'; // 宽度30px + 间距10px
            container.style.top = '0px';
            
            container.onclick = function() {
                toggleMeasure();
            };
         
                    // 防止地图点击事件被触发
            L.DomEvent.disableClickPropagation(container);
            
            return container;
        }
    });
    
    // 添加测距控件到地图
    map.addControl(new measureControl());
    
    // 创建结果显示容器
    const resultContainer = L.DomUtil.create('div', 'measure-result-container');
    resultContainer.style.position = 'absolute';
    resultContainer.style.top = '80px';
    resultContainer.style.right = '10px';
    resultContainer.style.backgroundColor = 'rgba(10, 25, 41, 0.85)';
    resultContainer.style.border = '1px solid rgba(0, 167, 255, 0.3)';
    resultContainer.style.borderRadius = '4px';
    resultContainer.style.padding = '10px';
    resultContainer.style.color = '#fff';
    resultContainer.style.zIndex = '1000';
    resultContainer.style.display = 'none';
    resultContainer.style.backdropFilter = 'blur(4px)';
    resultContainer.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px; display: flex; align-items: center;">
            <i class="fas fa-ruler" style="margin-right: 5px;"></i> 测距结果
        </div>
        <div id="measure-result" style="margin-bottom: 10px;">请选择两个点进行测距</div>
        <button id="clear-measure" style="background: #ff6b6b; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; width: 100%;">
            清除
        </button>
    `;
    
    document.body.appendChild(resultContainer);
    
    // 清除测距结果
    document.getElementById('clear-measure').addEventListener('click', function() {
        clearMeasure();
        resultContainer.style.display = 'none';
    });
}

// 切换测距模式  
function toggleMeasure() {
    measuring = !measuring;
    
    if (measuring) {
        // 进入测距模式
        
        map.off('click', handleMapClick);
   
        map.on('click', onMapClickMeasure);
        map.getContainer().style.cursor = 'crosshair';
        document.querySelector('.measure-control').style.backgroundColor = 'rgba(0, 167, 255, 0.5)';
        
        // 显示结果容器
        document.querySelector('.measure-result-container').style.display = 'block';
    } else {
        // 退出测距模式
        map.off('click', onMapClickMeasure);
        map.getContainer().style.cursor = '';
        document.querySelector('.measure-control').style.backgroundColor = 'rgba(10, 25, 41, 0.7)';
    }
}

// 地图点击事件处理
function onMapClickMeasure(e) {
    if (!measuring) return;
     
    if (!startPoint) {
        // 选择第一个点
        startPoint = e.latlng;
        const startMarker = L.marker(startPoint, {
            icon: L.divIcon({
                className: 'measure-marker',
                html: '<div style="background-color: #2ecc71; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            }),
            draggable: true  // 添加可拖动属性
        }).addTo(map);
        
        // 添加拖动事件
        startMarker.on('drag', function(event) {
            startPoint = event.target.getLatLng();
            updateMeasurements();
        });
        
    } else if (!endPoint) {
        // 选择第二个点并计算距离
        endPoint = e.latlng;
        const endMarker = L.marker(endPoint, {
            icon: L.divIcon({
                className: 'measure-marker',
                html: '<div style="background-color: #ff6b6b; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            }),
            draggable: true  // 添加可拖动属性
        }).addTo(map);
        
        // 添加拖动事件
        endMarker.on('drag', function(event) {
            endPoint = event.target.getLatLng();
            updateMeasurements();
        });
        
        // 绘制连接线
        distanceLine = L.polyline([startPoint, endPoint], {
            color: '#00a7ff',
            weight: 2,
            dashArray: '5, 5'
        }).addTo(map);
        
        // 更新测量结果
        updateMeasurements();
        
        // 退出测距模式
        measuring = false;
        map.off('click', onMapClickMeasure);
        if (isPathDrawing) {
            map.on('click', handleMapClick);
        }
        map.getContainer().style.cursor = '';
        document.querySelector('.measure-control').style.backgroundColor = 'rgba(10, 25, 41, 0.7)';
    }
}

// 计算中点
function calculateMidPoint(latlng1, latlng2) {
    return L.latLng(
        (latlng1.lat + latlng2.lat) / 2,
        (latlng1.lng + latlng2.lng) / 2
    );
}

// 格式化距离显示
function formatDistance(distance) {
    if (distance < 1000) {
        return distance.toFixed(2) + ' 米';
    } else {
        return (distance / 1000).toFixed(2) + ' 公里';
    }
}

// 清除测距结果
function clearMeasure() {
    // 清除标记和线条
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker && layer.options.icon && 
            (layer.options.icon.options.className === 'measure-marker' || 
             layer.options.icon.options.className === 'distance-label')) {
            map.removeLayer(layer);
        } else if (layer instanceof L.Polyline && layer.options.dashArray === '5, 5') {
            map.removeLayer(layer);
        }
    });
    
    // 重置变量
    startPoint = null;
    endPoint = null;
    distanceLine = null;
    distanceMarker = null;
    measuring = false;
    
    // 确保事件监听被移除  
      map.off('click', onMapClickMeasure);
        if (isPathDrawing) {
            map.on('click', handleMapClick);
        }
    map.getContainer().style.cursor = '';
    document.querySelector('.measure-control').style.backgroundColor = 'rgba(10, 25, 41, 0.7)';
}
// 新增函数：更新测量结果
function updateMeasurements() {
    // 移除旧的连接线和距离标签
    if (distanceLine) map.removeLayer(distanceLine);
    if (distanceMarker) map.removeLayer(distanceMarker);
    
    // 绘制新的连接线
    distanceLine = L.polyline([startPoint, endPoint], {
        color: '#00a7ff',
        weight: 2,
        dashArray: '5, 5'
    }).addTo(map);
    
    // 计算距离
    const distance = map.distance(startPoint, endPoint);
    
    // 显示距离
    const midPoint = calculateMidPoint(startPoint, endPoint);
    distanceMarker = L.marker(midPoint, {
        icon: L.divIcon({
            className: 'distance-label',
            html: `<div style="background-color: rgba(10, 25, 41, 0.8); color: white; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(0, 167, 255, 0.5); white-space: nowrap;">
                ${formatDistance(distance)}
            </div>`,
            iconSize: [100, 30],
            iconAnchor: [50, 15]
        }),
        zIndexOffset: 1000
    }).addTo(map);
    
    // 更新结果显示
    document.getElementById('measure-result').innerHTML = `
        <div>距离: ${formatDistance(distance)}</div>
        <div style="font-size: 12px; color: #ccc;">
            起点: ${startPoint.lat.toFixed(6)}, ${startPoint.lng.toFixed(6)}<br>
            终点: ${endPoint.lat.toFixed(6)}, ${endPoint.lng.toFixed(6)}
        </div>
    `;
}
// 初始化测距功能
createMeasureControl();
// #endregion

// #endregion