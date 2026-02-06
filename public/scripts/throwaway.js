//#region 抛载状态显示逻辑

// 初始化抛载状态显示
function initThrowAwayDisplay() {
    // 确保显示元素存在
    if (!document.getElementById('throw-away-display')) {
        return;
    }
    
    // 设置默认状态
    updateThrowAwayStatus({
        thrown: false,
        timeRemaining: 0
    });
}

// 更新抛载状态显示
function updateDeviceThrow_away(isThrown,time) {
   // console.log('更新抛载状态:', isThrown);
    
    if (isThrown === undefined || isThrown === null) {
        console.warn('抛载数据为空或无效');
        return;
    }
    
    // 解析抛载数据
    let parsedData = {
        thrown: Boolean(isThrown), // 转换为布尔值
        timeRemaining: time
    };
    
    // 更新显示
    updateThrowAwayStatus(parsedData);
    
    // 如果抛载，显示警告
    if (parsedData.thrown) {
        showThrowAwayAlert();
    }
}

// 更新抛载状态显示UI
function updateThrowAwayStatus(data) {
    const statusElement = document.getElementById('throw-away-status');
    const timeElement = document.getElementById('throw-away-time');
    const displayElement = document.getElementById('throw-away-display');
    
    if (!statusElement || !timeElement) return;
    
    const isThrown = data.thrown || false;
    const timeRemaining = data.timeRemaining || 0;
    
    // 更新状态文本
    if (isThrown) {
        statusElement.textContent = '已抛载';
    } else {
        statusElement.textContent = '未抛载';
    }
    
    // 更新状态样式
    if (isThrown) {
        statusElement.className = 'throw-away-value thrown';
        if (displayElement) {
            displayElement.classList.add('thrown');
        }
    } else {
        statusElement.className = 'throw-away-value';
        if (displayElement) {
            displayElement.classList.remove('thrown');
        }
    }
    
    // 更新时间显示
    // 如果已抛载，显示抛载时间；否则显示状态
    if (isThrown) {
        timeElement.textContent = new Date().toLocaleTimeString();
    }
    
      //  console.log("timeRemaining",timeRemaining);
         timeElement.textContent = ` ${timeRemaining} 分`;
    // 记录状态变化
   // console.log(`抛载状态更新: ${isThrown ? '已抛载' : '未抛载'}`);
}

// 显示抛载警告
function showThrowAwayAlert() {
    // 闪烁动画已经在CSS中定义
    // 显示消息提醒
    showMessage("设备已抛载！", "warning", 5000);
    
    // 可以添加声音提示（需要相应的音频文件）
    // playThrowAwaySound();
}

// 模拟抛载声音（可选）
function playThrowAwaySound() {
    // 如果需要声音提示，可以添加音频播放
    try {
        const audio = new Audio('sounds/throwaway-alert.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('音频播放失败:', e));
    } catch (error) {
        console.log('音频播放错误:', error);
    }
}

// 清除抛载状态
function clearThrowAwayStatus() {
    updateThrowAwayStatus({
        thrown: false,
        timeRemaining: 0
    });
    const displayElement = document.getElementById('throw-away-display');
    if (displayElement) {
        displayElement.classList.remove('thrown');
    }
}

// 手动设置抛载状态（用于测试）
function setThrowAwayStatus(thrown) {
    updateThrowAwayStatus({
        thrown: thrown,
        timeRemaining: 0
    });
}

// 在页面加载时初始化抛载显示
document.addEventListener('DOMContentLoaded', function() {
    // 稍等一会确保DOM完全加载
    setTimeout(initThrowAwayDisplay, 100);
});

//#endregion