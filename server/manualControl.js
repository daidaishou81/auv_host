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

// 查找手柄设备
function findGamepad() {
    try {
        const devices = HID.devices();
        console.log('检测到的HID设备:');
        
        // 查找目标手柄
        const targetDevice = devices.find(d => 
            d.vendorId === CONFIG.GAMEPAD_VID && d.productId === CONFIG.GAMEPAD_PID
        );
        const hidDevice = new HID.HID(targetDevice.path);
         hidDevice.setNonBlocking(1);  // 设置非阻塞读取
        if (!targetDevice) {
            console.log('\n未找到北通阿修罗2手柄，请检查连接或更新VID/PID参数');
            console.log('当前连接的HID设备:');
            devices.forEach(d => {
                console.log(`VID: 0x${d.vendorId.toString(16).padStart(4, '0')}, PID: 0x${d.productId.toString(16).padStart(4, '0')}, 名称: ${d.product}`);
            });
            process.exit(1);
        }
        
        console.log(`找到目标手柄: ${targetDevice.product}`);
        return  hidDevice;;
    } catch (error) {
        console.error('查找手柄失败:', error);
        process.exit(1);
    }
}

// 计算校验和 (按字节异或)
function calculateChecksum(buffer) {
    let checksum = 0;
    for (let i = 0; i < buffer.length; i++) {
        checksum ^= buffer[i];
    }
    return checksum & 0xFF; // 确保结果为8位
}

// 构建协议帧
function buildControlFrame(throttle,brushless, servoA, servoB, servoC, servoD,setzero) {
    
    if(throttle>0)throttle = throttle*100; 
    if(throttle<0)throttle = throttle*(-100)+100;
    servoA = servoA*(300);
    servoB = servoB*(300);
    
    servoC = servoC*(300);
    servoD = servoD*(-300);
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
    
    // 控制使能标志位 (Bit 0~5置1，Bit 6置0)
     if(setzero)
     {
        
        frame.writeUInt8(0x40, paramOffset++);
        
      //   console.log("chongzhi");
     }
     else{

         frame.writeUInt8(0x1F, paramOffset++);
     }
   
    // 推进器信号量 (0-200)
    frame.writeUInt8(throttle, paramOffset++);
    
    // 舵机角度 (Short类型, 单位0.1度, 大端模式)
    frame.writeInt16BE(servoC, paramOffset); paramOffset += 2; // 舵机a
    frame.writeInt16BE(servoD, paramOffset); paramOffset += 2; // 舵机b
    frame.writeInt16BE(servoA, paramOffset); paramOffset += 2; // 舵机c
    frame.writeInt16BE(servoB, paramOffset); paramOffset += 2; // 舵机d
      
    // 无刷电机脉冲数 (暂设为0)
    frame.writeInt16BE(brushless, paramOffset); paramOffset += 2; 
  
    
    // 校验和 (计算到校验和前一字节)  b       \
    const checksum = calculateChecksum(frame.slice(0, 21));
    
  
    frame.writeUInt8(checksum, 21);
    // 帧尾 (0xEEFF)
    frame.writeUInt16BE(0xEEFF, 22);

    return frame;
}
 
// 通过UDP发送数据
function sendUDPData(buffer) {
    udpClient.send(buffer, CONFIG.UDP_SERVER_PORT, CONFIG.UDP_SERVER_IP, (err) => {
    
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