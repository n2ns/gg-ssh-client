/**
 * SSH客户端 - 应用程序主模块
 */
class App {
  constructor() {
    console.log('App构造函数开始执行');
    // 连接进行中时：记录连接ID -> 标签索引（再次点击只切换，不新建）
    this._pendingConnectionTabs = {};
    // 连接失败时：记录连接ID -> 标签索引（再次点击只切换，不新建）
    this._failedConnectionTabs = {};
    // 不在这里初始化，等待所有模块加载完成
  }
  
  // 初始化模块
  initModules() {
    try {
      console.log('正在初始化应用模块...');

      // 检查所有必需的类是否已加载
      const requiredClasses = [
        'ConnectionManager',
        'LanguageManager',
        'UIManager',
        'TabManager',
        'TerminalManager',
        'SidebarComponent',
        'SettingsComponent'
      ];

      for (const className of requiredClasses) {
        if (typeof window[className] !== 'function') {
          throw new Error(`${className} 未定义`);
        }
      }

      console.log('所有必需类都已加载和定义');

      // 初始化语言管理器 (首先初始化)
      try {
        this.languageManager = new window.LanguageManager();
        window.languageManager = this.languageManager;
        console.log('语言管理器初始化完成');
      } catch (error) {
        console.error('语言管理器初始化失败:', error);
        throw error;
      }
      
      // 初始化连接管理器 (在UI组件之前初始化)
      try {
        this.connectionManager = new window.ConnectionManager();
        window.connectionManager = this.connectionManager;
        console.log('连接管理器初始化完成');
      } catch (error) {
        console.error('连接管理器初始化失败:', error);
        throw error;
      }
      
      // 初始化UI管理器
      try {
        this.uiManager = new window.UIManager();
        window.uiManager = this.uiManager;
        console.log('UI管理器初始化完成');
      } catch (error) {
        console.error('UI管理器初始化失败:', error);
        throw error;
      }
      
      // 初始化标签页管理器
      try {
        this.tabManager = new window.TabManager();
        window.tabManager = this.tabManager;
        console.log('标签页管理器初始化完成');
      } catch (error) {
        console.error('标签页管理器初始化失败:', error);
        throw error;
      }
      
      // 初始化终端管理器
      try {
        this.terminalManager = new window.TerminalManager();
        window.terminalManager = this.terminalManager;
        console.log('终端管理器初始化完成');
      } catch (error) {
        console.error('终端管理器初始化失败:', error);
        throw error;
      }
      
      // 初始化侧边栏组件
      try {
        this.sidebarComponent = new window.SidebarComponent();
        window.sidebarComponent = this.sidebarComponent;
        console.log('侧边栏组件初始化完成');
      } catch (error) {
        console.error('侧边栏组件初始化失败:', error);
        throw error;
      }
      
      // 初始化设置组件
      try {
        this.settingsComponent = new window.SettingsComponent();
        window.settingsComponent = this.settingsComponent;
        console.log('设置组件初始化完成');
      } catch (error) {
        console.error('设置组件初始化失败:', error);
        throw error;
      }
      
      // 设置事件监听
      try {
        this.setupEventListeners();
        console.log('事件监听器设置完成');
      } catch (error) {
        console.error('设置事件监听器失败:', error);
        throw error;
      }
      
      // 同步主进程的语言设置
      try {
        this.syncLanguageWithMainProcess();
        console.log('语言同步完成');
      } catch (error) {
        console.error('同步语言设置失败:', error);
        // 非致命错误，继续执行
      }
      
      // 翻译界面
      try {
        this.translateUI();
        console.log('UI翻译完成');
      } catch (error) {
        console.error('翻译界面失败:', error);
        // 非致命错误，继续执行
      }
      
      // 通知初始化完成
      setTimeout(() => {
        console.log('应用初始化完成');
        document.dispatchEvent(new CustomEvent('app-initialized'));
      }, 100);

      // 监听标签关闭，维护失败/进行中映射
      document.addEventListener('tab-closed', (event) => {
        const closedIndex = event.detail.index;
        // 从失败映射中清理
        for (const [connId, tabIdx] of Object.entries(this._failedConnectionTabs)) {
          if (tabIdx === closedIndex) delete this._failedConnectionTabs[connId];
          else if (tabIdx > closedIndex) this._failedConnectionTabs[connId] = tabIdx - 1;
        }
        // 从进行中映射中清理
        for (const [connId, tabIdx] of Object.entries(this._pendingConnectionTabs)) {
          if (tabIdx === closedIndex) delete this._pendingConnectionTabs[connId];
          else if (tabIdx > closedIndex) this._pendingConnectionTabs[connId] = tabIdx - 1;
        }
      });

      // 监听连接成功/失败事件，维护映射
      document.addEventListener('ssh-connected', (event) => {
        const { connectionId, tabIndex } = event.detail || {};
        if (connectionId !== undefined) {
          delete this._failedConnectionTabs[connectionId];
          delete this._pendingConnectionTabs[connectionId];
        }
      });
      document.addEventListener('ssh-connect-failed', (event) => {
        const { connectionId, tabIndex } = event.detail || {};
        if (connectionId !== undefined && tabIndex !== undefined) {
          this._failedConnectionTabs[connectionId] = tabIndex;
          delete this._pendingConnectionTabs[connectionId];
        }
      });
    } catch (error) {
      console.error('初始化模块失败:', error);
      alert(`初始化模块失败: ${error.message}`);
      throw error;
    }
  }
  
  // 同步主进程的语言设置
  syncLanguageWithMainProcess() {
    if (window.electron && window.electron.onSyncLanguage) {
      // 监听主进程同步的语言设置
      window.electron.onSyncLanguage((language) => {
        console.log('从主进程同步语言设置:', language);
        
        // 更新语言设置（不通知主进程，避免循环）
        const currentLanguage = this.languageManager.getCurrentLanguage();
        if (language && language !== currentLanguage) {
          localStorage.setItem('language', language);
          this.languageManager.setLanguage(language, false);
        }
      });
    }
  }
  
  // 设置事件监听
  setupEventListeners() {
    // 监听连接到服务器的事件
    document.addEventListener('connect-to-server', (event) => {
      this.connectToServer(event.detail);
    });
    
    // 监听显示设置事件
    document.addEventListener('show-settings', () => {
      console.log('收到显示设置事件');
      if (this.settingsComponent) {
        this.settingsComponent.showModal();
      } else {
        console.error('设置组件未初始化');
      }
    });
    
    // 监听设置更新事件（新的统一事件）
    document.addEventListener('settings-updated', (event) => {
      console.log('收到设置更新事件:', event.detail);
      
      const { settings, changes } = event.detail;
      
      // 根据变更选择性更新
      if (changes.language) {
        console.log('语言已变更，正在更新UI');
        
        // 更新应用标题
        document.title = this.languageManager.getText('app_name');
        
        // 更新已翻译的元素
        this.translateUI();
      }
      
      if (changes.theme) {
        console.log('主题已变更，正在应用主题');
        // 主题变更的处理已在设置组件中通过CSS完成
      }
      
      if (changes.fontSize || changes.fontFamily) {
        console.log('终端字体设置已变更');
        // 更新终端设置
        this.terminalManager.updateSettings({
          fontSize: settings.fontSize,
          fontFamily: settings.fontFamily
        });
      }
    });
    
    // 监听语言变更事件
    document.addEventListener('language-changed', (event) => {
      console.log('语言已变更:', event.detail.language);
      
      // 更新应用标题
      document.title = this.languageManager.getText('app_name');
      
      // 更新已翻译的元素
      this.translateUI();
    });
    
    // 监听菜单事件
    if (window.electron && window.electron.onMenuEvent) {
      window.electron.onMenuEvent((action) => {
        console.log('收到菜单事件:', action);
        
        switch (action) {
          case 'menu-new-connection':
            document.getElementById('add-connection-btn').click();
            break;
          case 'show-settings':
            console.log('收到显示设置菜单事件');
            if (this.settingsComponent) {
              this.settingsComponent.showModal();
            } else {
              console.error('设置组件未初始化');
            }
            break;
          case 'menu-clear-terminal':
            this.terminalManager.clearActiveTerminal();
            break;
          case 'menu-disconnect':
            this.terminalManager.disconnectActiveTerminal();
            break;
          case 'menu-font-size-increase':
          case 'menu-font-size-decrease':
          case 'menu-font-size-reset':
            this.handleFontSizeChange(action);
            break;
          default:
            console.log('未处理的菜单事件:', action);
        }
      });
    }
    
    // 监听终端字体设置更新事件
    document.addEventListener('terminal-font-settings-updated', (event) => {
      console.log('收到终端字体设置更新事件:', event.detail);
      
      // 更新终端设置
      if (this.terminalManager) {
        this.terminalManager.updateSettings(event.detail);
      }
    });
  }
  
  // 连接到服务器
  connectToServer(connection) {
    const connectionId = connection.id;

    // 规则：
    // - 若该连接“正在连接中”或“此前失败过”且保留标签，则切换到对应标签，不新建
    // - 仅当此前连接成功（即不在 pending/failed 集合中）时，再次点击才新建新标签
    const pendingTab = this._pendingConnectionTabs[connectionId];
    const failedTab = this._failedConnectionTabs[connectionId];
    if (pendingTab !== undefined) {
      this.tabManager.switchTab(pendingTab);
      return;
    }
    if (failedTab !== undefined) {
      this.tabManager.switchTab(failedTab);
      return;
    }

    console.log('开始连接到服务器:', connection.name);

    // 创建新标签页
    const tabIndex = this.tabManager.addTab(connection.name);
    // 记录为“正在连接中”
    this._pendingConnectionTabs[connectionId] = tabIndex;

    // 切换到新标签页
    this.tabManager.switchTab(tabIndex);

    // 创建终端
    setTimeout(() => {
      try {
        this.terminalManager.createTerminal(tabIndex, connection);
      } catch (error) {
        console.error('创建终端失败:', error);
      }
    }, 100);
  }
  
  // 处理字体大小变更
  handleFontSizeChange(action) {
    let fontSize = this.settingsComponent.settings.fontSize;
    
    switch (action) {
      case 'menu-font-size-increase':
        fontSize = Math.min(fontSize + 1, 24);
        break;
      case 'menu-font-size-decrease':
        fontSize = Math.max(fontSize - 1, 8);
        break;
      case 'menu-font-size-reset':
        fontSize = 14;
        break;
    }
    
    // 更新设置
    this.settingsComponent.settings.fontSize = fontSize;
    localStorage.setItem('appSettings', JSON.stringify(this.settingsComponent.settings));
    
    // 更新终端
    this.terminalManager.updateSettings({ fontSize });
  }
  
  // 翻译界面
  translateUI() {
    try {
      // 更新应用标题
      document.title = this.languageManager.getText('app_name');
      
      // 翻译侧边栏
      this.languageManager.registerElement(
        document.querySelector('.sidebar-header h3'), 
        'connection_management'
      );
      
      this.languageManager.registerElement(
        document.querySelector('#add-connection-btn .btn-text'), 
        'add_connection'
      );
      
      // 翻译连接表单
      this.languageManager.translateConnectionForm();
      
      // 翻译上下文菜单
      this.languageManager.registerElement(document.getElementById('edit-connection'), 'edit');
      this.languageManager.registerElement(document.getElementById('duplicate-connection'), 'duplicate');
      this.languageManager.registerElement(document.getElementById('delete-connection'), 'delete');
      
      // 翻译设置组件 - 确保设置组件已初始化
      if (this.settingsComponent && typeof this.settingsComponent.translateUI === 'function') {
        this.settingsComponent.translateUI();
      } else {
        console.warn('设置组件未初始化或translateUI方法不存在');
      }
    } catch (error) {
      console.error('翻译界面失败:', error);
    }
  }
  
  // 初始化应用
  init() {
    console.log('SSH客户端初始化中...');
  }
}

/**
 * 初始化应用程序
 */
function initializeApp() {
  console.log('开始初始化应用程序...');
  try {
    const app = new App();
    window.appInstance = app; // 将App实例暴露到全局，方便调试或其他模块访问
    
    // 在DOM加载完成后初始化模块
    app.initModules();
    
    console.log('App实例创建成功');
  } catch (error) {
    console.error('创建App实例失败:', error);
    alert(`应用启动失败: ${error.message}`);
  }
}

// 等待所有模块加载完成后再初始化应用
function waitForModules() {
  const requiredModules = [
    'ConnectionManager',
    'LanguageManager',
    'UIManager',
    'TabManager',
    'TerminalManager',
    'SidebarComponent',
    'SettingsComponent'
  ];
  
  let retryCount = 0;
  const maxRetries = 10;
  const retryInterval = 100; // 100ms
  
  function checkModules() {
    console.log('检查模块加载状态...');
    const unloadedModules = requiredModules.filter(
      module => typeof window[module] !== 'function'
    );
    
    if (unloadedModules.length === 0) {
      console.log('所有模块已加载完成，开始初始化应用...');
      initializeApp();
    } else {
      retryCount++;
      if (retryCount < maxRetries) {
        console.log(`部分模块未加载 (${unloadedModules.join(', ')}), ${retryCount}秒后重试...`);
        setTimeout(checkModules, retryInterval);
      } else {
        const error = `以下模块加载失败: ${unloadedModules.join(', ')}`;
        console.error(error);
        alert(error);
      }
    }
  }
  
  // 开始检查模块
  checkModules();
}

// 在DOM加载完成后开始等待模块加载
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM加载完成，等待模块加载...');
  waitForModules();
}); 