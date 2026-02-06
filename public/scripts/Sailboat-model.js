// sailboat-model.js - 帆船模型可视化组件
class SailboatModel {
    constructor(map, options = {}) {
        this.map = map;
        this.options = Object.assign({
            width: 100,
            height: 80,
            showControls: false,  // 禁用控制面板
            showCompass: false    // 禁用罗盘
        }, options);
        
        this.state = {
            heading: 0,      // 艏向 (船头方向)
            course: 0,       // 航向 (实际航行方向)
            sailAngle: 0,    // 帆角 (帆与船中心线的夹角)
            rudderAngle: 0,  // 舵角 (舵与船中心线的夹角)
            windDirection: 0, // 风向 (风来的方向)
            windSpeed: 5,    // 风速
            latlng: [0, 0]   // 位置坐标
        };
        
        this.init();
    }
    
    init() {
        this.createMarker();
        this.updateDisplay();
    }
    
    createMarker() {
        // 创建自定义帆船图标
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;
        this.ctx = this.canvas.getContext('2d');
        
        // 创建 Leaflet 图标
        this.icon = L.divIcon({
            className: 'sailboat-marker',
            html: this.canvas,
            iconSize: [this.options.width, this.options.height],
            iconAnchor: [this.options.width / 2, this.options.height / 2]
        });
        
        // 创建标记
        this.marker = L.marker(this.state.latlng, {
            icon: this.icon,
            rotationAngle: 0,
            rotationOrigin: 'center'
        }).addTo(this.map);
    }
    
    updateState(newState) {
        Object.assign(this.state, newState);
        this.updateDisplay();
    }
    
    updateDisplay() {
        // 更新位置
        if (this.state.latlng) {
            this.marker.setLatLng(this.state.latlng);
        }
        
        // 更新旋转角度（艏向）
        this.marker.setRotationAngle(this.state.heading);
        
        // 重绘帆船
        this.drawSailboat();
    }
    
    drawSailboat() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 设置船体中心点
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // 绘制船体
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // 船体
        ctx.fillStyle = '#76ce04ff';
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.bezierCurveTo(-25, -10, 25, -10, 30, 0);
        ctx.bezierCurveTo(25, 8, -25, 8, -30, 0);
        ctx.fill();
        
        // 甲板
        ctx.fillStyle = '#4E342E';
        ctx.beginPath();
        ctx.moveTo(-28, 0);
        ctx.bezierCurveTo(-23, -8, 23, -8, 28, 0);
        ctx.lineTo(28, 2);
        ctx.bezierCurveTo(23, -6, -23, -6, -28, 2);
        ctx.closePath();
        ctx.fill();
        
        // 桅杆
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(-1, -15, 2, 30);
        
        // 帆
        this.drawSail(ctx);
        
        // 舵
        this.drawRudder(ctx);
        
        // 绘制航向箭头
        this.drawCourseArrow(ctx);
        
        ctx.restore();
        
        // 绘制风向指示
        this.drawWindIndicator(ctx, centerX, centerY);
    }
    
    drawSail(ctx) {
        ctx.save();
        ctx.rotate(this.state.sailAngle * Math.PI / 180);
        
        // 帆杆
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(15, 0);
        ctx.stroke();
        
        // 帆
        const sailGradient = ctx.createLinearGradient(0, -6, 15, 6);
        sailGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        sailGradient.addColorStop(1, 'rgba(220, 220, 220, 0.7)');
        
        ctx.fillStyle = sailGradient;
        ctx.strokeStyle = '#BDBDBD';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(15, -5);
        ctx.lineTo(15, 5);
        ctx.lineTo(0, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
    
    drawRudder(ctx) {
        ctx.save();
        ctx.translate(-28, 0);
        ctx.rotate(this.state.rudderAngle * Math.PI / 180);
        
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(-2, -4, 4, 12);
        
        // 舵柄
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(-8, -4, 16, 3);
        
        ctx.restore();
    }
    
    drawCourseArrow(ctx) {
        const courseRelative = (this.state.course - this.state.heading + 360) % 360;
        
        ctx.save();
        ctx.rotate(courseRelative * Math.PI / 180);
        
        // 箭头线
        ctx.strokeStyle = '#FF5252';
        ctx.fillStyle = '#FF5252';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -40);
        ctx.stroke();
        
        // 箭头头部
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.lineTo(-3, -32);
        ctx.lineTo(3, -32);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    drawWindIndicator(ctx, centerX, centerY) {
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // 计算风向箭头的方向（风向是风来的方向，所以箭头方向与风向相反）
        const windArrowDirection = (this.state.windDirection - this.state.heading + 360) % 360;
        ctx.rotate(windArrowDirection * Math.PI / 180);
        
        // 绘制风向箭头
        ctx.strokeStyle = '#4FC3F7';
        ctx.fillStyle = '#4FC3F7';
        ctx.lineWidth = 1;
        
        // 箭头线
        ctx.beginPath();
        ctx.moveTo(0, -50);
        ctx.lineTo(0, -25);
        ctx.stroke();
        
        // 箭头头部
        ctx.beginPath();
        ctx.moveTo(0, -50);
        ctx.lineTo(-4, -40);
        ctx.lineTo(4, -40);
        ctx.closePath();
        ctx.fill();
        
        // 绘制风速度指示
        const windLines = Math.min(5, Math.floor(this.state.windSpeed / 2));
        for (let i = 0; i < windLines; i++) {
            const offset = -25 - i * 4;
            ctx.beginPath();
            ctx.moveTo(-6, offset);
            ctx.lineTo(6, offset);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    // 设置位置
    setPosition(latlng) {
        this.state.latlng = latlng;
        this.updateDisplay();
    }
    
    // 设置角度参数
    setAngles(heading, course, sailAngle, rudderAngle, windDirection) {
        this.state.heading = heading || this.state.heading;
        this.state.course = course || this.state.course;
        this.state.sailAngle = sailAngle || this.state.sailAngle;
        this.state.rudderAngle = rudderAngle || this.state.rudderAngle;
        this.state.windDirection = windDirection || this.state.windDirection;
        this.updateDisplay();
    }
    
    // 设置风速
    setWindSpeed(windSpeed) {
        this.state.windSpeed = windSpeed;
        this.updateDisplay();
    }
    
    // 获取当前状态
    getState() {
        return {...this.state};
    }
    
    // 销毁方法
    destroy() {
        if (this.marker) {
            this.map.removeLayer(this.marker);
        }
    }
}

// 导出给全局使用
window.SailboatModel = SailboatModel;