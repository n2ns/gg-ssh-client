/**
 * SSH客户端 - 设置组件
 */

// 设置组件类
class SettingsComponent {
  constructor() {
    // 默认设置
    this.settings = {
      language: 'zh-CN',
      theme: 'dark',
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, Courier New, monospace',
      cursorBlink: true,
      scrollback: 1000,
      sshReadyTimeoutSec: 45 // SSH握手超时（秒）
    };
    
    // 标记设置界面是否正在显示
    this.isModalOpen = false;
    
    // 获取DOM元素
    this.settingsBtn = document.getElementById('settings-btn');
    
    // 创建设置模态框
    this.createSettingsModal();
    
    // 初始化事件监听
    this.setupEventListeners();
    
    // 加载设置
    this.loadSettings();
  }
  
  /**
   * 创建设置模态框
   */
  createSettingsModal() {
    // 创建模态框容器
    this.modal = document.createElement('div');
    this.modal.id = 'settings-modal';
    // 改为右侧面板而非全屏遮罩
    this.modal.className = 'settings-panel';
    this.modal.style.display = 'none';

    // 创建内容容器
    const modalContent = document.createElement('div');
    modalContent.className = 'settings-modal-content';
    
    // 创建关闭按钮
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
      this.hideModal();
    });
    
    // 创建标题
    const title = document.createElement('h2');
    title.id = 'settings-title';
    title.textContent = '设置';
    
    // 创建设置表单
    const form = document.createElement('div');
    form.className = 'settings-form';
    
    // 外观设置部分
    const appearanceSection = document.createElement('div');
    appearanceSection.className = 'settings-section';
    
    const appearanceTitle = document.createElement('h3');
    appearanceTitle.id = 'appearance-title';
    appearanceTitle.textContent = '外观设置';
    appearanceSection.appendChild(appearanceTitle);
    
    // 语言设置
    const languageGroup = document.createElement('div');
    languageGroup.className = 'form-group';
    
    const languageLabel = document.createElement('label');
    languageLabel.htmlFor = 'language-select';
    languageLabel.id = 'language-label';
    languageLabel.textContent = '语言';
    languageGroup.appendChild(languageLabel);
    
    const languageSelect = document.createElement('select');
    languageSelect.id = 'language-select';
    languageSelect.className = 'form-control';
    
    // 添加语言选项
    const zhOption = document.createElement('option');
    zhOption.value = 'zh-CN';
    zhOption.id = 'lang-zh';
    zhOption.textContent = '简体中文';
    languageSelect.appendChild(zhOption);
    
    const enOption = document.createElement('option');
    enOption.value = 'en-US';
    enOption.id = 'lang-en';
    enOption.textContent = 'English';
    languageSelect.appendChild(enOption);
    
    languageGroup.appendChild(languageSelect);
    appearanceSection.appendChild(languageGroup);
    
    // 主题设置
    const themeGroup = document.createElement('div');
    themeGroup.className = 'form-group';
    
    const themeLabel = document.createElement('label');
    themeLabel.htmlFor = 'theme-select';
    themeLabel.id = 'theme-label';
    themeLabel.textContent = '主题';
    themeGroup.appendChild(themeLabel);
    
    const themeSelect = document.createElement('select');
    themeSelect.id = 'theme-select';
    themeSelect.className = 'form-control';
    
    const darkOption = document.createElement('option');
    darkOption.value = 'dark';
    darkOption.id = 'theme-dark';
    darkOption.textContent = '暗色';
    themeSelect.appendChild(darkOption);
    
    const lightOption = document.createElement('option');
    lightOption.value = 'light';
    lightOption.id = 'theme-light';
    lightOption.textContent = '亮色';
    themeSelect.appendChild(lightOption);
    
    themeGroup.appendChild(themeSelect);
    appearanceSection.appendChild(themeGroup);
    
    // 添加到表单
    form.appendChild(appearanceSection);
    
    // 终端设置部分
    const terminalSection = document.createElement('div');
    terminalSection.className = 'settings-section';
    
    const terminalTitle = document.createElement('h3');
    terminalTitle.id = 'terminal-title';
    terminalTitle.textContent = '终端设置';
    terminalSection.appendChild(terminalTitle);
    
    // 字体大小设置
    const fontSizeGroup = document.createElement('div');
    fontSizeGroup.className = 'form-group';

    const fontSizeLabel = document.createElement('label');
    fontSizeLabel.htmlFor = 'font-size';
    fontSizeLabel.id = 'font-size-label';
    fontSizeLabel.textContent = '字体大小';
    fontSizeGroup.appendChild(fontSizeLabel);

    const fontSizeInput = document.createElement('input');
    fontSizeInput.type = 'number';
    fontSizeInput.id = 'font-size';
    fontSizeInput.className = 'form-control';
    fontSizeInput.min = '8';
    fontSizeInput.max = '24';
    fontSizeInput.step = '1';
    fontSizeGroup.appendChild(fontSizeInput);

    // SSH 准备超时（秒）
    const sshTimeoutGroup = document.createElement('div');
    sshTimeoutGroup.className = 'form-group';

    const sshTimeoutLabel = document.createElement('label');
    sshTimeoutLabel.htmlFor = 'ssh-ready-timeout';
    sshTimeoutLabel.id = 'ssh-ready-timeout-label';
    sshTimeoutLabel.textContent = 'SSH连接超时（秒）';
    sshTimeoutGroup.appendChild(sshTimeoutLabel);

    const sshTimeoutInput = document.createElement('input');
    sshTimeoutInput.type = 'number';
    sshTimeoutInput.id = 'ssh-ready-timeout';
    sshTimeoutInput.className = 'form-control';
    sshTimeoutInput.min = '5';
    sshTimeoutInput.max = '300';
    sshTimeoutInput.step = '5';
    sshTimeoutGroup.appendChild(sshTimeoutInput);

    terminalSection.appendChild(fontSizeGroup);
    terminalSection.appendChild(sshTimeoutGroup);
    
    // 字体设置
    const fontFamilyGroup = document.createElement('div');
    fontFamilyGroup.className = 'form-group';
    
    const fontFamilyLabel = document.createElement('label');
    fontFamilyLabel.htmlFor = 'font-family';
    fontFamilyLabel.id = 'font-family-label';
    fontFamilyLabel.textContent = '字体';
    fontFamilyGroup.appendChild(fontFamilyLabel);
    
    const fontFamilySelect = document.createElement('select');
    fontFamilySelect.id = 'font-family';
    fontFamilySelect.className = 'form-control';
    
    const fontOptions = [
      'Menlo, Monaco, Courier New, monospace',
      'Consolas, "Liberation Mono", Courier, monospace',
      'Courier New, Courier, monospace',
      'DejaVu Sans Mono, monospace',
      'Lucida Console, monospace'
    ];
    
    fontOptions.forEach(font => {
      const option = document.createElement('option');
      option.value = font;
      option.style.fontFamily = font;
      option.textContent = font.split(',')[0].trim();
      fontFamilySelect.appendChild(option);
    });
    
    fontFamilyGroup.appendChild(fontFamilySelect);
    terminalSection.appendChild(fontFamilyGroup);
    
    // 添加到表单
    form.appendChild(terminalSection);
    
    // 按钮容器
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'form-buttons';
    
    // 保存按钮
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.id = 'save-settings';
    saveButton.className = 'save-btn';
    saveButton.textContent = '保存';
    saveButton.addEventListener('click', () => {
      this.saveSettings();
    });
    buttonGroup.appendChild(saveButton);
    
    // 取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.id = 'cancel-settings';
    cancelButton.className = 'cancel-btn';
    cancelButton.textContent = '取消';
    cancelButton.addEventListener('click', () => {
      this.hideModal();
    });
    buttonGroup.appendChild(cancelButton);
    
    // 添加所有元素到模态框
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(title);
    modalContent.appendChild(form);
    modalContent.appendChild(buttonGroup);
    this.modal.appendChild(modalContent);
    
    // 添加到DOM（添加到右侧主内容区域内，使其占满右侧区域）
    const mainContent = document.querySelector('.main-content') || document.body;
    mainContent.appendChild(this.modal);

    // 点击面板外部关闭
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.hideModal();
    });
  }
  
  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 设置按钮点击事件
    this.settingsBtn.addEventListener('click', () => {
      this.showModal();
    });
    
    // 监听ESC键关闭模态框
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isModalOpen) {
        this.hideModal();
      }
    });
    
    // 监听菜单事件
    document.addEventListener('show-settings', () => {
      this.showModal();
    });
    
    // 监听语言变更事件，但只在模态框未显示时响应
    document.addEventListener('language-changed', (event) => {
      if (!this.isModalOpen) {
        this.translateUI();
      } else {
        console.log('设置界面打开中，忽略语言变更事件');
      }
    });
  }
  
  /**
   * 显示设置模态框
   */
  showModal() {
    try {
      // 标记模态框已打开
      this.isModalOpen = true;
      
      // 保存当前语言设置，以便在取消时恢复
      this._originalLanguage = this.settings.language;
      
      // 更新表单值
      this.updateFormValues();
      
      // 显示模态框
      this.modal.style.display = 'flex';
    } catch (error) {
      console.error('显示设置模态框失败:', error);
    }
  }
  
  /**
   * 隐藏设置模态框
   */
  hideModal() {
    try {
      // 恢复表单中的语言选择，确保与当前应用的语言匹配
      document.getElementById('language-select').value = this.settings.language;
      
      // 简单地隐藏模态框
      this.modal.style.display = 'none';
      
      // 标记模态框已关闭
      this.isModalOpen = false;
    } catch (error) {
      console.error('隐藏设置模态框失败:', error);
    }
  }
  
  /**
   * 更新表单值
   */
  updateFormValues() {
    // 更新语言选择
    document.getElementById('language-select').value = this.settings.language;
    
    // 更新主题选择
    document.getElementById('theme-select').value = this.settings.theme;
    
    // 更新字体大小
    document.getElementById('font-size').value = this.settings.fontSize;
    
    // 更新字体
    document.getElementById('font-family').value = this.settings.fontFamily;

    // 更新 SSH 超时（秒）
    const t = document.getElementById('ssh-ready-timeout');
    if (t) t.value = this.settings.sshReadyTimeoutSec;
  }
  
  /**
   * 保存设置
   */
  saveSettings() {
    try {
      // 获取表单值
      const newSettings = {
        language: document.getElementById('language-select').value,
        theme: document.getElementById('theme-select').value,
        fontSize: parseInt(document.getElementById('font-size').value, 10),
        fontFamily: document.getElementById('font-family').value,
        cursorBlink: this.settings.cursorBlink, // 保留原值
        scrollback: this.settings.scrollback, // 保留原值
        sshReadyTimeoutSec: parseInt(document.getElementById('ssh-ready-timeout').value, 10) || this.settings.sshReadyTimeoutSec
      };
      
      // 检查是否有变化
      const hasLanguageChanged = this.settings.language !== newSettings.language;
      const hasThemeChanged = this.settings.theme !== newSettings.theme;
      const hasFontSizeChanged = this.settings.fontSize !== newSettings.fontSize;
      const hasFontFamilyChanged = this.settings.fontFamily !== newSettings.fontFamily;
      
      // 是否有任何变化
      const hasAnyChange = hasLanguageChanged || hasThemeChanged || 
                           hasFontSizeChanged || hasFontFamilyChanged;
      
      // 先隐藏模态框，确保界面不会受到后续事件的影响
      this.hideModal();
      
      // 如果有变化，在界面关闭后保存并通知
      if (hasAnyChange) {
        console.log('设置已更改，正在保存新设置');
        
        // 准备一个不含语言变更的设置对象
        const settingsToSave = {
          ...newSettings,
          // 重要：如果语言有变化，使用原始语言，不保存新语言到appSettings
          language: hasLanguageChanged ? this.settings.language : newSettings.language
        };
        
        // 如果语言改变，使用单独的pendingLanguage键保存，避免立即生效
        if (hasLanguageChanged) {
          localStorage.setItem('pendingLanguage', newSettings.language);
          console.log('语言设置已保存到pendingLanguage:', newSettings.language);
        }
        
        // 更新内存中的设置(除了语言)
        if (hasLanguageChanged) {
          // 语言保持不变，确保UI不刷新
          newSettings.language = this.settings.language;
        }
        this.settings = newSettings;
        
        // 保存到本地存储，但不包含语言变更
        localStorage.setItem('appSettings', JSON.stringify(settingsToSave));
        
        // 使用setTimeout确保在UI关闭后应用设置变更
        setTimeout(() => {
          // 只更新非语言相关的设置
          if (hasThemeChanged) {
            // 应用主题设置
            document.body.setAttribute('data-theme', this.settings.theme);
          }
          
          // 发送字体相关设置更新事件
          if (hasFontSizeChanged || hasFontFamilyChanged) {
            document.dispatchEvent(new CustomEvent('terminal-font-settings-updated', {
              detail: {
                fontSize: this.settings.fontSize,
                fontFamily: this.settings.fontFamily
              }
            }));
          }
          
          // 发送统一的设置更新事件（不包括语言）
          if (hasThemeChanged || hasFontSizeChanged || hasFontFamilyChanged) {
            document.dispatchEvent(new CustomEvent('settings-updated', {
              detail: {
                settings: {...this.settings},
                changes: {
                  language: false, // 不在此处处理语言变更
                  theme: hasThemeChanged,
                  fontSize: hasFontSizeChanged,
                  fontFamily: hasFontFamilyChanged
                }
              }
            }));
          }
          
          if (hasLanguageChanged) {
            console.log('语言设置已保存，将在下次启动应用时生效');
          }
          
          console.log('设置已应用');
        }, 100); // 延迟100毫秒确保UI已完全关闭
        
        console.log('设置已保存');
      } else {
        console.log('设置没有变化，不执行保存');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  }
  
  /**
   * 加载设置
   */
  loadSettings() {
    try {
      // 从本地存储加载
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        this.settings = {...this.settings, ...parsed};
        console.log('从本地存储加载设置:', this.settings);
      }
      
      // 应用主题设置
      document.body.setAttribute('data-theme', this.settings.theme);
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }
  
  /**
   * 翻译UI
   */
  translateUI() {
    try {
      // 如果设置界面打开中，不执行翻译，避免界面元素变化
      if (this.isModalOpen) {
        console.log('设置界面打开中，跳过翻译UI');
        return;
      }
      
      if (window.languageManager) {
        const lang = window.languageManager;
        
        // 翻译标题
        lang.registerElement(document.getElementById('settings-title'), 'settings');
        
        // 翻译外观设置
        lang.registerElement(document.getElementById('appearance-title'), 'appearance');
        lang.registerElement(document.getElementById('language-label'), 'language');
        lang.registerElement(document.getElementById('lang-zh'), 'language_zh');
        lang.registerElement(document.getElementById('lang-en'), 'language_en');
        lang.registerElement(document.getElementById('theme-label'), 'theme');
        lang.registerElement(document.getElementById('theme-dark'), 'theme_dark');
        lang.registerElement(document.getElementById('theme-light'), 'theme_light');
        
        // 翻译终端设置
        lang.registerElement(document.getElementById('terminal-title'), 'terminal');
        lang.registerElement(document.getElementById('font-size-label'), 'font_size');
        lang.registerElement(document.getElementById('font-family-label'), 'font_family');
        
        // 翻译按钮
        lang.registerElement(document.getElementById('save-settings'), 'save');
        lang.registerElement(document.getElementById('cancel-settings'), 'cancel');
        
        // 翻译侧边栏设置按钮
        lang.registerElement(document.querySelector('#settings-btn .btn-text'), 'settings');
      }
    } catch (error) {
      console.error('翻译设置界面失败:', error);
    }
  }
}

// 确保类在全局作用域中可用
window.SettingsComponent = SettingsComponent; 