// pin-manager.js
class PinManager {
    constructor(map) {
        this.map = map;
        this.pins = new Map(); // 存储图钉数据，key为pinId，value为{pin, circle, data}
        this.nextPinId = 1;
        this.isPlacingMode = false;
        this.currentEditingPin = null;
        
        this.initModal();
        this.initControl();
        this.loadPinsFromStorage();
    }

    // 初始化模态框
    initModal() {
        // 创建模态框HTML
        const modalHTML = `
            <div id="pin-manager-modal" class="modal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <div class="modal-title">
                            <i class="fas fa-thumbtack"></i>
                            <span>图钉管理器</span>
                        </div>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="pin-controls">
                            <button id="add-pin-btn" class="path-button">
                                <i class="fas fa-plus"></i> 添加图钉
                            </button>
                            <button id="clear-all-pins-btn" class="path-button clear">
                                <i class="fas fa-trash"></i> 清理所有图钉
                            </button>
                            <button id="export-pins-btn" class="path-button">
                                <i class="fas fa-download"></i> 导出图钉
                            </button>
                            <button id="import-pins-btn" class="path-button">
                                <i class="fas fa-upload"></i> 导入图钉
                            </button>
                            <input type="file" id="pins-file-input" accept=".json" style="display: none;">
                        </div>
                        
                        <div class="pin-list-container">
                            <div class="pin-list-header">
                                <span>ID</span>
                                <span>名称</span>
                                <span>坐标</span>
                                <span>半径(米)</span>
                                <span>图片</span>
                                <span>操作</span>
                            </div>
                            <div class="pin-list" id="pin-list"></div>
                        </div>
                        
                        <div class="pin-editor" id="pin-editor" style="display: none;">
                            <h3>编辑图钉</h3>
                            <div class="editor-form">
                                <div class="form-group">
                                    <label for="pin-name">名称:</label>
                                    <input type="text" id="pin-name" class="form-input" placeholder="输入图钉名称">
                                </div>
                                <div class="form-group">
                                    <label for="pin-lat">纬度:</label>
                                    <input type="number" id="pin-lat" class="form-input" step="any">
                                </div>
                                <div class="form-group">
                                    <label for="pin-lng">经度:</label>
                                    <input type="number" id="pin-lng" class="form-input" step="any">
                                </div>
                                <div class="form-group">
                                    <label for="pin-radius">半径(米):</label>
                                    <input type="number" id="pin-radius" class="form-input" min="0" value="10">
                                </div>
                                <div class="form-group">
                                    <label for="pin-image">图片URL:</label>
                                    <input type="text" id="pin-image" class="form-input" placeholder="输入图片URL">
                                    <button type="button" id="browse-image-btn" class="path-button" style="margin-top: 5px;">
                                        <i class="fas fa-folder-open"></i> 选择图片
                                    </button>
                                    <input type="file" id="image-file-input" accept="image/*" style="display: none;">
                                    <div id="image-preview" style="margin-top: 10px; display: none;">
                                        <img id="preview-img" src="" alt="图片预览" style="max-width: 100px; max-height: 100px;">
                                    </div>
                                </div>
                                <div class="form-actions">
                                    <button id="save-pin-btn" class="path-button">保存</button>
                                    <button id="cancel-edit-btn" class="path-button clear">取消</button>
                                    <button id="delete-pin-btn" class="path-button clear">删除</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 添加到body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 绑定事件
        this.bindEvents();
    }

    // 初始化地图控件
    initControl() {
        const PinControl = L.Control.extend({
            options: {
                position: 'topright'
            },
            
            onAdd: function(map) {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom pin-control');
                container.innerHTML = '<i class="fas fa-thumbtack"></i>';
                container.title = '图钉管理器';
                
                // 添加样式
                container.style.backgroundColor = 'rgba(10, 25, 41, 0.7)';
                container.style.border = '1px solid rgba(0, 167, 255, 0.3)';
                container.style.color = '#fff';
                container.style.padding = '5px';
                container.style.borderRadius = '4px';
                container.style.cursor = 'pointer';
                container.style.right = '10px';
                container.style.top = '0px';
                container.style.display = 'absolute';
                container.style.alignItems = 'center';
                container.style.justifyContent = 'center';
                container.style.width = '30px';
                container.style.height = '30px';
                
                container.onclick = function() {
                    window.pinManager.openModal();
                };
                
                L.DomEvent.disableClickPropagation(container);
                
                return container;
            }
        });
        
        this.map.addControl(new PinControl());
    }

    // 绑定事件
    bindEvents() {
        const modal = document.getElementById('pin-manager-modal');
        
        // 关闭模态框
        modal.querySelector('.close-modal').addEventListener('click', () => {
            this.closeModal();
        });
        
        // 添加图钉按钮
        document.getElementById('add-pin-btn').addEventListener('click', () => {
            this.startPlacingMode();
        });
        
        // 清理所有图钉
        document.getElementById('clear-all-pins-btn').addEventListener('click', () => {
            this.clearAllPins();
        });
        
        // 导出图钉
        document.getElementById('export-pins-btn').addEventListener('click', () => {
            this.exportPins();
        });
        
        // 导入图钉
        document.getElementById('import-pins-btn').addEventListener('click', () => {
            document.getElementById('pins-file-input').click();
        });
        
        // 文件输入变化
        document.getElementById('pins-file-input').addEventListener('change', (e) => {
            this.importPins(e.target.files[0]);
        });
        
        // 保存图钉编辑
        document.getElementById('save-pin-btn').addEventListener('click', () => {
            this.savePinEdit();
        });
        
        // 取消编辑
        document.getElementById('cancel-edit-btn').addEventListener('click', () => {
            this.cancelPinEdit();
        });
        
        // 删除图钉
        document.getElementById('delete-pin-btn').addEventListener('click', () => {
            this.deleteCurrentPin();
        });
        
        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
        
        // 坐标输入变化时更新图钉位置
        document.getElementById('pin-lat').addEventListener('change', () => {
            this.updatePinPositionFromInput();
        });
        
        document.getElementById('pin-lng').addEventListener('change', () => {
            this.updatePinPositionFromInput();
        });
        
        // 半径输入变化时更新圆
        document.getElementById('pin-radius').addEventListener('change', () => {
            this.updatePinRadius();
        });
        
        // 浏览图片按钮
        document.getElementById('browse-image-btn').addEventListener('click', () => {
            document.getElementById('image-file-input').click();
        });
        
        // 图片文件输入变化
        document.getElementById('image-file-input').addEventListener('change', (e) => {
            this.handleImageSelect(e.target.files[0]);
        });
        
        // 图片URL输入变化
        document.getElementById('pin-image').addEventListener('change', () => {
            this.updateImagePreview();
        });
    }

    // 处理图片选择
    handleImageSelect(file) {
        if (!file) return;
        
        // 创建对象URL用于预览
        const objectUrl = URL.createObjectURL(file);
        document.getElementById('pin-image').value = objectUrl;
        this.updateImagePreview();
    }

    // 更新图片预览
    updateImagePreview() {
        const imageUrl = document.getElementById('pin-image').value;
        const previewContainer = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-img');
        
        if (imageUrl) {
            previewImg.src = imageUrl;
            previewContainer.style.display = 'block';
            
            // 加载图片获取尺寸
            const img = new Image();
            img.onload = function() {
                previewImg.alt = `预览图 (${img.width}×${img.height}px)`;
            };
            img.src = imageUrl;
        } else {
            previewContainer.style.display = 'none';
        }
    }

    // 打开模态框
    openModal() {
        const modal = document.getElementById('pin-manager-modal');
        modal.style.display = 'block';
        this.updatePinList();
        this.exitPlacingMode();
    }

    // 关闭模态框
    closeModal() {
        const modal = document.getElementById('pin-manager-modal');
        modal.style.display = 'none';
        this.exitPlacingMode();
        this.cancelPinEdit();
    }

    // 开始放置模式
    startPlacingMode() {
        this.isPlacingMode = true;
        this.map.getContainer().style.cursor = 'crosshair';
        document.getElementById('add-pin-btn').classList.add('active');
        
        // 绑定地图点击事件
        this.map.on('click', this.handleMapClick.bind(this));
        const modal = document.getElementById('pin-manager-modal');
        modal.style.display = 'none';
    }

    // 退出放置模式
    exitPlacingMode() {
        this.isPlacingMode = false;
        this.map.getContainer().style.cursor = '';
        document.getElementById('add-pin-btn').classList.remove('active');
        
        // 移除地图点击事件
        this.map.off('click', this.handleMapClick.bind(this));
    }

    // 处理地图点击事件
    handleMapClick(e) {
        if (!this.isPlacingMode) return;
        
        const pinId = this.nextPinId++;
        const latlng = e.latlng;
        
        // 默认图钉图片
        const defaultImage = 'img/tuding/tuding.svg';
        
        this.createPin(pinId, latlng.lat, latlng.lng, `图钉${pinId}`, 10, defaultImage);
        this.updatePinList();
        this.exitPlacingMode();
    }

    // 创建图钉
    createPin(pinId, lat, lng, name = `图钉${pinId}`, radius = 10, imageUrl = 'img/tuding/tuding.svg') {
        // 创建图钉标记
        const pinIcon = L.icon({
            iconUrl: imageUrl,
            iconSize: [32, 32], // 默认图标尺寸
            iconAnchor: [16, 16], // 图标锚点（中心）
            popupAnchor: [0, -16] // 弹出框锚点
        });
        
        const pin = L.marker([lat, lng], {
            icon: pinIcon,
            draggable: true
        }).addTo(this.map);
        
        // 创建圆（使用固定颜色，因为不再需要颜色选择）
        const circle = L.circle([lat, lng], {
            radius: radius,
            color: '#3388ff', // 固定颜色
            fillColor: '#3388ff',
            fillOpacity: 0.1,
            weight: 2
        }).addTo(this.map);
        
        // 绑定拖动事件
        pin.on('drag', (e) => {
            const newLatLng = e.target.getLatLng();
            circle.setLatLng(newLatLng);
            
            // 更新存储的数据
            const pinData = this.pins.get(pinId);
            if (pinData) {
                pinData.data.lat = newLatLng.lat;
                pinData.data.lng = newLatLng.lng;
            }
        });
        
        // 绑定点击事件（编辑）
        pin.on('click', () => {
            this.editPin(pinId);
        });
        
        // 存储图钉数据
        this.pins.set(pinId, {
            pin: pin,
            circle: circle,
            data: {
                id: pinId,
                name: name,
                lat: lat,
                lng: lng,
                radius: radius,
                imageUrl: imageUrl
            }
        });
        
        this.savePinsToStorage();
        return pinId;
    }

    // 编辑图钉
    editPin(pinId) {
        const pinData = this.pins.get(pinId);
        if (!pinData) return;
        
        this.currentEditingPin = pinId;
        
        // 填充表单
        document.getElementById('pin-name').value = pinData.data.name;
        document.getElementById('pin-lat').value = pinData.data.lat;
        document.getElementById('pin-lng').value = pinData.data.lng;
        document.getElementById('pin-radius').value = pinData.data.radius;
        document.getElementById('pin-image').value = pinData.data.imageUrl;
        
        // 更新图片预览
        this.updateImagePreview();
        
        // 显示编辑器
        document.getElementById('pin-editor').style.display = 'block';
        document.getElementById('pin-list').style.display = 'none';
    }

    // 保存图钉编辑
    savePinEdit() {
        if (!this.currentEditingPin) return;
        
        const pinData = this.pins.get(this.currentEditingPin);
        if (!pinData) return;
        
        const name = document.getElementById('pin-name').value;
        const lat = parseFloat(document.getElementById('pin-lat').value);
        const lng = parseFloat(document.getElementById('pin-lng').value);
        const radius = parseFloat(document.getElementById('pin-radius').value);
        const imageUrl = document.getElementById('pin-image').value;
        
        // 更新数据
        pinData.data.name = name;
        pinData.data.lat = lat;
        pinData.data.lng = lng;
        pinData.data.radius = radius;
        pinData.data.imageUrl = imageUrl;
        
        // 更新地图上的图钉和圆
        pinData.pin.setLatLng([lat, lng]);
        pinData.circle.setLatLng([lat, lng]);
        pinData.circle.setRadius(radius);
        
        // 更新图钉图标
        const newIcon = L.icon({
            iconUrl: imageUrl,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });
        pinData.pin.setIcon(newIcon);
        
        this.savePinsToStorage();
        this.cancelPinEdit();
        this.updatePinList();
    }

    // 取消编辑
    cancelPinEdit() {
        this.currentEditingPin = null;
        document.getElementById('pin-editor').style.display = 'none';
        document.getElementById('pin-list').style.display = 'block';
    }

    // 删除当前编辑的图钉
    deleteCurrentPin() {
        if (!this.currentEditingPin) return;
        
        this.deletePin(this.currentEditingPin);
        this.cancelPinEdit();
    }

    // 删除图钉
    deletePin(pinId) {
        const pinData = this.pins.get(pinId);
        if (pinData) {
            this.map.removeLayer(pinData.pin);
            this.map.removeLayer(pinData.circle);
            this.pins.delete(pinId);
        }
        
        this.savePinsToStorage();
        this.updatePinList();
    }

    // 清理所有图钉
    clearAllPins() {
        if (!confirm('确定要删除所有图钉吗？')) return;
        
        for (const [pinId, pinData] of this.pins) {
            this.map.removeLayer(pinData.pin);
            this.map.removeLayer(pinData.circle);
        }
        
        this.pins.clear();
        this.updatePinList();
    }

    // 从输入框更新图钉位置
    updatePinPositionFromInput() {
        if (!this.currentEditingPin) return;
        
        const pinData = this.pins.get(this.currentEditingPin);
        if (!pinData) return;
        
        const lat = parseFloat(document.getElementById('pin-lat').value);
        const lng = parseFloat(document.getElementById('pin-lng').value);
        
        if (!isNaN(lat) && !isNaN(lng)) {
            pinData.pin.setLatLng([lat, lng]);
            pinData.circle.setLatLng([lat, lng]);
            pinData.data.lat = lat;
            pinData.data.lng = lng;
        }
    }

    // 更新图钉半径
    updatePinRadius() {
        if (!this.currentEditingPin) return;
        
        const pinData = this.pins.get(this.currentEditingPin);
        if (!pinData) return;
        
        const radius = parseFloat(document.getElementById('pin-radius').value);
        
        if (!isNaN(radius) && radius >= 0) {
            pinData.circle.setRadius(radius);
            pinData.data.radius = radius;
        }
    }

    // 更新图钉列表
    updatePinList() {
        const pinList = document.getElementById('pin-list');
        pinList.innerHTML = '';
        
        for (const [pinId, pinData] of this.pins) {
            const pinItem = document.createElement('div');
            pinItem.className = 'pin-item';
            pinItem.innerHTML = `
                <span>${pinId}</span>
                <span>${pinData.data.name}</span>
                <span>${pinData.data.lat.toFixed(6)}, ${pinData.data.lng.toFixed(6)}</span>
                <span>${pinData.data.radius}m</span>
                <span>
                    ${pinData.data.imageUrl ? 
                        `<img src="${pinData.data.imageUrl}" alt="图钉图片" style="width: 20px; height: 20px; object-fit: contain;">` : 
                        '无图片'}
                </span>
                <span>
                    <button class="edit-pin-btn" data-id="${pinId}">编辑</button>
                    <button class="delete-pin-btn" data-id="${pinId}">删除</button>
                </span>
            `;
            
            pinList.appendChild(pinItem);
        }
        
        // 绑定按钮事件
        document.querySelectorAll('.edit-pin-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pinId = parseInt(e.target.getAttribute('data-id'));
                this.editPin(pinId);
            });
        });
        
        document.querySelectorAll('.delete-pin-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pinId = parseInt(e.target.getAttribute('data-id'));
                if (confirm('确定要删除这个图钉吗？')) {
                    this.deletePin(pinId);
                }
            });
        });
    }

    // 导出图钉
    exportPins() {
        const pinsData = [];
        
        for (const [pinId, pinData] of this.pins) {
            pinsData.push(pinData.data);
        }
        
        const dataStr = JSON.stringify(pinsData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `pins_export_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    // 导入图钉
    importPins(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const pinsData = JSON.parse(e.target.result);
                
                // 清除现有图钉
                this.clearAllPins();
                
                // 导入新图钉
                pinsData.forEach(pinData => {
                    this.createPin(
                        pinData.id,
                        pinData.lat,
                        pinData.lng,
                        pinData.name,
                        pinData.radius,
                        pinData.imageUrl || pinData.color // 向后兼容，如果旧数据有color字段
                    );
                });
                
                this.updatePinList();
                alert(`成功导入 ${pinsData.length} 个图钉`);
            } catch (error) {
                alert('导入失败：文件格式错误');
                console.error('导入图钉错误:', error);
            }
        };
        
        reader.readAsText(file);
    }

    // 保存到本地存储
    savePinsToStorage() {
        const pinsData = [];
        
        for (const [pinId, pinData] of this.pins) {
            pinsData.push(pinData.data);
        }
        
        localStorage.setItem('map_pins', JSON.stringify(pinsData));
    }

    // 从本地存储加载
    loadPinsFromStorage() {
        try {
            const savedPins = localStorage.getItem('map_pins');
            if (savedPins) {
                const pinsData = JSON.parse(savedPins);
                
                pinsData.forEach(pinData => {
                    // 向后兼容处理：如果旧数据有color字段但没有imageUrl，使用默认图片
                    const imageUrl = pinData.imageUrl || (pinData.color ? this.getDefaultImageForColor(pinData.color) : 'img/tuding/tuding.svg');
                    
                    this.createPin(
                        pinData.id,
                        pinData.lat,
                        pinData.lng,
                        pinData.name,
                        pinData.radius,
                        imageUrl
                    );
                });
                
                // 更新nextPinId
                if (pinsData.length > 0) {
                    this.nextPinId = Math.max(...pinsData.map(p => p.id)) + 1;
                }
            }
        } catch (error) {
            console.error('加载图钉数据错误:', error);
        }
    }

    // 为向后兼容提供的默认图片（可选）
    getDefaultImageForColor(color) {
        // 这里可以根据颜色返回不同的默认图片
        // 目前统一返回默认图钉图片
        return 'img/tuding/tuding.svg';
    }

    // 公共API方法
    addPin(lat, lng, name, radius, imageUrl) {
        const pinId = this.nextPinId++;
        return this.createPin(pinId, lat, lng, name, radius, imageUrl);
    }
    
    removePin(pinId) {
        this.deletePin(pinId);
    }
    
    getPins() {
        const pins = [];
        for (const [pinId, pinData] of this.pins) {
            pins.push({...pinData.data});
        }
        return pins;
    }
    
    clearPins() {
        this.clearAllPins();
    }
}

// 创建全局实例
window.PinManager = PinManager;

// 自动初始化（当map可用时）
window.initPinManager = function(map) {
    window.pinManager = new PinManager(map);
    return window.pinManager;
};