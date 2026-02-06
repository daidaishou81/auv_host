// oil-tank.js - 紧凑版油量显示

class OilTankManager {
    constructor() {
        this.oilData = {
            front: { percentage: 75, volume: 1500, maxVolume: 2500 },
            rear: { percentage: 60, volume: 1200, maxVolume: 2500 },
            external: { percentage: 90, volume: 1800, maxVolume: 5000 }
        };
        
        // 添加拉线位移数据
        this.wireDisplacement = {
            front: 0,
            rear: 0
        };
        
        this.init();
    }

    init() {
        // 油桶按钮点击事件
        const oilTankBtn = document.getElementById('oil-tank-btn');
        if (oilTankBtn) {
            oilTankBtn.addEventListener('click', () => {
                this.showModal();
            });
        }

        // 模态框关闭事件
        const closeBtn = document.querySelector('#oil-tank-modal .close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideModal();
            });
        }

        // 模态框外部点击关闭
        const modal = document.getElementById('oil-tank-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }

        // 应用修正按钮
        const applyBtn = document.getElementById('apply-pulse-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyPulseCorrection();
            });
        }
        
        // 停止按钮
        const stopBtn = document.getElementById('oilstop-pulse-btn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stop();
            });
        }

        // 重置按钮
        const resetBtn = document.getElementById('reset-pulse-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetPulseInputs();
            });
        }

        // 初始化显示
        this.updateDisplay();
        this.updateWireDisplacementDisplay(); // 新增：更新拉线位移显示
    }

    showModal() {
        const modal = document.getElementById('oil-tank-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.updateDisplay();
            this.updateWireDisplacementDisplay(); // 新增：更新拉线位移显示
        }
    }

    hideModal() {
        const modal = document.getElementById('oil-tank-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    updateDisplay() {
        // 更新前油囊
        this.updateTankDisplay('front', this.oilData.front.percentage, this.oilData.front.volume);
        
        // 更新后油囊
        this.updateTankDisplay('rear', this.oilData.rear.percentage, this.oilData.rear.volume);
        
        // 更新外油囊
        this.updateTankDisplay('external', this.oilData.external.percentage, this.oilData.external.volume);
    }

    updateTankDisplay(tankType, percentage, volume) {
        const levelElement = document.getElementById(`${tankType}-oil-level`);
        const percentageElement = document.getElementById(`${tankType}-oil-percentage`);
        const volumeElement = document.getElementById(`${tankType}-oil-volume`);
        
        if (levelElement) {
            levelElement.style.height = `${percentage}%`;
            this.setOilLevelColor(levelElement, percentage);
        }
        
        if (percentageElement) {
            percentageElement.textContent = `${percentage}%`;
        }
        
        if (volumeElement) {
            volumeElement.textContent = volume;
        }
    }

    setOilLevelColor(element, percentage) {
        if (percentage > 70) {
            element.style.background = 'linear-gradient(to top, #2ecc71, #27ae60)';
        } else if (percentage > 30) {
            element.style.background = 'linear-gradient(to top, #f1c40f, #f39c12)';
        } else {
            element.style.background = 'linear-gradient(to top, #e74c3c, #c0392b)';
        }
    }
    
    // 新增：更新拉线位移显示
    updateWireDisplacementDisplay() {
        const frontWireElement = document.getElementById('front-wire-displacement');
        const rearWireElement = document.getElementById('rear-wire-displacement');
        
        if (frontWireElement) {
            frontWireElement.value = this.wireDisplacement.front;
        }
        
        if (rearWireElement) {
            rearWireElement.value = this.wireDisplacement.rear;
        }
    }

    // 新增：更新拉线位移数据
    updateWireDisplacement(data) {
        if (data.frontWireDisplacement !== undefined) {
            this.wireDisplacement.front = data.frontWireDisplacement;
        }
        
        if (data.rearWireDisplacement !== undefined) {
            this.wireDisplacement.rear = data.rearWireDisplacement;
        }
        
        this.updateWireDisplacementDisplay();
    }

    stop(){
        const frontPulse = parseInt(document.getElementById('front-pulse').value) || 0;
        const rearPulse = parseInt(document.getElementById('rear-pulse').value) || 0;
        
        // 发送到服务器
        if (window.ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'oil-pulse-correction',
                oilControl: 0,
                oilfrontPulse: frontPulse,
                oilrearPulse: rearPulse,
                timestamp: Date.now()
            }));
        }

        if (window.showMessage) {
            showMessage('油泵已停止', 'info');
        }
    }

    applyPulseCorrection() {
        const frontPulse = parseInt(document.getElementById('front-pulse').value) || 0;
        const rearPulse = parseInt(document.getElementById('rear-pulse').value) || 0;

        if (frontPulse < 0 || frontPulse > 10000 || rearPulse < 0 || rearPulse > 10000) {
            if (window.showMessage) {
                showMessage('脉冲值必须在0-10000之间', 'error');
            }
            return;
        }

        // 模拟脉冲修正效果
        const frontEffect = frontPulse * 0.001;
        const rearEffect = rearPulse * 0.001;

        this.oilData.front.percentage = Math.max(0, Math.min(100, this.oilData.front.percentage + frontEffect));
        this.oilData.rear.percentage = Math.max(0, Math.min(100, this.oilData.rear.percentage + rearEffect));

        // 更新油量体积
        this.oilData.front.volume = Math.round((this.oilData.front.percentage / 100) * this.oilData.front.maxVolume);
        this.oilData.rear.volume = Math.round((this.oilData.rear.percentage / 100) * this.oilData.rear.maxVolume);

        this.updateDisplay();
        
        // 发送到服务器
        if (window.ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'oil-pulse-correction',
                oilControl: 1,
                oilfrontPulse: frontPulse,
                oilrearPulse: rearPulse,
                timestamp: Date.now()
            }));
        }

        if (window.showMessage) {
            showMessage(`脉冲修正已应用`, 'success');
        }
    }

    resetPulseInputs() {
        document.getElementById('front-pulse').value = 0;
        document.getElementById('rear-pulse').value = 0;
        
        if (window.showMessage) {
            showMessage('脉冲输入已重置', 'info');
        }
    }

    // 从服务器更新油量数据
    updateFromServer(data) {
        if (data.frontOil !== undefined) {
            this.oilData.front.percentage = data.frontOil;
            this.oilData.front.volume = Math.round((data.frontOil / 100) * this.oilData.front.maxVolume);
        }
        
        if (data.rearOil !== undefined) {
            this.oilData.rear.percentage = data.rearOil;
            this.oilData.rear.volume = Math.round((data.rearOil / 100) * this.oilData.rear.maxVolume);
        }
        
        if (data.externalOil !== undefined) {
            this.oilData.external.percentage = data.externalOil;
            this.oilData.external.volume = Math.round((data.externalOil / 100) * this.oilData.external.maxVolume);
        }

        // 新增：更新拉线位移数据
        if (data.frontWireDisplacement !== undefined || data.rearWireDisplacement !== undefined) {
            this.updateWireDisplacement(data);
        }

        this.updateDisplay();
    }
}

// 在main.js中初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化油量管理器
    window.oilTankManager = new OilTankManager();

});