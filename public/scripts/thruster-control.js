// 推进系统控制逻辑
document.addEventListener('DOMContentLoaded', function() {
    // 获取元素
    const thrusterBtn = document.getElementById('thruster-panel');
    const thrusterModal = document.getElementById('thruster-control-modal');
    const closeModalBtn = thrusterModal.querySelector('.close-modal');
    const setButtons = thrusterModal.querySelectorAll('.set-btn');
    const applyAllBtn = document.getElementById('apply-all-btn');
    const resetAllBtn = document.getElementById('reset-all-btn');
    const rudderZeroBtn = document.getElementById('rudder-zero-btn');
    const brushlessPositionBtna = document.getElementById('brushless-position-btn');
    
    const dutySlider = document.getElementById('thruster-duty');
    const dutyValue = document.getElementById('duty-value');
    
    // 当前设备状态
    let currentState = {
        leftRudder: 0,
        rightRudder: 0,
        upperRudder: 0,
        lowerRudder: 0,
        thruster: 0,
        brushless: 0
    };
    
    // 使能标志位定义
    const ENABLE_FLAGS = {
        THRUSTER: 0x01,   // Bit 0: 推进器使能
        SERVO_A: 0x02,    // Bit 1: 舵机A使能 (左)
        SERVO_B: 0x04,    // Bit 2: 舵机B使能 (右)
        SERVO_C: 0x08,    // Bit 3: 舵机C使能 (上)
        SERVO_D: 0x10,    // Bit 4: 舵机D使能 (下)
        BRUSHLESS: 0x20,  // Bit 5: 无刷电机使能
        SET_ZERO: 0x40    // Bit 6: 舵机置零位
    };
    
    // 打开模态框
    thrusterBtn.addEventListener('click', function() {
        thrusterModal.style.display = 'block';
    });
    
    // 关闭模态框
    closeModalBtn.addEventListener('click', function() {
        thrusterModal.style.display = 'none';
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === thrusterModal) {
            thrusterModal.style.display = 'none';
        }
    });
    
    // 更新滑块值显示
    dutySlider.addEventListener('input', function() {
        dutyValue.textContent = this.value + '%';
    });
    
    // 单个设置按钮点击事件
    setButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const inputElement = document.getElementById(targetId);
            
            if (targetId === 'thruster-duty') {
                // 推进器控制
                const value = parseInt(inputElement.value);
                console.log("推进器值:", value);
                sendThrusterCommand(value);
            } else {
                // 舵机控制
                const value = parseFloat(inputElement.value);
                sendRudderCommand(targetId, value);
            }
        });
    });
    
    // 无刷电机位置按钮
    brushlessPositionBtna.addEventListener('click', function() {
        const targetPosition = parseInt(document.getElementById('brushless-target').value);
        sendBrushlessCommand(targetPosition);
        console.log('无刷电机目标位置:', targetPosition);
    });
    
    // 应用所有设置
    applyAllBtn.addEventListener('click', function() {
        // 获取所有舵机角度
        const leftRudder = parseFloat(document.getElementById('left-rudder').value);
        const rightRudder = parseFloat(document.getElementById('right-rudder').value);
        const upperRudder = parseFloat(document.getElementById('upper-rudder').value);
        const lowerRudder = parseFloat(document.getElementById('lower-rudder').value);
        
        // 获取推进器系数
        const thrusterDuty = parseInt(document.getElementById('thruster-duty').value);
        
        // 获取无刷电机目标位置
        const brushlessTarget = parseInt(document.getElementById('brushless-target').value);
        
        // 更新当前状态
        currentState = {
            leftRudder,
            rightRudder,
            upperRudder,
            lowerRudder,
            thruster: thrusterDuty,
            brushless: brushlessTarget
        };
        
        // 发送所有控制命令
        sendAllCommands(leftRudder, rightRudder, upperRudder, lowerRudder, thrusterDuty, brushlessTarget);
    });
    
    // 重置所有设置
    resetAllBtn.addEventListener('click', function() {
        // 重置输入框值
        document.getElementById('left-rudder').value = 0;
        document.getElementById('right-rudder').value = 0;
        document.getElementById('upper-rudder').value = 0;
        document.getElementById('lower-rudder').value = 0;
        document.getElementById('thruster-duty').value = 0;
        document.getElementById('brushless-target').value = 0;
        
        // // 更新显示
        // dutyValue.textContent = '0%';
        // document.getElementById('brushless-position').textContent = '0';
        
        // // 更新当前状态
        // currentState = {
        //     leftRudder: 0,
        //     rightRudder: 0,
        //     upperRudder: 0,
        //     lowerRudder: 0,
        //     thruster: 0,
        //     brushless: 0
        // };
        
        // 发送重置命令
        sendResetCommand();
    });
    
    // 舵机置零
    rudderZeroBtn.addEventListener('click', function() {
        // 发送舵机置零命令
        sendRudderZeroCommand();
    });
    
    // 发送舵机控制命令
    function sendRudderCommand(rudderType, angle) {
        // 更新当前状态
        switch(rudderType) {
            case 'left-rudder':
                currentState.leftRudder = angle;
                break;
            case 'right-rudder':
                currentState.rightRudder = angle;
                break;
            case 'upper-rudder':
                currentState.upperRudder = angle;
                break;
            case 'lower-rudder':
                currentState.lowerRudder = angle;
                break;
        }
        
        // 计算使能标志位 - 只使能当前舵机
        let enableFlags = 0;
        switch(rudderType) {
            case 'left-rudder':
                enableFlags = ENABLE_FLAGS.SERVO_A;
                break;
            case 'right-rudder':
                enableFlags = ENABLE_FLAGS.SERVO_B;
                break;
            case 'upper-rudder':
                enableFlags = ENABLE_FLAGS.SERVO_C;
                break;
            case 'lower-rudder':
                enableFlags = ENABLE_FLAGS.SERVO_D;
                break;
        }
        
        const commandData = {
            type: 'all-controls',
            thruster: currentState.thruster,
            brushless: currentState.brushless,
            leftRudder: currentState.leftRudder,
            rightRudder: currentState.rightRudder,
            upperRudder: currentState.upperRudder,
            lowerRudder: currentState.lowerRudder,
            setzero: false,
            enableFlags: enableFlags
        };
    
        console.log('发送舵机控制命令:', commandData);
        sendPathDataToServer(commandData);
        
        showCommandStatus(`舵机 ${rudderType} 角度设置为: ${angle}°`);
    }
    
    // 发送推进器控制命令
    function sendThrusterCommand(duty) {
        // 更新当前状态
        currentState.thruster = duty;
        
        // 只使能推进器
        const enableFlags = ENABLE_FLAGS.THRUSTER;
        
        const commandData = {
            type: 'all-controls',
            thruster: currentState.thruster,
            brushless: currentState.brushless,
            leftRudder: currentState.leftRudder,
            rightRudder: currentState.rightRudder,
            upperRudder: currentState.upperRudder,
            lowerRudder: currentState.lowerRudder,
            setzero: false,
            enableFlags: enableFlags
        };        
        
        console.log('发送推进器控制命令:', commandData);
        sendPathDataToServer(commandData);
        
        showCommandStatus(`推进器系数设置为: ${duty}%`);
    }
    
    // 发送无刷电机控制命令
    function sendBrushlessCommand(targetPosition) {
        // 更新当前状态
        currentState.brushless = targetPosition;
        
        // 只使能无刷电机
        const enableFlags = ENABLE_FLAGS.BRUSHLESS;
        
        const commandData = {
            type: 'all-controls',
            thruster: currentState.thruster,
            brushless: currentState.brushless,
            leftRudder: currentState.leftRudder,
            rightRudder: currentState.rightRudder,
            upperRudder: currentState.upperRudder,
            lowerRudder: currentState.lowerRudder,
            setzero: false,
            enableFlags: enableFlags
        };
        
        console.log('发送无刷电机控制命令:', commandData);
        sendPathDataToServer(commandData);
        
        showCommandStatus(`无刷电机目标位置设置为: ${targetPosition}`);
    }
    
    // 发送所有控制命令
    function sendAllCommands(left, right, upper, lower, thruster, brushless) {
        // 使能所有设备
        const enableFlags = ENABLE_FLAGS.THRUSTER | ENABLE_FLAGS.SERVO_A | ENABLE_FLAGS.SERVO_B | 
                           ENABLE_FLAGS.SERVO_C | ENABLE_FLAGS.SERVO_D ;//| ENABLE_FLAGS.BRUSHLESS;
        
        const commandData = {
            type: 'all-controls',
            thruster: thruster,
            brushless: brushless,
            leftRudder: left,
            rightRudder: right,
            upperRudder: upper,
            lowerRudder: lower,
            setzero: false,
            enableFlags: enableFlags
        };
        
        console.log('发送所有控制命令:', commandData);
        sendPathDataToServer(commandData);
        
        showCommandStatus('所有控制参数已应用');
    }
    
    // 发送重置命令
    function sendResetCommand() {
        // 重置时使能所有设备
        const enableFlags = ENABLE_FLAGS.THRUSTER | ENABLE_FLAGS.SERVO_A | ENABLE_FLAGS.SERVO_B | 
                           ENABLE_FLAGS.SERVO_C | ENABLE_FLAGS.SERVO_D ;//| ENABLE_FLAGS.BRUSHLESS;
        
        const commandData = {
            type: 'all-controls',
            thruster: 0,
            brushless: 0,
            leftRudder: 0,
            rightRudder: 0,
            upperRudder: 0,
            lowerRudder: 0,
            setzero: false,
            enableFlags: enableFlags
        };
        
        console.log('发送重置命令');
        sendPathDataToServer(commandData);
        
        showCommandStatus('所有控制参数已重置');
    }
    
    // 发送舵机置零命令
    function sendRudderZeroCommand() {
        // 只使能舵机并置零
        const enableFlags = ENABLE_FLAGS.SERVO_A | ENABLE_FLAGS.SERVO_B | 
                           ENABLE_FLAGS.SERVO_C | ENABLE_FLAGS.SERVO_D | ENABLE_FLAGS.SET_ZERO;
        
        const commandData = {
            type: 'all-controls',
            thruster: currentState.thruster,
            brushless: currentState.brushless,
            leftRudder: 0,
            rightRudder: 0,
            upperRudder: 0,
            lowerRudder: 0,
            setzero: true,
            enableFlags: enableFlags
        };
        
        console.log('发送舵机置零命令');
        sendPathDataToServer(commandData);
        
        showCommandStatus('所有舵机已置零');
    }
    
    // 显示命令状态
    function showCommandStatus(message) {
        // 在实际界面中显示状态消息
        console.log('命令状态:', message);
        
        // 可以在这里添加状态显示逻辑，比如更新某个状态元素
        // 例如: commandStatus.textContent = message;
    }
    
    // 接收状态更新函数（从WebSocket接收）
    function updateThrusterStatus(data,updateThrusterStatus) {
        // 更新界面显示
        if (data.left !== undefined) {
            document.getElementById('left-angle-display').textContent = data.left.toFixed(1) + '°';
        }
        if (data.right !== undefined) {
            document.getElementById('right-angle-display').textContent = data.right.toFixed(1) + '°';
        }
        if (data.top !== undefined) {
            document.getElementById('upper-angle-display').textContent = data.top.toFixed(1) + '°';
        }
        if (data.bottom !== undefined) {
            document.getElementById('lower-angle-display').textContent = data.bottom.toFixed(1) + '°';
        }
        if (data.thruster !== undefined) {
            document.getElementById('thruster-angle-display').textContent = '上报推进转速:' + data.thruster.toFixed(1)+'RPM' ;
           // dutyValue.textContent = data.thruster.toFixed(0) + '';
        }
        if (updateThrusterStatus !== undefined) {
            document.getElementById('brushless-position').textContent =updateThrusterStatus*10000;
        }
    }
    
    // 暴露函数以便其他脚本可以调用
    window.thrusterControl = {
        updateThrusterStatus: updateThrusterStatus,
        sendAllCommands:sendAllCommands,
    };
});