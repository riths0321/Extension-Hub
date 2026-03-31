'use strict';

class AutoFill {
  constructor() { this.bindMessages(); }

  bindMessages() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.action === 'getLoginFields')
        sendResponse({ fields: this.findLoginFields() });
      if (message.action === 'fillCredentials') {
        this.fillCredentials(message.username, message.password);
        sendResponse({ success: true });
      }
      if (message.action === 'detectLoginPage')
        sendResponse({ isLoginPage: this.hasLoginForm() });
      return true;
    });
  }

  hasLoginForm() {
    return document.querySelector('input[type="password"]') !== null;
  }

  findLoginFields() {
    return Array.from(
      document.querySelectorAll('input[type="text"],input[type="email"],input[type="password"]')
    ).map(i => ({
      type: i.type,
      name: i.name || i.id || i.className,
      value: '',
      placeholder: i.placeholder
    }));
  }

  fillCredentials(username, password) {
    const inputs = document.querySelectorAll(
      'input[type="text"],input[type="email"],input[type="password"]'
    );
    inputs.forEach(input => {
      if (input.type === 'password') {
        input.value = password;
      } else {
        const attr = (input.name + input.id + input.placeholder).toLowerCase();
        if (attr.includes('user') || attr.includes('email') || attr.includes('login'))
          input.value = username;
      }
      input.dispatchEvent(new Event('input',  { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
}

new AutoFill();
