const { app, BrowserWindow, ipcMain, Menu, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { createAppMenu } = require('./src/menu');
const { NodeSSH } = require('node-ssh');

// 允许从 require('electron').remote 加载
app.allowRendererProcessReuse = false;

const customRootPath = path.join(__dirname, 'data');
app.setPath('userData', customRootPath);

console.log('userData path:', app.getPath('userData'));

const store = new Store();
const sshConnections = new Map();

// 禁用硬件加速以减少资源使用
app.disableHardwareAcceleration();

let mainWindow;

// 设置会话安全选项
function setupSessionSecurity() {
  const session = mainWindow.webContents.session;
  
  // 设置内容安全策略
  session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'"]
      }
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,        // 禁用 Node 集成
      contextIsolation: true,        // 启用上下文隔离
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,                // 禁用沙箱以允许在预加载脚本中使用Node API
      enableRemoteModule: true,      // 启用远程模块
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    backgroundColor: '#1e1e1e',
    show: false
  });

  mainWindow.loadFile('index.html');

  // 开发环境打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // 注册全局快捷键
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    mainWindow.webContents.toggleDevTools();
  });

  // 等待窗口准备好后再显示，避免白屏
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 创建应用菜单
  createAppMenu(mainWindow);
  
  // 设置会话安全选项
  setupSessionSecurity();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 处理窗口大小变化事件
  mainWindow.on('resize', () => {
    mainWindow.webContents.send('window-resize');
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  
  // 设置程序协议处理 ssh://
  app.setAsDefaultProtocolClient('ssh');
});

app.on('window-all-closed', () => {
  // 注销所有快捷键
  globalShortcut.unregisterAll();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 处理runPreloadScript错误处理
ipcMain.on('preload-error', (event, error) => {
  console.error('预加载脚本错误:', error);
});

// 处理保存SSH连接信息
ipcMain.on('save-connection', (event, connection) => {
  try {
    const connections = store.get('connections') || [];
    
    // 检查是否已存在相同名称的连接
    const existingIndex = connections.findIndex(c => c.name === connection.name);
    
    if (existingIndex >= 0) {
      connections[existingIndex] = connection;
    } else {
      connections.push(connection);
    }
    
    store.set('connections', connections);
    event.reply('connection-saved', connections);
  } catch (error) {
    console.error('Error saving connection:', error);
    event.reply('connection-error', { message: '保存连接失败: ' + error.message });
  }
});

// 处理获取SSH连接信息
ipcMain.on('get-connections', (event) => {
  const connections = store.get('connections') || [];
  event.reply('connections-loaded', connections);
});

// 处理删除SSH连接信息
ipcMain.on('delete-connection', (event, name) => {
  let connections = store.get('connections') || [];
  connections = connections.filter(c => c.name !== name);
  store.set('connections', connections);
  event.reply('connection-deleted', connections);
});

// 处理设置保存
ipcMain.on('save-settings', (event, settings) => {
  store.set('settings', settings);
  event.reply('settings-saved', settings);
});

// 处理获取设置
ipcMain.on('get-settings', (event) => {
  const settings = store.get('settings') || {
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, Courier New, monospace',
    theme: 'dark',
    cursorBlink: true,
    scrollback: 1000,
    keepAliveInterval: 10000
  };
  event.reply('settings-loaded', settings);
});

// 处理连接导出
ipcMain.on('export-connections', (event, connections) => {
  dialog.showSaveDialog(mainWindow, {
    title: '导出连接',
    defaultPath: 'ssh-connections.json',
    filters: [{ name: 'JSON文件', extensions: ['json'] }]
  }).then(result => {
    if (!result.canceled && result.filePath) {
      try {
        fs.writeFileSync(result.filePath, JSON.stringify(connections, null, 2), 'utf8');
        event.reply('export-connections-success');
      } catch (error) {
        event.reply('export-connections-error', error.message);
      }
    }
  });
});

// 处理菜单事件
ipcMain.on('request-export-connections', (event) => {
  mainWindow.webContents.send('menu-export-connections');
});

// 处理SSH连接
ipcMain.handle('ssh-connect', async (event, connection) => {
  try {
    const ssh = new NodeSSH();
    
    // 准备连接选项
    const connectOptions = {
      host: connection.host,
      port: connection.port,
      username: connection.username,
      keepaliveInterval: 10000,
      readyTimeout: (connection.sshReadyTimeoutSec ? Number(connection.sshReadyTimeoutSec) * 1000 : 45000)
    };
    
    // 根据认证类型设置不同的选项
    if (connection.authType === 'password') {
      connectOptions.password = connection.password;
    } else {
      connectOptions.privateKey = connection.privateKey;
      if (connection.passphrase) {
        connectOptions.passphrase = connection.passphrase;
      }
    }
    
    // 连接到服务器
    await ssh.connect(connectOptions);
    
    // 生成唯一的连接ID
    const connectionId = Date.now().toString();
    
    // 打开Shell会话
    const shell = await ssh.requestShell();
    
    // 存储SSH连接
    sshConnections.set(connectionId, { ssh, shell });
    
    // 处理Shell数据
    shell.on('data', (data) => {
      // 发送数据到渲染进程
      event.sender.send(`ssh-data-${connectionId}`, data.toString());
    });
    
    shell.on('error', (err) => {
      event.sender.send(`ssh-error-${connectionId}`, err.message);
    });
    
    shell.on('close', () => {
      event.sender.send(`ssh-close-${connectionId}`);
      sshConnections.delete(connectionId);
    });
    
    return {
      id: connectionId,
      status: 'connected',
      message: '连接成功'
    };
  } catch (error) {
    console.error('SSH连接失败:', error);
    throw new Error(`连接失败: ${error.message}`);
  }
});

// 处理SSH断开连接
ipcMain.handle('ssh-disconnect', async (event, connectionId) => {
  try {
    const connection = sshConnections.get(connectionId);
    if (connection) {
      const { ssh, shell } = connection;
      shell.end();
      await ssh.dispose();
      sshConnections.delete(connectionId);
      return { success: true, message: '已断开连接' };
    }
    return { success: false, message: '连接不存在' };
  } catch (error) {
    console.error('断开SSH连接失败:', error);
    throw new Error(`断开连接失败: ${error.message}`);
  }
});

// 处理SSH数据发送
ipcMain.on('ssh-send-data', (event, { connectionId, data }) => {
  try {
    const connection = sshConnections.get(connectionId);
    if (connection && connection.shell) {
      connection.shell.write(data);
    }
  } catch (error) {
    console.error('发送数据失败:', error);
    event.sender.send(`ssh-error-${connectionId}`, error.message);
  }
});

// 应用退出时清理所有SSH连接
app.on('before-quit', () => {
  for (const [connectionId, connection] of sshConnections.entries()) {
    try {
      connection.shell.end();
      connection.ssh.dispose();
    } catch (error) {
      console.error(`清理连接 ${connectionId} 失败:`, error);
    }
  }
  sshConnections.clear();
});
