export function qs(selector) {
  return document.querySelector(selector);
}

export function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

export function setMessage(element, message, type = 'info') {
  if (!element) return;
  const classMap = {
    success: 'alert alert-success',
    danger: 'alert alert-danger',
    warning: 'alert alert-warning',
    info: 'alert alert-info'
  };
  element.className = classMap[type] || classMap.info;
  element.textContent = message;
}

export function clearMessage(element) {
  if (!element) return;
  element.className = '';
  element.textContent = '';
}

export function goTo(url) {
  window.location.href = url;
}

export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

export function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

export function sanitizeJoinCode(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 4);
}

export function buildUrl(path, params = {}) {
  const url = new URL(path, window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

export function saveStorage(key, value) {
  localStorage.setItem(key, String(value));
}

export function readStorage(key) {
  return localStorage.getItem(key);
}

export function removeStorage(key) {
  localStorage.removeItem(key);
}
