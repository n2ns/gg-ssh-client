/**
 * SSH客户端 - 连接管理模块
 */

// 连接管理器类
class ConnectionManager {
  constructor() {
    // 连接数组
    this.connections = [];
    
    // 获取DOM元素
    this.connectionModal = document.getElementById('connection-modal');
    this.connectionList = document.getElementById('connection-list');
    this.contextMenu = document.getElementById('context-menu');
    this.addConnectionBtn = document.getElementById('add-connection-btn');
    this.closeModalBtn = document.getElementById('close-modal');
    this.saveConnectionBtn = document.getElementById('save-connection');
    this.cancelConnectionBtn = document.getElementById('cancel-connection');
    this.authTypeSelect = document.getElementById('authType');
    this.passwordGroup = document.getElementById('password-group');
    this.privatekeyGroup = document.getElementById('privatekey-group');
    this.editConnection = document.getElementById('edit-connection');
    this.duplicateConnection = document.getElementById('duplicate-connection');
    this.deleteConnection = document.getElementById('delete-connection');
    
    // 状态标记
    this.isEditing = false;
    this.editingConnection = null;
    this.currentConnectionForContext = null;
    
    // 初始化事件监听
    this.initEventListeners();
    
    // 通过主进程加载保存的连接（config.json）
    this.loadConnections();

    // 设置IPC监听：加载/保存/删除结果
    if (window.electron && window.electron.on) {
      window.electron.on('connections-loaded', (connections) => {
        // 若config.json为空且本地有旧localStorage数据，则迁移
        try {
          if ((!connections || connections.length === 0)) {
            const legacy = localStorage.getItem('connections');
            if (legacy) {
              const legacyConns = JSON.parse(legacy);
              legacyConns.forEach(c => window.electron.saveConnection(c));
              // 迁移后清理localStorage，防止双写
              localStorage.removeItem('connections');
              return; // 等待后续 connection-saved 通知
            }
          }
        } catch (e) { console.warn('迁移旧连接数据失败:', e); }

        this.connections = Array.isArray(connections) ? connections : [];
        this.renderConnectionList();
        document.dispatchEvent(new CustomEvent('connections-updated'));
      });

      window.electron.on('connection-saved', (connections) => {
        this.connections = Array.isArray(connections) ? connections : [];
        this.renderConnectionList();
        document.dispatchEvent(new CustomEvent('connections-updated'));
      });

      window.electron.on('connection-deleted', (connections) => {
        this.connections = Array.isArray(connections) ? connections : [];
        this.renderConnectionList();
        document.dispatchEvent(new CustomEvent('connections-updated'));
      });
    }

    console.log('连接管理器初始化完成');

    // 通知其他组件连接管理器已准备就绪
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('connection-manager-ready'));
    }, 100);
  }
  
  // 初始化事件监听
  initEventListeners() {
    // 保存连接按钮点击事件
    this.saveConnectionBtn.addEventListener('click', this.handleSaveConnection.bind(this));
    
    // 关闭模态框按钮点击事件
    this.closeModalBtn.addEventListener('click', () => {
      this.connectionModal.style.display = 'none';
    });
    
    // 取消按钮点击事件
    this.cancelConnectionBtn.addEventListener('click', () => {
      this.connectionModal.style.display = 'none';
    });
    
    // 认证类型切换事件
    this.authTypeSelect.addEventListener('change', () => {
      this.toggleAuthType();
    });
    
    // 编辑连接菜单项点击事件
    document.getElementById('edit-connection').addEventListener('click', this.handleEditConnection.bind(this));
    
    // 复制连接菜单项点击事件
    document.getElementById('duplicate-connection').addEventListener('click', this.handleDuplicateConnection.bind(this));
    
    // 删除连接菜单项点击事件
    document.getElementById('delete-connection').addEventListener('click', this.handleDeleteConnection.bind(this));
    
    // 添加连接按钮点击事件
    document.getElementById('add-connection-btn').addEventListener('click', () => {
      this.showAddConnectionModal();
    });
    
    console.log('连接管理器事件初始化完成');
  }
  
  // 切换认证类型显示
  toggleAuthType() {
    if (this.authTypeSelect.value === 'password') {
      this.passwordGroup.style.display = 'block';
      this.privatekeyGroup.style.display = 'none';
    } else {
      this.passwordGroup.style.display = 'none';
      this.privatekeyGroup.style.display = 'block';
    }
  }
  
  // 显示添加连接模态框
  showAddConnectionModal() {
    // 重置表单
    document.getElementById('name').value = '';
    document.getElementById('host').value = '';
    document.getElementById('port').value = '22';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('privateKey').value = '';
    document.getElementById('passphrase').value = '';
    this.authTypeSelect.value = 'password';
    
    // 显示/隐藏认证字段
    this.toggleAuthType();
    
    // 设置为新建模式
    this.isEditing = false;
    this.editingConnection = null;
    
    // 设置多语言标题
    if (window.languageManager) {
      document.getElementById('modal-title').textContent = window.languageManager.getText('new_connection');
    } else {
      document.getElementById('modal-title').textContent = '新建连接';
    }
    
    // 应用表单翻译
    if (window.languageManager) {
      window.languageManager.translateConnectionForm();
    }
    
    // 显示模态框
    this.connectionModal.style.display = 'flex';
    
    console.log('显示新建连接表单');
  }
  
  // 隐藏模态框
  hideModal() {
    this.connectionModal.style.display = 'none';
  }
  
  // 隐藏上下文菜单
  hideContextMenu() {
    this.contextMenu.style.display = 'none';
  }
  
  // 保存连接
  handleSaveConnection() {
    // 获取表单数据
    const name = document.getElementById('name').value.trim();
    const host = document.getElementById('host').value.trim();
    const port = parseInt(document.getElementById('port').value, 10) || 22;
    const username = document.getElementById('username').value.trim();
    const authType = document.getElementById('authType').value;
    const password = document.getElementById('password').value;
    const privateKey = document.getElementById('privateKey').value.trim();
    const passphrase = document.getElementById('passphrase').value;
    
    // 检查必填字段
    if (!name || !host || !username) {
      alert('请填写所有必填字段');
      return;
    }
    
    // 准备连接对象
    const connection = {
      id: this.isEditing ? this.editingConnection.id : this.generateId(),
      name,
      host,
      port,
      username,
      authType
    };
    
    // 根据认证类型添加凭据
    if (authType === 'password') {
      connection.password = password;
    } else {
      connection.privateKey = privateKey;
      connection.passphrase = passphrase;
    }
    
    console.log('保存连接:', connection);
    
    // 更新或添加连接
    if (this.isEditing) {
      // 更新现有连接
      const index = this.connections.findIndex(conn => conn.id === connection.id);
      if (index !== -1) {
        this.connections[index] = connection;
        console.log('更新连接成功:', connection.name);
      } else {
        console.error('更新连接失败: 找不到要更新的连接');
      }
    } else {
      // 添加新连接
      this.connections.push(connection);
      console.log('添加新连接成功:', connection.name);
    }
    
    // 通过主进程保存（写入config.json）
    if (window.electron && window.electron.saveConnection) {
      window.electron.saveConnection(connection);
    } else {
      console.error('Electron API 不可用，无法保存连接到配置文件');
    }

    // 隐藏模态框
    this.connectionModal.style.display = 'none';
  }
  
  // 获取指定ID的连接
  getConnectionById(id) {
    if (!id) {
      console.error('查找连接时ID为空');
      return null;
    }
    
    const connection = this.connections.find(conn => conn.id === id);
    
    if (!connection) {
      console.error(`未找到ID为 ${id} 的连接`);
      return null;
    }
    
    console.log(`找到连接: ${connection.name} (${connection.host})`);
    return connection;
  }
  
  // 生成唯一ID
  generateId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // 编辑连接
  handleEditConnection() {
    console.log('编辑连接按钮被点击');
    
    if (!this.currentConnectionForContext) {
      console.error('无法编辑连接: 未选择连接');
      return;
    }
    
    console.log('正在编辑连接:', this.currentConnectionForContext.name);
    
    // 填充表单
    document.getElementById('name').value = this.currentConnectionForContext.name;
    document.getElementById('host').value = this.currentConnectionForContext.host;
    document.getElementById('port').value = this.currentConnectionForContext.port;
    document.getElementById('username').value = this.currentConnectionForContext.username;
    document.getElementById('authType').value = this.currentConnectionForContext.authType;
    document.getElementById('password').value = this.currentConnectionForContext.password || '';
    document.getElementById('privateKey').value = this.currentConnectionForContext.privateKey || '';
    document.getElementById('passphrase').value = this.currentConnectionForContext.passphrase || '';
    
    // 显示/隐藏认证字段
    this.toggleAuthType();
    
    // 设置为编辑模式
    this.isEditing = true;
    this.editingConnection = this.currentConnectionForContext;
    
    // 设置多语言标题
    if (window.languageManager) {
      document.getElementById('modal-title').textContent = window.languageManager.getText('edit_connection');
    } else {
      document.getElementById('modal-title').textContent = '编辑连接';
    }
    
    // 应用表单翻译
    if (window.languageManager) {
      window.languageManager.translateConnectionForm();
    }
    
    // 显示模态框
    this.connectionModal.style.display = 'flex';
    
    // 隐藏上下文菜单
    this.contextMenu.style.display = 'none';
  }
  
  // 复制连接
  handleDuplicateConnection() {
    console.log('复制连接按钮被点击');
    
    if (!this.currentConnectionForContext) {
      console.error('无法复制连接: 未选择连接');
      return;
    }
    
    // 深拷贝连接对象
    const duplicate = JSON.parse(JSON.stringify(this.currentConnectionForContext));
    
    // 生成新的唯一ID
    duplicate.id = this.generateId();
    
    // 重命名连接
    if (window.languageManager) {
      duplicate.name = `${this.currentConnectionForContext.name} (${window.languageManager.getText('copy')})`;
    } else {
      duplicate.name = `${this.currentConnectionForContext.name} (复制)`;
    }
    
    console.log('复制连接:', duplicate.name);
    
    // 添加到连接列表
    this.connections.push(duplicate);
    
    // 保存到本地存储
    this.saveConnections();
    
    // 隐藏上下文菜单
    this.contextMenu.style.display = 'none';
    
    // 触发连接更新事件
    document.dispatchEvent(new CustomEvent('connections-updated'));
  }
  
  // 删除连接
  handleDeleteConnection() {
    console.log('删除连接按钮被点击');
    
    if (!this.currentConnectionForContext) {
      console.error('无法删除连接: 未选择连接');
      return;
    }
    
    console.log('准备删除连接:', this.currentConnectionForContext.name);
    
    // 确认消息
    let confirmMessage = `确定要删除连接 "${this.currentConnectionForContext.name}" 吗？`;
    
    if (window.languageManager) {
      confirmMessage = window.languageManager.getText('confirm_delete', { 
        name: this.currentConnectionForContext.name 
      }) || confirmMessage;
    }
    
    if (confirm(confirmMessage)) {
      console.log('用户确认删除连接:', this.currentConnectionForContext.name);
      
      // 从数组中移除
      this.connections = this.connections.filter(c => c.id !== this.currentConnectionForContext.id);
      
      // 保存到配置文件
      if (window.electron && window.electron.deleteConnection) {
        window.electron.deleteConnection(this.currentConnectionForContext.name);
      } else {
        console.error('Electron API 不可用，无法删除连接');
      }

      console.log('删除连接成功');

      // 隐藏上下文菜单
      this.hideContextMenu();
    } else {
      console.log('用户取消删除连接');
    }
  }
  
  // 显示上下文菜单
  showContextMenu(event, conn) {
    // 设置上下文菜单位置
    this.contextMenu.style.top = `${event.clientY}px`;
    this.contextMenu.style.left = `${event.clientX}px`;
    
    // 如果传入的是连接对象而不是ID，直接使用
    if (typeof conn === 'object' && conn !== null) {
      this.currentConnectionForContext = conn;
      console.log('设置上下文菜单连接:', conn.name);
    } 
    // 如果传入的是ID，通过ID获取连接对象
    else if (typeof conn === 'string') {
      this.setContextMenuConnectionId(conn);
    }
    
    // 检查连接对象是否有效
    if (!this.currentConnectionForContext) {
      console.error('无法显示上下文菜单: 未选择有效连接');
      return;
    }
    
    console.log('显示上下文菜单:', this.currentConnectionForContext.name);
    
    // 设置菜单项标题
    if (window.languageManager) {
      document.getElementById('edit-connection-text').textContent = 
        window.languageManager.getText('edit');
      document.getElementById('duplicate-connection-text').textContent = 
        window.languageManager.getText('duplicate');
      document.getElementById('delete-connection-text').textContent = 
        window.languageManager.getText('delete');
    }
    
    // 显示上下文菜单
    this.contextMenu.style.display = 'block';
    
    // 点击任何地方关闭菜单
    document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
    
    // 阻止事件冒泡
    event.stopPropagation();
  }
  
  // 加载连接列表（从主进程/config.json）
  loadConnections() {
    try {
      if (window.electron && window.electron.getConnections) {
        window.electron.getConnections();
      } else {
        console.error('Electron API 不可用，无法加载连接');
      }
    } catch (error) {
      console.error('加载连接配置失败:', error);
      this.connections = [];
    }
  }
  
  // 添加测试连接
  addTestConnections() {
    if (this.connections.length === 0) {
      console.log('添加测试连接');
      
      // 添加测试连接
      this.connections.push({
        id: this.generateId(),
        name: '测试服务器',
        host: '192.168.1.100',
        port: 22,
        username: 'test',
        authType: 'password',
        password: 'password'
      });
      
      this.connections.push({
        id: this.generateId(),
        name: '本地主机',
        host: '127.0.0.1',
        port: 22,
        username: 'user',
        authType: 'password',
        password: 'password'
      });
      
      // 保存连接
      this.saveConnections();
    }
  }
  
  // 渲染连接列表
  renderConnectionList() {
    this.connectionList.innerHTML = '';
    
    // 存储连接项DOM引用，方便后续操作
    this.connectionItems = {};
    
    this.connections.forEach((conn) => {
      const item = document.createElement('div');
      item.className = 'connection-item';
      item.dataset.connectionId = conn.id; // 添加连接ID作为数据属性
      
      // 添加连接图标
      const icon = document.createElement('span');
      icon.className = 'icon';
      icon.textContent = '🖥️';
      icon.style.marginRight = '8px';
      item.appendChild(icon);
      
      // 添加连接名称文本
      const text = document.createElement('span');
      text.textContent = `${conn.name} (${conn.host})`;
      item.appendChild(text);
      
      // 设置工具提示，在收起时显示连接名称
      item.title = `${conn.name} (${conn.host})`;
      
      // 保存DOM引用
      this.connectionItems[conn.id] = item;
      
      // 点击连接到服务器 - 立即响应（无防抖）
      item.addEventListener('click', function(clickEvent) {
        console.log('连接到服务器:', conn.name);
        const connectEvent = new CustomEvent('connect-to-server', { detail: conn });
        document.dispatchEvent(connectEvent);
      });
      
      // 右键显示上下文菜单
      item.addEventListener('contextmenu', function(contextEvent) {
        contextEvent.preventDefault();
        this.showContextMenu(contextEvent, conn);
      }.bind(this));
      
      this.connectionList.appendChild(item);
    });
  }
  
  // 获取所有连接
  getConnections() {
    return this.connections;
  }
  
  // 已迁移到主进程，通过IPC保存
  saveConnections() {
    console.warn('saveConnections 已弃用，请通过 window.electron.saveConnection 使用逐条保存');
  }
  
  /**
   * 设置上下文菜单连接ID
   * @param {string} connectionId 连接ID
   */
  setContextMenuConnectionId(connectionId) {
    console.log('设置上下文菜单连接ID:', connectionId);
    this.currentConnectionForContext = this.getConnectionById(connectionId);
    
    if (!this.currentConnectionForContext) {
      console.error('找不到连接:', connectionId);
    } else {
      console.log('已找到连接:', this.currentConnectionForContext.name);
    }
  }
}

// 将ConnectionManager类暴露到全局作用域
window.ConnectionManager = ConnectionManager;

// 通知其他模块ConnectionManager已加载
document.dispatchEvent(new CustomEvent('connection-manager-loaded')); 