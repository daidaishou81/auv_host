const HID = require('node-hid');
const dgram = require('dgram');

// 配置参数 - 根据实际设备调整
const CONFIG = {
    GAMEPAD_PID: 0x31be,
    // UDP配置
    UDP_SERVER_IP: '192.168.0.101',  // UDP服务器IP地址
    UDP_SERVER_PORT: 8003,       // UDP服务器端口号
    // 控制参数范围
    THROTTLE_MIN: 0,      // 推进器最小值(后退)
    THROTTLE_MAX: 200,    // 推进器最大值(前进)
    THROTTLE_MID: 100,    // 推进器中间值(停止)
    SERVO_ANGLE_RANGE: 300 // 舵机最大角度(单位0.1度，对应30度)
};

// 创建UDP客户端
const udpClient = dgram.createSocket('udp4');

// 计算校验和 (按字节异或)
function calculateChecksum(buffer) {
    let checksum = 0;
    for (let i = 0; i < buffer.length; i++) {
        checksum ^= buffer[i];
    }
    return checksum & 0xFF; // 确保结果为8位
}

// 构建协议帧
function buildControlFrame(throttle, brushless, servoA, servoB, servoC, servoD, setzero, enableFlags) {
    // 参数处理
   
    throttle = throttle  + 100;
    
    // 舵机角度转换 (单位0.1度)
    servoA = Math.round(servoA * 10);
    servoB = Math.round(servoB * 10);
    servoC = Math.round(servoC * 10);
    servoD = Math.round(servoD * 10);
    
   // console.log([throttle, servoA, servoB, servoC, servoD]);

    // 创建缓冲区 (总长度: 2 + 1 + 2 + 4 + 12 + 1 + 2 = 24字节)
    const frame = Buffer.alloc(24);
    
    // 帧头 (0xAABB)
    frame.writeUInt16BE(0xAABB, 0);
    
    // 版本号 (0x01)
    frame.writeUInt8(0x01, 2);
    
    // 消息长度 (0x0018)
    frame.writeUInt16BE(0x0018, 3);
    
    // 消息ID (0xB0A00001)
    frame.writeUInt32BE(0xB0A00001, 5);
    
    // 消息参数区 (12字节)
    let paramOffset = 9;
    
    // 控制使能标志位
    // Bit 0: 推进器使能
    // Bit 1: 舵机A使能
    // Bit 2: 舵机B使能
    // Bit 3: 舵机C使能
    // Bit 4: 舵机D使能
    // Bit 5: 无刷电机使能
    // Bit 6: 舵机置零位
    let enableByte = 0x00;
    
    if (enableFlags) {
        // 如果传入了使能标志位，直接使用
        enableByte = enableFlags;
    } else {
        // 否则根据参数自动设置使能位
        if (throttle !== 0 && throttle !== 100) enableByte |= 0x01; // 推进器使能
        if (servoA !== 0) enableByte |= 0x02; // 舵机A使能
        if (servoB !== 0) enableByte |= 0x04; // 舵机B使能
        if (servoC !== 0) enableByte |= 0x08; // 舵机C使能
        if (servoD !== 0) enableByte |= 0x10; // 舵机D使能
        if (brushless !== 0) enableByte |= 0x20; // 无刷电机使能
    }
    
    if (setzero) {
        enableByte |= 0x40; // Bit 6置1 (置零位)
        console.log("舵机置零");
    }
    
    frame.writeUInt8(enableByte, paramOffset++);
    
    // 推进器信号量 (0-200)
    frame.writeUInt8(throttle, paramOffset++);
    
    // 舵机角度 (Short类型, 单位0.1度, 大端模式)
    frame.writeInt16BE(servoA, paramOffset); paramOffset += 2; // 舵机a
    frame.writeInt16BE(servoB, paramOffset); paramOffset += 2; // 舵机b
    frame.writeInt16BE(servoC, paramOffset); paramOffset += 2; // 舵机c
    frame.writeInt16BE(servoD, paramOffset); paramOffset += 2; // 舵机d
    
    // 无刷电机脉冲数 (Short类型, 单位10000脉冲为1转)
    frame.writeInt16BE(brushless, paramOffset); paramOffset += 2;
   // console.log(brushless, "无刷电机脉冲数");
    
    // 校验和 (计算从帧头到校验和前一字节)
    const checksum = calculateChecksum(frame.slice(0, 21));
    frame.writeUInt8(checksum, 21);
    
    // 帧尾 (0xEEFF)
    frame.writeUInt16BE(0xEEFF, 22);
    
    console.log("构建的协议帧:", frame);
    console.log("使能标志位:", enableByte.toString(2).padStart(8, '0'));
    return frame;
}

// 通过UDP发送数据
function sendUDPData(buffer) {
    udpClient.send(buffer, CONFIG.UDP_SERVER_PORT, CONFIG.UDP_SERVER_IP, (err) => {
        console.log("发送UDP数据");
        if (err) {
            console.error('UDP发送失败:', err.message);
        } else {
            // 打印调试信息
            process.stdout.write(`\rUDP发送成功 | 目标: ${CONFIG.UDP_SERVER_IP}:${CONFIG.UDP_SERVER_PORT} | 帧: ${buffer.toString('hex').toUpperCase()}\r`);
        }
    });
}

module.exports = {
    sendUDPData,
    buildControlFrame
};