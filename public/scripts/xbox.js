// 控制变量
let isDetecting = false;
let animationFrameId = null;
let connectedHandler = null;
let disconnectedHandler = null;

// 启动手柄检测
function xboxstart() {
    if (isDetecting) return;
    
    isDetecting = true;
    
    // 保存事件处理函数的引用，以便后续移除
    connectedHandler = (event) => {
        const gamepad = event.gamepad;
        console.log('手柄已连接:', gamepad);
        
        // 开始更新循环
        startUpdateLoop();
    };
    
    disconnectedHandler = (event) => {
        console.log('手柄已断开:', event.gamepad);
        
        // 重置摇杆位置和数值
        resetSticks();
        
        // 停止更新循环
        stopUpdateLoop();
    };
    
    // 添加事件监听器
    window.addEventListener('gamepadconnected', connectedHandler);
    window.addEventListener('gamepaddisconnected', disconnectedHandler);
    
    // 关键修复：检查是否已经有连接的手柄
    checkExistingGamepads();
    
    console.log('手柄检测已启动');
}

// 停止手柄检测
function xboxstop() {
    if (!isDetecting) return;
    
    isDetecting = false;
    
    // 移除事件监听器
    if (connectedHandler) {
        window.removeEventListener('gamepadconnected', connectedHandler);
        connectedHandler = null;
    }
    
    if (disconnectedHandler) {
        window.removeEventListener('gamepaddisconnected', disconnectedHandler);
        disconnectedHandler = null;
    }
    
    // 停止更新循环
    stopUpdateLoop();
    
    console.log('手柄检测已停止');
}

// 检查已存在的手柄连接
function checkExistingGamepads() {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            console.log('发现已连接的手柄:', gamepads[i]);
            startUpdateLoop();
            break;
        }
    }
}

// 启动更新循环
function startUpdateLoop() {
    // 如果已经有循环在运行，先停止它
    stopUpdateLoop();
    
    // 开始新的循环
    animationFrameId = requestAnimationFrame(updateGamepad);
}

// 停止更新循环
function stopUpdateLoop() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// 更新游戏手柄数据
function updateGamepad() {
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[0]; // 获取第一个连接的手柄
    
    if (gamepad) {
        updateStickData(gamepad);
    } else {
        // 如果没有检测到手柄，重置摇杆
        resetSticks();
    }
    
    // 继续循环（仅在检测中时）
    if (isDetecting) {
        animationFrameId = requestAnimationFrame(updateGamepad);
    }
}

// 解析摇杆数据
function updateStickData(gamepad) {
    // 左摇杆 (轴0和轴1)
    const leftStickX = gamepad.axes[0];
    let leftStickY = gamepad.axes[1]*(-1);
const leftx = leftStickX.toFixed(2);
    // 右摇杆 (轴2和轴3)
    const rightStickX = gamepad.axes[2];
    let rightStickY = gamepad.axes[3]*(-1);
    //推进器限幅
    if(rightStickY>(0.5))rightStickY=0.5;  
    if(rightStickY<(-0.5))rightStickY=(-0.5);
    //
    let buchang =  Math.abs(rightStickY);
    leftStickY = leftStickY+buchang;
        // 发送全部上电指令
    sendPathDataToServer({
        type: 'xbox-control',
        leftStickX: parseFloat(leftStickX.toFixed(2)),//舵机水平
        leftStickY: parseFloat(leftStickY.toFixed(2)),//舵机垂直
        rightStickX: parseFloat(rightStickX.toFixed(2)),
        rightStickY: parseFloat(rightStickY.toFixed(2))//推进器
    });
    console.log('right',  rightStickY.toFixed(2));
     console.log('right', leftStickX.toFixed(2), leftStickY.toFixed(2));
    document.getElementById('thruster-speed-display').textContent = '下发PWM占比:' + (rightStickY*100).toFixed(2)+'%' ;//rightStickY*100;

}


// 重置摇杆位置和数值
function resetSticks() {
    // 在这里实现重置摇杆的逻辑
    console.log('摇杆已重置');
    // 例如：将UI上的摇杆重置到中心位置
}