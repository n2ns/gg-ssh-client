/**
 * SSH客户端 - 终端管理模块
 */

// 终端管理器类
class TerminalManager {
  constructor() {
    // 终端实例数组
    this.terminals = [];
    this.sshClients = [];
    this.terminalsContainer = document.getElementById('terminals-container');
    
    // 监听窗口大小变化
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // 监听标签切换事件
    document.addEventListener('tab-switched', (event) => {
      this.resizeActiveTerminal(event.detail.index);
    });
    
    // 监听标签关闭事件
    document.addEventListener('tab-closed', (event) => {
      this.closeTerminal(event.detail.index);
    });

    // 存储活动标签页索引
    this.activeTabIndex = -1;
    
    // 更新活动标签索引
    document.addEventListener('tab-switched', (event) => {
      this.activeTabIndex = event.detail.index;
    });
    
    // 默认终端设置
    this.settings = {
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, Courier New, monospace',
      cursorBlink: true,
      scrollback: 1000
    };
  }
  
  // 获取活动终端索引
  getActiveTerminalIndex() {
    // 直接使用存储的活动索引，而不是尝试访问tabManager
    return this.activeTabIndex;
  }
  
  // 清除活动终端内容
  clearActiveTerminal() {
    const index = this.getActiveTerminalIndex();
    if (index >= 0 && this.terminals[index]) {
      try {
        this.terminals[index].clear();
        console.log('终端已清空');
      } catch (error) {
        console.error('清空终端失败:', error);
      }
    }
  }
  
  // 断开活动终端连接
  disconnectActiveTerminal() {
    const index = this.getActiveTerminalIndex();
    if (index >= 0) {
      // 获取SSH客户端ID
      const terminal = this.terminals[index];
      if (terminal && terminal.connectionId) {
        try {
          if (window.electron) {
            window.electron.disconnectSSH(terminal.connectionId)
              .then(() => {
                terminal.write('\r\n\r\n连接已断开\r\n');
                console.log('已断开连接');
              })
              .catch(error => {
                console.error('断开连接失败:', error);
                terminal.write(`\r\n\r\n断开连接失败: ${error.message}\r\n`);
              });
          }
        } catch (error) {
          console.error('断开连接失败:', error);
        }
      }
    }
  }
  
  // 处理窗口大小变化
  handleResize() {
    const activeIndex = this.getActiveTerminalIndex();
    if (activeIndex >= 0) {
      this.resizeActiveTerminal(activeIndex);
    }
  }
  
  // 调整活动终端大小
  resizeActiveTerminal(index) {
    if (index >= 0 && this.terminals[index] && this.terminals[index].fitAddon) {
      setTimeout(() => {
        try {
          this.terminals[index].fitAddon.fit();
        } catch (e) {
          console.error('调整终端大小失败:', e);
        }
      }, 0);
    }
  }
  
  // 创建终端
  createTerminal(tabIndex, connection) {
    // 查找对应的终端容器
    const terminalWrapper = this.terminalsContainer.children[tabIndex];
    if (!terminalWrapper) return;
    
    // 确保终端容器是空的
    terminalWrapper.innerHTML = '';
    
    // 创建终端元素
    const terminalElement = document.createElement('div');
    terminalElement.className = 'terminal';
    terminalElement.id = `terminal-${tabIndex}`;
    terminalWrapper.appendChild(terminalElement);
    
    // 处理连接逻辑
    this.connectToServer(tabIndex, terminalElement.id, connection);
  }
  
  // 连接到服务器
  connectToServer(tabIndex, terminalElementId, connection) {
    try {
      // 创建终端
      const termOptions = {
        fontSize: this.settings.fontSize,
        fontFamily: this.settings.fontFamily,
        cursorBlink: this.settings.cursorBlink,
        scrollback: this.settings.scrollback,
        theme: {
          background: '#282c34',
          foreground: '#abb2bf',
          cursor: '#528bff',
          selection: 'rgba(82, 139, 255, 0.3)'
        }
      };
      
      // 使用xtermJS创建终端
      const terminalObj = window.xtermJS.createTerminalElement(terminalElementId, termOptions);
      
      if (!terminalObj) {
        throw new Error('Failed to create terminal');
      }
      
      // 存储终端对象
      this.terminals[tabIndex] = terminalObj;
      
      // 调整终端大小
      setTimeout(() => {
        terminalObj.fit();
      }, 100);
      
      // 监听窗口大小变化
      window.addEventListener('resize', () => {
        terminalObj.fit();
      });
      
      // 使用SSH连接到服务器
      if (window.electron) {
        this.connectSSH(tabIndex, connection);
      } else {
        // 本地模拟模式
        terminalObj.write('SSH客户端模拟模式\r\n');
        terminalObj.write(`连接到 ${connection.host}:${connection.port}\r\n`);
        terminalObj.write('用户名: ' + connection.username + '\r\n');
        terminalObj.write('认证方式: ' + connection.authType + '\r\n');
        terminalObj.write('\r\n$ ');
        
        // 模拟输入
        terminalObj.onData((data) => {
          terminalObj.write(data);
          if (data === '\r') {
            terminalObj.write('\n$ ');
          }
        });
      }
    } catch (error) {
      console.error('创建终端失败:', error);
      alert(`创建终端失败: ${error.message}`);
    }
  }
  
  // 使用SSH连接到服务器
  async connectSSH(tabIndex, connection) {
    const terminal = this.terminals[tabIndex];
    if (!terminal) return;

    try {
      terminal.write(`正在连接到 ${connection.host}:${connection.port}...\r\n`);

      // 使用Electron的IPC通信连接SSH（附带超时配置）
      const result = await window.electron.connectSSH({
        ...connection,
        sshReadyTimeoutSec: (window.settingsComponent && window.settingsComponent.settings && window.settingsComponent.settings.sshReadyTimeoutSec) ? window.settingsComponent.settings.sshReadyTimeoutSec : 45
      });

      if (result && result.id) {
        terminal.write(`连接成功\r\n\r\n`);

        // 存储连接ID
        terminal.connectionId = result.id;

        // 通知应用连接成功（用于清理失败映射）
        try {
          document.dispatchEvent(new CustomEvent('ssh-connected', {
            detail: { connectionId: connection.id, tabIndex }
          }));
        } catch (e) {
          console.warn('派发ssh-connected事件失败:', e);
        }

        // 监听SSH数据
        const removeDataListener = window.electron.onSSHData(result.id, (data) => {
          terminal.write(data);
        });

        // 处理终端输入
        terminal.onData((data) => {
          window.electron.sendSSHData(result.id, data);
        });
      } else {
        // 结果异常视为失败
        const message = '未知的连接结果';
        terminal.write(`\r\n连接失败: ${message}\r\n`);
        try {
          document.dispatchEvent(new CustomEvent('ssh-connect-failed', {
            detail: { connectionId: connection.id, tabIndex, message }
          }));
        } catch (e) {
          console.warn('派发ssh-connect-failed事件失败:', e);
        }
      }
    } catch (error) {
      console.error('SSH连接失败:', error);
      terminal.write(`\r\n连接失败: ${error.message}\r\n`);
      try {
        document.dispatchEvent(new CustomEvent('ssh-connect-failed', {
          detail: { connectionId: connection.id, tabIndex, message: error.message }
        }));
      } catch (e) {
        console.warn('派发ssh-connect-failed事件失败:', e);
      }
    }
  }
  
  // 更新终端设置
  updateSettings(settings) {
    // 更新设置
    this.settings = {...this.settings, ...settings};
    
    // 应用设置到现有终端
    this.terminals.forEach(terminal => {
      if (terminal && terminal.term) {
        if (settings.fontSize) {
          terminal.term.options.fontSize = settings.fontSize;
        }
        
        if (settings.fontFamily) {
          terminal.term.options.fontFamily = settings.fontFamily;
        }
        
        // 刷新终端显示
        terminal.fit();
      }
    });
  }
  
  // 关闭终端
  closeTerminal(index) {
    // 关闭SSH连接
    if (this.sshClients[index]) {
      try {
        if (this.sshClients[index].dispose) {
          this.sshClients[index].dispose();
        }
      } catch (e) {
        console.error('关闭SSH连接失败:', e);
      }
    }
    
    // 销毁终端
    if (this.terminals[index] && this.terminals[index].term) {
      try {
        this.terminals[index].term.dispose();
      } catch (e) {
        console.error('销毁终端失败:', e);
      }
    }
    
    // 更新数组
    this.terminals.splice(index, 1);
    this.sshClients.splice(index, 1);
  }
}

// 确保类在全局作用域中可用
window.TerminalManager = TerminalManager; 