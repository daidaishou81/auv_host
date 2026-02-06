const coordinateConverter = require('./coordinateConverter');
const udpPathSender = require('./udpPathSender');
const powerControl = require('./powerControl');
const buoyancyControl = require('./buoyancyControlSender');
const udpvoice = require('./udpvoice.js');
const manual = require('./manualControl.js');

const thrusterControl = require('./thruster-control.js');
const glideSender = require('./glidesender.js');
const safetyConfig = require('./safe.js');

const deviceChecker = require('./selfcheck.js'); 
const ping = require('ping');
function setupWebSocket(wss) {
    wss.on('connection', (ws, req) => {
        console.log(`新客户端连接: ${req.socket.remoteAddress}`);
        
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                // 关键修复：处理特定类型的消息
                switch (data.type) {
                    case 'control-mode':
                        console.log(`处理控制模式切换: ${data.mode}`);
                        // 在这里添加模式切换的业务逻辑
                         handleControlModeChange(wss, data.deviceId, data.mode);
                        break;
                        // 处理安全配置消息
                             // 新增设备自检消息处理
                    case 'device-selfcheck':
                        console.log(`收到设备自检请求: ${data.device_selfcheck_ip}`);
                        // 2. 批量检测设备
                            async function checkMultipleDevices() {
                                const devices = [
                                    { ip: '192.168.0.100', id: 'cam-001', name: 'CTD' },
                                    { ip: '192.168.0.101', id: 'nvr-001', name: 'DVL' },
                                    { ip: '192.168.0.102', id: 'ap-001', name: '无线AP' }
                                ];
                                
                                const results = await deviceChecker.checkDevices(devices,wss);
                                console.log('批量检测结果:', results);
                            }
                            checkMultipleDevices();
                        break;
                    case 'safety-config':
                        console.log('收到安全配置消息');
                        // 使用safe.js中的协议下发配置
                        safetyConfig.sendConfigControl(data.config, 'web-safety-config');
                        break;
                    case 'path-data':
                         
                         udpPathSender.sendPathToDevice(data.points);
                        // 添加路径数据处理逻辑
                        break;
                               
                    case 'glidemode':         // 处理滑行任务消息
                        
                        console.log('收到滑行任务消息');
                        // 使用glidesender.js发送滑行任务
                        glideSender.sendGlideTask(data.glidemode);
                        break;
                    case 'oil-pulse-correction': 
                           if(data.oilControl)buoyancyControl.sendBuoyancyControl(  buoyancyCobuoyancyControl.ntrol.COMMAND.START,  data.oilfrontPulse, data.oilrearPulse);
                           
                           if(data.oilControl == 0)buoyancyControl.sendBuoyancyControl(  buoyancyCobuoyancyControl.ntrol.COMMAND.STOP,  data.oilfrontPulse, data.oilrearPulse); 
                         break;
                    case 'power-contorl':
                        //console.log('server',data.powerControltpye);
                          powerControl.sendPowerControl(data.powerControltpye, true);
                        break;
                    case 'beidou-send':
                                console.log('收到北斗下发消息');
                                const beidouSender = require('./beidouPathSender');
                                beidouSender.sendBeidouPath(
                                    data.beidousendpoints, 
                                    data.beidousendmode, 
                                    data.beidousendreceiverId
                                );
                               // console.log("sssss", data.beidousendpoints);
                                break;
              case 'all-controls':
                           // console.log('收到所有控制命令:', data);
                            // 使用thrusterControl构建控制帧
                            // 参数顺序：throttle, brushless, servoA, servoB, servoC, servoD, setzero, enableFlags
                            const frame = thrusterControl.buildControlFrame(
                                data.thruster, 
                                data.brushless, 
                                data.leftRudder,  // 舵机A (左)
                                data.rightRudder, // 舵机B (右) 
                                data.upperRudder, // 舵机C (上)
                                data.lowerRudder, // 舵机D (下)
                                data.setzero || false,
                                data.enableFlags  // 传入使能标志位
                            );
                            thrusterControl.sendUDPData(frame);
                            break;
                    case 'xbox-control':
                        //推进器 下 上 左 右
                    //manual.sendUDPData(manual.buildControlFrame(0, 0,null, null, null, 0,0));
                       
                       if(data.setzero){
                        manual.sendUDPData(manual.buildControlFrame(0,0, 0, 0, 0,0,1));
                       }
                       else{
                       // if(data.ruddertype == 'lower-rudder') manual.sendUDPData(manual.buildControlFrame(data.leftStickY,data.brushless, data.rightStickX, data.rightStickX, data.rightStickY, data.rightStickY,0));
                     // console.log("tuijinqi ",data.rightStickY);
                         manual.sendUDPData(manual.buildControlFrame(data.rightStickY,data.brushless, data.leftStickX*(-1), data.leftStickX, data.leftStickY, data.leftStickY,0));
                       }
                       
                       // 添加设备切换逻辑
                        break;
                   case 'device-selfcheck':
                                pingHost(data.device_selfcheck_ip).then(result => {
                                    console.log(result);
                                });
                        break;
                    case'start-mission':
                          //  console.log("data.path_mission_state",data.path_mission_state);
                            if(data.path_mission_state == 'ture') 
                                {
                                      powerControl.sendPowerControl('mission_start', true);
                                  
                                    
                                }  
                           else{
                                        powerControl.sendPowerControl('mission_end', false);
                                }
                            break;                         // 单个设备控制

                    default:
                        console.log(`未知消息类型: ${data.type}`);
                }
            } catch (error) {
                console.error('客户端消息解析错误:', error);
            }
        });

        ws.on('close', () => {
            console.log('客户端断开连接');
        });

        ws.on('error', (error) => {
            console.error('WebSocket错误:', error);
        });
    });
}
async function pingHost(host) {
    try {
        let res = await ping.promise.probe(host);
        return {
            host: res.host,
            alive: res.alive,
            time: res.time,
        };
    } catch (error) {
        throw error;
    }
}

// // 使用
// pingHost('192.168.0.202').then(result => {
//     console.log(result);
// });

// 修改后的处理函数 - 包含模式切换逻辑和数据回传
function handleControlModeChange(wss, deviceId, mode) {
    console.log(`设备 ${deviceId} 控制模式已切换为: ${mode}`);
    
    // 这里可以添加模式切换的实际业务逻辑
    // 例如: 更新数据库、通知TCP设备等
    
    // 将模式信息发送回Web端，类似北斗数据格式
    const modeDataWithType = {
        type: 'control-mode-update',
        deviceId: deviceId,
        mode: mode,
        timestamp: Date.now()
    };
    
    // 广播给所有连接的Web客户端
    if (wss) {
        wss.clients.forEach(client => {
            if (client.readyState === require('ws').OPEN) {
                client.send(JSON.stringify(modeDataWithType));
            }
        });
    }
}

module.exports = setupWebSocket;