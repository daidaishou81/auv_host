// 安全配置功能
class SafetyConfigManager {
    constructor() {
        this.currentConfig = {};
        this.initializeEventListeners();
        this.loadDefaultConfig();
    }

    initializeEventListeners() {
        // 发送安全配置按钮
        document.getElementById('send-safety-config').addEventListener('click', () => {
           // console.log("senddddd");
            this.sendSafetyConfig();
        });

        // 加载默认配置按钮
        document.getElementById('load-default-safety').addEventListener('click', () => {
            this.loadDefaultConfig();
        });

        // 保存配置模板按钮
        document.getElementById('save-safety-profile').addEventListener('click', () => {
            this.saveConfigProfile();
        });
    }

    loadDefaultConfig() {
        const defaultConfig = {
            rule_x_range: 300,
            rule_y_range: 300,
            rule_depth_range: 5,
            rule_altitude_range: 0.01,
            park_time: 60,
            toleranceXY: 18,
            
              
            // 新增的三个配置项
            expected_front_tank: 0,
            expected_rear_tank: 0,
            work_scene: 0,
            front_wire_displacement: 0,
            rear_wire_displacement: 0,
            isGlide: false,
            isReturn: false,
            isRise: false,
            isSink: false,
            isMissionRelative: false,
            isDelaySink: false,
            isGrantPos: false,
            dock_times: 3,
            return_range: 100,
            return_pos_x: 0,
            return_pos_y: 0,
            pc_restart_enable: false,
            pc_reconnect_times: 10,
            camera_leds_enable: true,
            side_sonar_enable: true,
            wireless_comm_enable: true,
            side_sonar_work_altitude: 50,
            side_sonar_range_l: 0,
            side_sonar_range_h: 100,
            side_sonar_absorb_l: 0,
            side_sonar_absorb_h: 0,
            side_sonar_gain_l: 0,
            side_sonar_gain_h: 0,
            grant_pos_time: 30,
            grant_pos_mode: 0
        };

        this.populateForm(defaultConfig);
        this.updateStatus('默认配置已加载', 'success');
    }

    populateForm(config) {
        // 设置数值输入框
        Object.keys(config).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = config[key];
                } else if (element.type === 'select-one') {
                    element.value = config[key];
                } else {
                    element.value = config[key];
                }
            }
        });
    }

    collectFormData() {
        const config = {};
        
        // 收集数值和选择框数据
        const inputElements = document.querySelectorAll('#safety-tab .config-input, #safety-tab .config-select');
        inputElements.forEach(element => {
            if (element.type === 'number') {
                config[element.id] = parseFloat(element.value) || 0;
            } else {
                config[element.id] = element.value;
            }
        });

        // 收集复选框数据
        const checkboxElements = document.querySelectorAll('#safety-tab .state-checkbox');
        checkboxElements.forEach(element => {
            config[element.id] = element.checked;
        });

        return config;
    }

    async sendSafetyConfig() {
        try {
            const config = this.collectFormData();
            console.log("config",config);
            this.updateStatus('正在发送安全配置...', 'info');

            // 通过WebSocket发送安全配置数据
            this.sendSafetyConfigViaWebSocket(config);              
            
        } catch (error) {
            console.error('发送安全配置失败:', error);
            this.updateStatus('发送失败: ' + error.message, 'error');
            this.showNotification('安全配置发送失败', 'error');
        }
    }

    sendSafetyConfigViaWebSocket(config) {
        // 使用与power.js相同的方式发送WebSocket消息
        if (typeof sendPathDataToServer === 'function') {
            sendPathDataToServer({
                type: 'safety-config',
                config: config
            });
            this.updateStatus('安全配置发送成功', 'success');
            this.showNotification('安全配置已成功发送到设备', 'success');
        } 
        else {
            // 备用方案：直接使用WebSocket
            if (window.websocket && window.websocket.readyState === WebSocket.OPEN) {
                window.websocket.send(JSON.stringify({
                    type: 'safety-config',
                    config: config
                }));
                this.updateStatus('安全配置发送成功', 'success');
                this.showNotification('安全配置已成功发送到设备', 'success');
            } else {
                throw new Error('WebSocket连接不可用');
            }
        }
    }

    saveConfigProfile() {
        const config = this.collectFormData();
        const profileName = prompt('请输入配置模板名称:', '安全配置模板');
        
        if (profileName) {
            const profiles = JSON.parse(localStorage.getItem('safetyProfiles') || '{}');
            profiles[profileName] = config;
            localStorage.setItem('safetyProfiles', JSON.stringify(profiles));
            
            this.updateStatus(`配置模板 "${profileName}" 已保存`, 'success');
            this.showNotification('配置模板保存成功', 'success');
        }
    }

    updateStatus(message, type = 'info') {
        const statusElement = document.getElementById('safety-status');
        const messageElement = statusElement.querySelector('.status-message');
        
        messageElement.textContent = message;
        statusElement.className = 'safety-status';
        
        switch (type) {
            case 'success':
                statusElement.style.background = 'rgba(76, 175, 80, 0.2)';
                messageElement.style.color = '#a5d6a7';
                break;
            case 'error':
                statusElement.style.background = 'rgba(244, 67, 54, 0.2)';
                messageElement.style.color = '#ef9a9a';
                break;
            case 'info':
                statusElement.style.background = 'rgba(33, 150, 243, 0.2)';
                messageElement.style.color = '#90caf9';
                break;
        }
    }

    showNotification(message, type = 'info') {
        // 使用现有的消息通知系统
        if (window.showMessage) {
            window.showMessage(message, type);
        } else {
            alert(message);
        }
    }
}

// 初始化安全配置管理器
let safetyConfigManager;

document.addEventListener('DOMContentLoaded', function() {
    safetyConfigManager = new SafetyConfigManager();
    
    // 安全配置选项卡切换
    document.querySelectorAll('.tab[data-tab="safety"]').forEach(tab => {
        tab.addEventListener('click', function() {
            // 确保安全配置管理器已初始化
            if (!safetyConfigManager) {
                safetyConfigManager = new SafetyConfigManager();
            }
        });
    });
});