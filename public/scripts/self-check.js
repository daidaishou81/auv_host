// 自检系统模块

    
    // 自检状态
    let selfcheckState = {
        isRunning: false,
        currentStep: 0,
        totalSteps: 0,
        results: {},
        timeoutIds: []
    };
    
    // 自检设备列表
    const selfcheckDevices = [
        { id: 'ctd', name: 'CTD设备', category: 'external', checkTime: 2000,ip:'192.168.0.2' },
        { id: 'dvl', name: 'DVL多普勒', category: 'external', checkTime: 2500,ip:'192.168.0.2' },
        { id: 'rudder', name: '舵机系统', category: 'power', checkTime: 3000 ,ip:'192.168.0.2'},
        { id: 'thruster', name: '推进器', category: 'power', checkTime: 3500 ,ip:'192.168.0.2'},
        { id: 'beidou', name: '北斗设备', category: 'communication', checkTime: 4000 ,ip:'192.168.0.241'},
        { id: 'acoustic', name: '声通设备', category: 'communication', checkTime: 3000 ,ip:'192.168.0.4'},
        { id: 'video', name: '图传设备', category: 'communication', checkTime: 2500 ,ip:'192.168.0.202'}
    ];
    
    // 初始化自检系统
    function initSelfcheck() {
        // 绑定按钮事件
        document.getElementById('selfcheck-start-btn').addEventListener('click', startSelfcheck);
        document.getElementById('selfcheck-stop-btn').addEventListener('click', stopSelfcheck);
        document.getElementById('selfcheck-export-btn').addEventListener('click', exportSelfcheckReport);
        
        
        console.log('自检系统初始化完成');
    }
    
    // 打开自检模态框
    window.openSelfcheckModal = function() {
        const modal = document.getElementById('selfcheck-modal');
        if (modal) {
            modal.style.display = 'block';
            //resetSelfcheckStatus();
        }
    };
    
    // 关闭自检模态框
    window.closeSelfcheckModal = function() {
        const modal = document.getElementById('selfcheck-modal');
        if (modal) {
            modal.style.display = 'none';
            // 如果自检正在进行，则停止
            if (selfcheckState.isRunning) {
                stopSelfcheck();
            }
        }
    };
    
    // 重置自检状态
    function resetSelfcheckStatus() {
        // 重置所有设备状态为待检查
        document.querySelectorAll('.selfcheck-status').forEach(indicator => {
            indicator.setAttribute('data-status', 'pending');
        });
        
        // 重置进度条
        updateProgress(0);
        
        // 清空反馈面板
        const feedbackPanel = document.getElementById('selfcheck-feedback-panel');
        feedbackPanel.innerHTML = '<div class="feedback-message initial-message">点击"开始自检"按钮启动系统自检...</div>';
        
        // 重置按钮状态
        document.getElementById('selfcheck-start-btn').disabled = false;
        document.getElementById('selfcheck-stop-btn').disabled = true;
        
        // 重置自检状态
        selfcheckState = {
            isRunning: false,
            currentStep: 0,
            totalSteps: selfcheckDevices.length,
            results: {},
            timeoutIds: []
        };
    }
    
    // 开始自检
   async  function startSelfcheck() {
        if (selfcheckState.isRunning) return;
        
        selfcheckState.isRunning = true;
        selfcheckState.currentStep = 0;
        selfcheckState.results = {};
        
        // 更新按钮状态
        document.getElementById('selfcheck-start-btn').disabled = true;
        document.getElementById('selfcheck-stop-btn').disabled = false;
        
        // 清空反馈面板
        const feedbackPanel = document.getElementById('selfcheck-feedback-panel');
        feedbackPanel.innerHTML = '';
         addFeedbackMessage('开始系统自检...', 'checking');
          try {
            // 第一步：先进行所有外部设备IP检测
            await checkDevice();
            
            // 第二步：所有外部设备检测完成后，再进行推进系统检测
            await checkPowerequipmentDevice();
        
        // 第三步：完成自检
        finishSelfcheck();
    } catch (error) {
        console.error('自检过程中出现错误:', error);
        addFeedbackMessage('自检过程中出现错误: ' + error.message, 'failed');
        stopSelfcheck();
    }
        // 添加开始消息
    }
     function checkPowerequipmentDevice(){
        window.thrusterControl.sendAllCommands(10,10,10,10,10,0);
       
        setTimeout(() => {

            (document.getElementById('left-angle-display').textContent <12&&document.getElementById('left-angle-display').textContent >8)?addFeedbackMessage("左舵机正常",'舵机系统'):addFeedbackMessage("左舵机异常",'舵机系统');
            (document.getElementById('right-angle-display').textContent <12&&document.getElementById('right-angle-display').textContent >8)?addFeedbackMessage("右舵机正常",'舵机系统'):addFeedbackMessage("右舵机异常",'舵机系统');;
            (document.getElementById('upper-angle-display').textContent <12&&document.getElementById('upper-angle-display').textContent >8)?addFeedbackMessage("上舵机正常",'舵机系统'):addFeedbackMessage("上舵机异常",'舵机系统');;
            (document.getElementById('lower-angle-display').textContent <12&&document.getElementById('lower-angle-display').textContent >8)?addFeedbackMessage("下舵机正常",'舵机系统'):addFeedbackMessage("下舵机异常",'舵机系统');;
            (document.getElementById('thruster-angle-display').textContent >0)?addFeedbackMessage("推进器正常",'舵机系统'):addFeedbackMessage("推进器异常",'舵机系统');
            }, 3000);
        
     }
    // 停止自检
    function stopSelfcheck() {
        if (!selfcheckState.isRunning) return;
        
        // 清除所有定时器
        selfcheckState.timeoutIds.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        selfcheckState.timeoutIds = [];
        
        // 更新状态
        selfcheckState.isRunning = false;
        
        // 更新按钮状态
        document.getElementById('selfcheck-start-btn').disabled = false;
        document.getElementById('selfcheck-stop-btn').disabled = true;
        
        // 添加停止消息
        addFeedbackMessage('自检已手动停止', 'failed');
        
        // 更新进度
        const progress = Math.floor((selfcheckState.currentStep / selfcheckState.totalSteps) * 100);
        updateProgress(progress);
    }
    
    // 检查下一个设备
    function checkDevice() {
      
        
        const device = selfcheckDevices[selfcheckState.currentStep];
        
        // 更新设备状态为检查中
        updateDeviceStatus(device.id, 'checking');
        
        // 添加检查消息
        addFeedbackMessage(`正在检查 外接设备...`, 'checking');
        
     if (ws && ws.readyState === WebSocket.OPEN) {
                // 发送路径点数组
                sendPathDataToServer({
        
                      type: 'device-selfcheck',
                      device_selfcheck_ip:selfcheckDevices[6].ip
                });
                console.log('tim111e',selfcheckDevices[6].ip);
                showMessage('路径发送成功');
                pathStatus.textContent = '路径已发送至服务器';
                pathStatus.className = 'status-message success';
            }
    
    }
    
    // 完成自检
    function finishSelfcheck() {
        selfcheckState.isRunning = false;
        
        // 更新按钮状态
        document.getElementById('selfcheck-start-btn').disabled = false;
        document.getElementById('selfcheck-stop-btn').disabled = true;
        
        // 计算成功设备数量
        const successfulDevices = Object.values(selfcheckState.results).filter(result => result.success).length;
        const totalDevices = selfcheckState.totalSteps;
        
        // 添加完成消息
        addFeedbackMessage(
            `自检完成！成功设备: ${successfulDevices}/${totalDevices}`,
            successfulDevices === totalDevices ? 'success' : 'failed'
        );
        
        // 更新进度到100%
        updateProgress(100);
    }
    
    // 更新设备状态指示器
    function updateDeviceStatus(deviceId, status) {
        const indicator = document.querySelector(`.selfcheck-item[data-device="${deviceId}"] .selfcheck-status`);
        if (indicator) {
            indicator.setAttribute('data-status', status);
        }
    }
    
    // 更新进度条
    function updateProgress(percentage) {
        const progressFill = document.getElementById('selfcheck-progress-fill');
        const progressText = document.getElementById('selfcheck-progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${percentage}%`;
        }
    }
    
    // 添加反馈消息
    function addFeedbackMessage(message, type) {
        const feedbackPanel = document.getElementById('selfcheck-feedback-panel');
        const messageElement = document.createElement('div');
        messageElement.className = `feedback-message ${type}-message`;
        messageElement.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        feedbackPanel.appendChild(messageElement);
        
        // 自动滚动到底部
        feedbackPanel.scrollTop = feedbackPanel.scrollHeight;
    }
    
    // 导出自检报告
    function exportSelfcheckReport() {
        // 创建报告内容
        let reportContent = `系统自检报告\n`;
        reportContent += `生成时间: ${new Date().toLocaleString()}\n\n`;
        
        // 添加设备检查结果
        reportContent += `设备检查结果:\n`;
        reportContent += `==============\n`;
        
        Object.values(selfcheckState.results).forEach(result => {
            reportContent += `${result.name}: ${result.success ? '通过' : '失败'} (${result.timestamp})\n`;
        });
        
        // 计算统计信息
        const totalDevices = Object.keys(selfcheckState.results).length;
        const successfulDevices = Object.values(selfcheckState.results).filter(r => r.success).length;
        const successRate = totalDevices > 0 ? (successfulDevices / totalDevices * 100).toFixed(2) : 0;
        
        reportContent += `\n统计信息:\n`;
        reportContent += `==========\n`;
        reportContent += `总设备数: ${totalDevices}\n`;
        reportContent += `成功设备: ${successfulDevices}\n`;
        reportContent += `成功率: ${successRate}%\n`;
        
        // 创建下载链接
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `自检报告_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 添加导出消息
        addFeedbackMessage('自检报告已导出', 'success');
    }
    
    // 添加设备检查函数（供外部调用）
    window.addSelfcheckDevice = function(deviceConfig) {
        // 验证设备配置
        if (!deviceConfig || !deviceConfig.id || !deviceConfig.name) {
            console.error('添加自检设备失败: 设备配置无效');
            return false;
        }
        
        // 检查设备是否已存在
        if (selfcheckDevices.some(device => device.id === deviceConfig.id)) {
            console.warn(`自检设备 ${deviceConfig.id} 已存在`);
            return false;
        }
        
        // 添加设备
        selfcheckDevices.push({
            id: deviceConfig.id,
            name: deviceConfig.name,
            category: deviceConfig.category || 'external',
            checkTime: deviceConfig.checkTime || 2000,
            checkFunction: deviceConfig.checkFunction // 自定义检查函数
        });
        
        // 更新总步数
        selfcheckState.totalSteps = selfcheckDevices.length;
        
        console.log(`自检设备 ${deviceConfig.name} 添加成功`);
        return true;
    };
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSelfcheck);
    } else {
        initSelfcheck();
    }
    
    // 暴露主要函数到全局作用域
    window.selfcheck = {
        start: startSelfcheck,
        stop: stopSelfcheck,
        reset: resetSelfcheckStatus,
        addDevice: window.addSelfcheckDevice
    };
