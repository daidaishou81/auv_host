// 滑行任务功能 - 紧凑布局版本
document.addEventListener('DOMContentLoaded', function() {
    // 滑行任务相关元素
    const glideDepthInput = document.getElementById('glide-depth');
    const glideHeadingInput = document.getElementById('glide-heading');
    const glideFrontTankInput = document.getElementById('glide-front-tank');
    const glideRearTankInput = document.getElementById('glide-rear-tank');
    const addGlidePointBtn = document.getElementById('add-glide-point');
    const clearGlideFormBtn = document.getElementById('clear-glide-form');
    const glidePointsList = document.getElementById('glide-points-list');
    const emptyGlideState = document.getElementById('empty-glide-state');
    const glidePointsCount = document.getElementById('glide-points-count');
    const sendGlideTaskBtn = document.getElementById('send-glide-task');
    const loadGlideTemplateBtn = document.getElementById('load-glide-template');
    const saveGlideProfileBtn = document.getElementById('save-glide-profile');
    
    // 获取右上角计时器输入框
    const timerInput = document.getElementById('timer-input');
    
    // 滑行任务点数据
    let glidePoints = [
        { depth: 50, heading: 120, frontTank: 1500, rearTank: 1800 },
        { depth: 75, heading: 180, frontTank: 2000, rearTank: 2200 }
    ];
    
    // 更新滑行任务点显示
    function updateGlidePointsDisplay() {
        if (glidePoints.length === 0) {
            glidePointsList.style.display = 'none';
            emptyGlideState.style.display = 'block';
        } else {
            glidePointsList.style.display = 'block';
            emptyGlideState.style.display = 'none';
            
            // 清空列表
            glidePointsList.innerHTML = '';
            
            // 添加任务点
            glidePoints.forEach((point, index) => {
                const item = document.createElement('div');
                item.className = 'path-item glide-item';
                item.innerHTML = `
                    <span class="point-index">${index + 1}</span>
                    <span class="point-depth">${point.depth}</span>
                    <span class="point-heading">${point.heading}</span>
                    <span class="point-front-tank">${point.frontTank}</span>
                    <span class="point-rear-tank">${point.rearTank}</span>
                    <div class="point-actions">
                        <button class="action-btn insert-before" title="在前面插入">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <button class="action-btn insert-after" title="在后面插入">
                            <i class="fas fa-arrow-down"></i>
                        </button>
                        <button class="action-btn delete-point" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                glidePointsList.appendChild(item);
            });
        }
        
        // 更新计数
        glidePointsCount.textContent = glidePoints.length;
    }
    
    // 添加滑行任务点
    addGlidePointBtn.addEventListener('click', function() {
        const depth = parseFloat(glideDepthInput.value);
        const heading = parseFloat(glideHeadingInput.value);
        const frontTank = parseFloat(glideFrontTankInput.value);
        const rearTank = parseFloat(glideRearTankInput.value);
        
        if (isNaN(depth) || isNaN(heading) || isNaN(frontTank) || isNaN(rearTank)) {
            showMessage('请填写所有字段的有效数值', 'warning');
            return;
        }
        
        glidePoints.push({ depth, heading, frontTank, rearTank });
        updateGlidePointsDisplay();
        clearGlideForm();
        showMessage('滑行任务点添加成功', 'success');
    });
    
    // 清除滑行任务表单
    clearGlideFormBtn.addEventListener('click', clearGlideForm);
    
    function clearGlideForm() {
        glideDepthInput.value = '';
        glideHeadingInput.value = '';
        glideFrontTankInput.value = '';
        glideRearTankInput.value = '';
        glideDepthInput.focus();
    }
    
    // 滑行任务点操作
    glidePointsList.addEventListener('click', function(e) {
        const item = e.target.closest('.glide-item');
        if (!item) return;
        
        const index = Array.from(glidePointsList.children).indexOf(item);
        
        // 删除点
        if (e.target.closest('.delete-point')) {
            glidePoints.splice(index, 1);
            updateGlidePointsDisplay();
            showMessage('滑行任务点已删除', 'info');
            return;
        }
        
        // 在前面插入点
        if (e.target.closest('.insert-before')) {
            const depth = parseFloat(glideDepthInput.value);
            const heading = parseFloat(glideHeadingInput.value);
            const frontTank = parseFloat(glideFrontTankInput.value);
            const rearTank = parseFloat(glideRearTankInput.value);
            
            if (isNaN(depth) || isNaN(heading) || isNaN(frontTank) || isNaN(rearTank)) {
                showMessage('请填写所有字段的有效数值', 'warning');
                return;
            }
            
            glidePoints.splice(index, 0, { depth, heading, frontTank, rearTank });
            updateGlidePointsDisplay();
            clearGlideForm();
            showMessage('滑行任务点已插入', 'success');
            return;
        }
        
        // 在后面插入点
        if (e.target.closest('.insert-after')) {
            const depth = parseFloat(glideDepthInput.value);
            const heading = parseFloat(glideHeadingInput.value);
            const frontTank = parseFloat(glideFrontTankInput.value);
            const rearTank = parseFloat(glideRearTankInput.value);
            
            if (isNaN(depth) || isNaN(heading) || isNaN(frontTank) || isNaN(rearTank)) {
                showMessage('请填写所有字段的有效数值', 'warning');
                return;
            }
            
            glidePoints.splice(index + 1, 0, { depth, heading, frontTank, rearTank });
            updateGlidePointsDisplay();
            clearGlideForm();
            showMessage('滑行任务点已插入', 'success');
            return;
        }
    });
    
    // 下发滑行任务
    sendGlideTaskBtn.addEventListener('click', function() {
        if (glidePoints.length === 0) {
            showMessage('请至少添加一个滑行任务点', 'warning');
            return;
        }
        
        // 从右上角计时器输入框获取最大抛载时间
        let maxDropTime = 0;
        if (timerInput && timerInput.value) {
            // 解析时间格式 HH:MM:SS 或 HH:MM
            const timeParts = timerInput.value.split(':').map(Number);
            if (timeParts.length >= 2) {
                // 转换为总秒数
                maxDropTime = timeParts[0] * 3600 + timeParts[1] * 60;
                if (timeParts.length === 3) {
                    maxDropTime += timeParts[2];
                }
            }
        }
        
        // 验证最大抛载时间
        if (maxDropTime === 0) {
            showMessage('请先在右上角设置任务时间', 'warning');
            return;
        }
        
        // 发送滑行任务数据
        sendPathDataToServer({
            type: 'glidemode',
            glidemode: {
                maxDropTime: maxDropTime,
                points: glidePoints
            }
        });
        
        showMessage(`成功下发 ${glidePoints.length} 个滑行任务点，最大抛载时间: ${formatTime(maxDropTime)}`, 'success');
    });
    
    // 时间格式化函数
    function formatTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return `${hours}小时${minutes}分钟${seconds}秒`;
        } else if (minutes > 0) {
            return `${minutes}分钟${seconds}秒`;
        } else {
            return `${seconds}秒`;
        }
    }
    
    // 加载模板
    loadGlideTemplateBtn.addEventListener('click', function() {
        // 示例模板数据
        glidePoints = [
            { depth: 30, heading: 90, frontTank: 1200, rearTank: 1500 },
            { depth: 50, heading: 135, frontTank: 1800, rearTank: 2000 },
            { depth: 70, heading: 180, frontTank: 2200, rearTank: 2400 }
        ];
        
        updateGlidePointsDisplay();
        showMessage('滑行任务模板已加载', 'success');
    });
    
    // 保存配置
    saveGlideProfileBtn.addEventListener('click', function() {
        if (glidePoints.length === 0) {
            showMessage('没有可保存的滑行任务点', 'warning');
            return;
        }
        
        // 模拟保存配置
        showMessage('滑行任务配置已保存', 'success');
        
        // 在实际应用中，这里会保存配置到服务器或本地存储
        console.log('保存的滑行任务配置:', glidePoints);
    });
    
    // 初始显示
    updateGlidePointsDisplay();
    
    // 消息提示函数
    function showMessage(message, type) {
        // 这里使用您现有的消息提示系统
        console.log(`${type}: ${message}`);
        // 在实际应用中，这里会调用现有的消息提示组件
    }
});