const dgram = require('dgram');
const fs = require('fs');
const path = require('path');


// 配置参数 - 根据实际设备调整
const CONFIG = {
    
    // UDP配置
    UDP_SERVER_IP: '192.168.0.101',  // UDP服务器IP地址
    UDP_SERVER_PORT: 8003,       // UDP服务器端口号
};
// 协议常量
const HEADER = 0xAABB;
const VERSION = 0x01;
const FOOTER = 0xEEFF;
const CONFIG_MSG_ID = 0xB0A00004; // 配置下发消息ID

/**
 * 创建安全及控制配置数据包
 * @param {Object} config - 配置参数对象
 * @returns {Buffer} 打包后的二进制数据
 */
function createConfigPacket(config) {
    // 消息参数长度现在为39字节（原来35字节 + 新增4字节）
    //console.log(config);
    const messageBuffer = Buffer.alloc(2 + 1 + 2 + 4 + 36 + 1 + 2);
    
    let pos = 0;
    
    // 帧头
    messageBuffer.writeUInt16BE(HEADER, pos);
    pos += 2;
    
    // 版本号
    messageBuffer.writeUInt8(VERSION, pos);
    pos += 1;
    
    // 消息长度 (消息ID4字节 + 消息参数40字节 = 44字节 = 0x002C)
    messageBuffer.writeUInt16BE(0x0030, pos);
    pos += 2;
    
    // 消息ID
    messageBuffer.writeUInt32BE(CONFIG_MSG_ID, pos);
    pos += 4;
    
    // 消息参数
    // 1. rule_x_range (0-2字节)
    messageBuffer.writeUInt16BE(Math.round(config.rule_x_range / 100), pos);
    pos += 2;
    
    // 2. rule_y_range (2-4字节)
    messageBuffer.writeUInt16BE(Math.round(config.rule_y_range /100), pos);
    pos += 2;
    
    // 3. rule_depth_range (4-6字节)
    messageBuffer.writeInt16BE(Math.round(config.rule_depth_range * 10), pos);
    pos += 2;
    
    // 4. rule_altitude_range (6-8字节)
    messageBuffer.writeInt16BE(Math.round(config.rule_altitude_range * 10), pos);
    pos += 2;
    
    // 5. park_time (8-10字节)
    messageBuffer.writeInt16BE(Math.round(config.park_time * 10), pos);
    pos += 2;
    
    // 6. toleranceXY (10-12字节)
    messageBuffer.writeInt16BE(Math.round(config.toleranceXY * 10), pos);
    pos += 2;
    
    // 7. State_combine 1 (12字节)
    let stateCombine1 = 0;
    if (config.isGlide) stateCombine1 |= 0x01;
    if (config.isReturn) stateCombine1 |= 0x02;
    if (config.isRise) stateCombine1 |= 0x04;
    if (config.isSink) stateCombine1 |= 0x08;
    messageBuffer.writeUInt8(stateCombine1, pos);
    pos += 1;
    
    // 8. State_combine 2 (13字节)
    let stateCombine2 = 0;
    if (config.isMissionRelative) stateCombine2 |= 0x01;
    if (config.isDelaySink) stateCombine2 |= 0x02;
    if (config.isGrantPos) stateCombine2 |= 0x04;
    messageBuffer.writeUInt8(stateCombine2, pos);
    pos += 1;
    
    // 9. dock_times (14-16字节)
    messageBuffer.writeInt16BE(config.dock_times, pos);
    pos += 2;
    
    // 10. TBD (16-18字节) - 预留字段
    messageBuffer.writeInt16BE(config.TBD || 0, pos);
    pos += 2;
    
    // 11. return_range (18-20字节)
    messageBuffer.writeInt16BE(Math.round(config.return_range ), pos);
    pos += 2;
    
    // 12. return_pos_x (20-22字节)
    messageBuffer.writeInt16BE(Math.round(config.return_pos_x * 10), pos);
    pos += 2;
    
    // 13. return_pos_y (22-24字节)
    messageBuffer.writeInt16BE(Math.round(config.return_pos_y * 10), pos);
    pos += 2;
    
    // 14. pc_restart_enable (24字节)
    messageBuffer.writeUInt8(config.pc_restart_enable ? 1 : 0, pos);
    pos += 1;
    
    // 15. Pc_reconnect_times (25字节)
    messageBuffer.writeUInt8(config.pc_reconnect_times || 10, pos);
    pos += 1;
    
    // 16. State_combine 3 (26字节)
    let stateCombine3 = 0;
    if (config.camera_leds_enable) stateCombine3 |= 0x01;
    if (config.side_sonar_enable) stateCombine3 |= 0x02;
    if (config.wireless_comm_enable) stateCombine3 |= 0x04;
    messageBuffer.writeUInt8(stateCombine3, pos);
    pos += 1;
    
    // 17. Side_sonar_work_altitude (27字节)
    // // /*uint8	-	作业中期望前油馕位置
    //     uint8	-	作业中期望后油馕位置
    //     uint8	-	0：水池 1：湖上 2：海上*/
    messageBuffer.writeUInt8(config.expected_front_tank || 0, pos);
    pos += 1;
    
    // 18. Side_sonar_range_l (28字节)
    messageBuffer.writeUInt8(config.expected_rear_tank || 0, pos);
    pos += 1;
    
    // 19. 前拉线位移 (29字节)
    messageBuffer.writeUInt8(config.front_wire_displacement || 0, pos);
    pos += 1;
   // console.log("work_scene",config.work_scene);
    // 20. 后拉线位移 (30字节)
    messageBuffer.writeUInt8(config.rear_wire_displacement || 0, pos);
    pos += 1;
    
    // 21. Side_sonar_absorb_h (31字节)
    messageBuffer.writeUInt8(config.side_sonar_absorb_h || 0, pos);
    pos += 1;
    
    // 22. Side_sonar_gain_l (32字节)
    messageBuffer.writeUInt8(config.side_sonar_gain_l || 0, pos);
    pos += 1;
    
    // 23. Side_sonar_gain_h (33字节)
    messageBuffer.writeUInt8(config.side_sonar_gain_h || 0, pos);
    pos += 1;
    
    // 24. Grant_pos_time (34字节)
    messageBuffer.writeUInt8(config.grant_pos_time || 0, pos);
    pos += 1;
    
    // 25. Grant_pos_mode (35字节)
    messageBuffer.writeUInt8(config.grant_pos_mode || 0, pos);
    pos += 1;
    

    
    // 计算校验和（现在包括新添加的拉线位移参数）
    let checksum = 0;
    for (let i = 0; i < pos; i++) {
        checksum ^= messageBuffer[i];
    }
    messageBuffer.writeUInt8(checksum, pos);
    pos += 1;
    
    // 帧尾
    messageBuffer.writeUInt16BE(FOOTER, pos);
    
    return messageBuffer;
}



/**
 * 发送安全及控制配置指令
 * @param {Object} config - 配置参数对象
 * @param {string} configType - 配置类型描述
 */
// 创建UDP客户端
const udpClient = dgram.createSocket('udp4');
// 通过UDP发送数据
function sendConfigControl(buffer) {
    const sendbuffer = createConfigPacket(buffer);
    udpClient.send(sendbuffer, CONFIG.UDP_SERVER_PORT, CONFIG.UDP_SERVER_IP, (err) => {
      // console.log("fasong");
        if (err) {
            console.error('UDP发送失败:', err.message);
        } else {
            // 打印调试信息
     
            process.stdout.write(`\rUDP发送成功 | 目标: ${CONFIG.UDP_SERVER_IP}:${CONFIG.UDP_SERVER_PORT} | 帧: ${buffer.toString('hex').toUpperCase()}\r`);
        }
    });
}
// 默认配置参数
const DEFAULT_CONFIG = {
    // 范围参数 (单位: 米)
    rule_x_range: 100,           // X方向范围 0-60000米
    rule_y_range: 100,           // Y方向范围 0-60000米
    rule_depth_range: 50,        // 深度范围 -300~300米
    rule_altitude_range: 50,     // 高度范围 -300~300米
    
    // 时间参数 (单位: 秒)
    park_time: 60,               // 停泊时间 -300~300秒
    toleranceXY: 5,              // XY容差 -300~300米
    
    // 状态组合1
    isGlide: false,              // 是否滑行
    isReturn: false,             // 是否返回
    isRise: false,               // 是否上浮
    isSink: false,               // 是否下潜
    
    // 状态组合2
    isMissionRelative: true,     // 是否任务相关
    isDelaySink: false,          // 是否延迟下潜
    isGrantPos: false,           // 是否授权位置
    
    // 对接参数
    dock_times: 3,               // 对接次数
    TBD: 0,                      // 预留字段
    
    // 返回参数
    return_range: 100,           // 返回范围
    return_pos_x: 0,             // 返回位置X
    return_pos_y: 0,             // 返回位置Y
    
    // PC控制
    pc_restart_enable: false,    // PC重启使能
    pc_reconnect_times: 10,      // PC重连次数
    
    // 状态组合3
    camera_leds_enable: true,    // 相机/LED使能
    side_sonar_enable: true,     // 侧扫声纳使能
    wireless_comm_enable: true,  // 无线通信使能
    
    // 侧扫声纳参数
    side_sonar_work_altitude: 50,
    side_sonar_range_l: 0,
    side_sonar_range_h: 100,
    side_sonar_absorb_l: 0,
    side_sonar_absorb_h: 0,
    side_sonar_gain_l: 0,
    side_sonar_gain_h: 0,
    
    // 授权位置参数
    grant_pos_time: 30,          // 授权位置时间 (分钟)
    grant_pos_mode: 0,           // 授权位置模式 0:关闭推进器 1:深度控制
    
    // 新增：拉线位移参数 (单位: mm)
    front_wire_displacement: 0,  // 前拉线位移
    rear_wire_displacement: 0    // 后拉线位移
};

module.exports = {
    sendConfigControl,
    DEFAULT_CONFIG
};