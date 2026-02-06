
// 帆船推进系统状态显示逻辑
document.addEventListener('DOMContentLoaded', function() {
    // 确保帆船推进系统显示区域存在
    const sailboatThrusterDisplay = document.getElementById('sailboat-thruster-display');
    if (!sailboatThrusterDisplay) {
        // 如果不存在，创建并添加到推进系统面板中
        const thrusterPanel = document.getElementById('thruster-panel');
        if (thrusterPanel) {
            const displayElement = document.createElement('div');
            displayElement.id = 'sailboat-thruster-display';
            displayElement.className = 'thruster-container';
            displayElement.style.display = 'none'; // 默认隐藏，只在帆船设备时显示
            
            // 添加帆船推进系统状态的结构
            displayElement.innerHTML = `
                <div class="thruster-header">帆船推进系统状态</div>
                <div class="thruster-container-sailboat">
                    <div class="sailboat-data-row">
                        <div class="sailboat-data-item">
                            <div class="sailboat-data-label">
                                <span class="thruster-status-indicator status-normal"></span>
                                航向 (Heading)
                            </div>
                            <div class="sailboat-data-value" id="sailboat-heading">0°</div>
                        </div>
                        <div class="sailboat-data-item">
                            <div class="sailboat-data-label">
                                <span class="thruster-status-indicator status-normal"></span>
                                航线角 (Course)
                            </div>
                            <div class="sailboat-data-value" id="sailboat-course">0°</div>
                        </div>
                    </div>
                    <div class="sailboat-data-row">
                        <div class="sailboat-data-item">
                            <div class="sailboat-data-label">
                                <span class="thruster-status-indicator status-normal"></span>
                                帆角 (Sail Angle)
                            </div>
                            <div class="sailboat-data-value" id="sailboat-sail-angle">0°</div>
                        </div>
                        <div class="sailboat-data-item">
                            <div class="sailboat-data-label">
                                <span class="thruster-status-indicator status-normal"></span>
                                舵角 (Rudder Angle)
                            </div>
                            <div class="sailboat-data-value" id="sailboat-rudder-angle">0°</div>
                        </div>
                    </div>
                    <div class="sailboat-data-row">
                        <div class="sailboat-data-item">
                            <div class="sailboat-data-label">
                                <span class="thruster-status-indicator status-normal"></span>
                                风向 (Wind Direction)
                            </div>
                            <div class="sailboat-data-value" id="sailboat-wind-direction">0°</div>
                        </div>
                        <div class="sailboat-data-item">
                            <div class="sailboat-data-label">
                                <span class="thruster-status-indicator status-normal"></span>
                                风速 (Wind Speed)
                            </div>
                            <div class="sailboat-data-value" id="sailboat-wind-speed">0 节</div>
                        </div>
                    </div>
                </div>
            `;
            
            // 添加到推进系统面板中
            const existingContainer = thrusterPanel.querySelector('.thruster-container');
            if (existingContainer) {
                thrusterPanel.insertBefore(displayElement, existingContainer.nextSibling);
            } else {
                thrusterPanel.appendChild(displayElement);
            }
        }
    }
    
    // 添加CSS样式
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .thruster-container-sailboat {
            padding: 10px;
            background: rgba(10, 25, 41, 0.8);
            border-radius: 8px;
            border: 1px solid rgba(0, 167, 255, 0.3);
            margin-top: 5px;
        }
        
        .sailboat-data-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .sailboat-data-item {
            flex: 1;
            margin: 0 5px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 6px;
            padding: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .sailboat-data-label {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 5px;
            display: flex;
            align-items: center;
        }
        
        .sailboat-data-label .thruster-status-indicator {
            margin-right: 5px;
            width: 8px;
            height: 8px;
        }
        
        .sailboat-data-value {
            font-size: 16px;
            font-weight: bold;
            color: #00a7ff;
            text-align: right;
        }
        
        /* 特殊状态样式 */
        .sailboat-data-value.warning {
            color: #ff6b6b;
            animation: pulse 1s infinite;
        }
        
        .sailboat-data-value.normal {
            color: #2ecc71;
        }
        
        .sailboat-data-value.caution {
            color: #f1c40f;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
    `;
    
    document.head.appendChild(styleElement);
});

// 更新帆船推进系统状态显示
function updateSailboatThrusterDisplay(data) {
    const displayElement = document.getElementById('sailboat-thruster-display');
    if (!displayElement) {
        console.warn('帆船推进系统显示元素未找到');
        return;
    }
    
    // 更新航向
    const headingElement = document.getElementById('sailboat-heading');
    if (headingElement) {
        const heading = data.heading || 0;
        headingElement.textContent = `${heading.toFixed(1)}°`;
        updateValueStatus(headingElement, heading, 0, 360, 10);
    }
    
    // 更新航线角
    const courseElement = document.getElementById('sailboat-course');
    if (courseElement) {
        const course = data.course || 0;
        courseElement.textContent = `${course.toFixed(1)}°`;
        updateValueStatus(courseElement, course, 0, 360, 10);
    }
    
    // 更新帆角
    const sailAngleElement = document.getElementById('sailboat-sail-angle');
    if (sailAngleElement) {
        const sailAngle = data.sailAngle || 0;
        sailAngleElement.textContent = `${sailAngle.toFixed(1)}°`;
        updateValueStatus(sailAngleElement, sailAngle, 0, 90, 20);
    }
    
    // 更新舵角
    const rudderAngleElement = document.getElementById('sailboat-rudder-angle');
    if (rudderAngleElement) {
        const rudderAngle = data.rudderAngle || 0;
        rudderAngleElement.textContent = `${rudderAngle.toFixed(1)}°`;
        updateValueStatus(rudderAngleElement, rudderAngle, -90, 90, 15);
    }
    
    // 更新风向
    const windDirectionElement = document.getElementById('sailboat-wind-direction');
    if (windDirectionElement) {
        const windDirection = data.windDirection || 0;
        windDirectionElement.textContent = `${windDirection.toFixed(1)}°`;
        updateValueStatus(windDirectionElement, windDirection, 0, 360, 10);
    }
    
    // 更新风速
    const windSpeedElement = document.getElementById('sailboat-wind-speed');
    if (windSpeedElement) {
        const windSpeed = data.windSpeed || 0;
        windSpeedElement.textContent = `${windSpeed.toFixed(1)} 节`;
        
        // 根据风速设置状态
        if (windSpeed > 15) {
            windSpeedElement.className = 'sailboat-data-value warning';
        } else if (windSpeed > 8) {
            windSpeedElement.className = 'sailboat-data-value caution';
        } else {
            windSpeedElement.className = 'sailboat-data-value normal';
        }
    }
    
    // 显示帆船推进系统面板
    displayElement.style.display = 'block';
    
    // 隐藏AUV推进系统面板
    const auvDisplayElement = document.querySelector('.thruster-container:not(#sailboat-thruster-display)');
    if (auvDisplayElement) {
        auvDisplayElement.style.display = 'none';
    }
}

// 更新值状态（根据数值范围设置不同样式）
function updateValueStatus(element, value, min, max, cautionThreshold = 0) {
    const range = max - min;
    const normalizedValue = (value - min) / range;
    
    if (Math.abs(value) > cautionThreshold) {
        element.className = 'sailboat-data-value caution';
    } else {
        element.className = 'sailboat-data-value normal';
    }
}

// 切换到AUV模式时隐藏帆船推进系统显示
function hideSailboatThrusterDisplay() {
    const displayElement = document.getElementById('sailboat-thruster-display');
    if (displayElement) {
        displayElement.style.display = 'none';
    }
    
    // 显示AUV推进系统面板
    const auvDisplayElement = document.querySelector('.thruster-container:not(#sailboat-thruster-display)');
    if (auvDisplayElement) {
        auvDisplayElement.style.display = 'block';
    }
}

// 处理帆船设备数据
function handleSailboatDeviceData(data) {
    // 提取帆船推进系统数据
    const sailboatData = {
        heading: data.yaw || 0,
        course: data.course || 0,
        sailAngle: data.sailEncoderAngle || 0,
        rudderAngle: data.rudderVertical || 0,
        windDirection: data.absoluteWindDirection || 0,
        windSpeed: data.windSpeed || 0
    };
    
    // 更新UI显示
    updateSailboatThrusterDisplay(sailboatData);
}

// 导出函数供其他脚本使用
window.sailboatThrusterDisplay = {
    update: handleSailboatDeviceData,
    show: updateSailboatThrusterDisplay,
    hide: hideSailboatThrusterDisplay
};