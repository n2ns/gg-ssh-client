/* 主菜单设置 */
const { app, Menu, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * 创建应用菜单
 * @param {BrowserWindow} mainWindow - 主窗口实例
 */
function createAppMenu(mainWindow) {
  const isMac = process.platform === 'darwin';
  
  const template = [
    // 应用菜单 (仅macOS)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: '关于' },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出' }
      ]
    }] : []),
    
    // 文件菜单（仅保留已实现项 + 设置）
    {
      label: '文件',
      submenu: [
        {
          label: '新建连接', accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-new-connection')
        },
        { type: 'separator' },
        {
          label: '设置', accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('show-settings')
        },
        { type: 'separator' },
        isMac ? { role: 'close', label: '关闭' } : { role: 'quit', label: '退出' }
      ]
    },

    // 视图菜单（保留常用项）
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        ...(process.env.NODE_ENV === 'development' ? [{ role: 'toggleDevTools', label: '开发者工具' }] : []),
        { type: 'separator' },
        { role: 'togglefullscreen', label: '切换全屏' }
      ]
    },

    // 终端菜单（保留已实现项）
    {
      label: '终端',
      submenu: [
        { label: '清空终端', accelerator: 'CmdOrCtrl+K', click: () => mainWindow.webContents.send('menu-clear-terminal') },
        { label: '断开连接', accelerator: 'CmdOrCtrl+D', click: () => mainWindow.webContents.send('menu-disconnect') }
      ]
    },
    
    // 帮助菜单
    {
      role: 'help',
      label: '帮助',
      submenu: [
        {
          label: '帮助文档',
          click: async () => {
            const helpWindow = new BrowserWindow({
              width: 900,
              height: 700,
              parent: mainWindow,
              modal: false,
              icon: path.join(__dirname, 'assets/icon.png'),
              webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
              }
            });
            
            helpWindow.loadFile('help.html');
            helpWindow.setMenuBarVisibility(false);
          }
        },
        {
          label: '关于',
          click: async () => {
            const aboutWindow = new BrowserWindow({
              width: 600,
              height: 600,
              parent: mainWindow,
              modal: true,
              icon: path.join(__dirname, 'assets/icon.png'),
              webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
              }
            });
            
            aboutWindow.loadFile('about.html');
            aboutWindow.setMenuBarVisibility(false);
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { createAppMenu };
