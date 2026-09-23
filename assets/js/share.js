import { buildUrl } from './utils.js';

export function getJoinUrl(joinCode) {
  return buildUrl('./student-input.html', { join: joinCode });
}

export function renderSharePanel({ joinCode, codeEl, urlEl, qrEl, copyButton }) {
  if (!joinCode) return;
  const url = getJoinUrl(joinCode);
  if (codeEl) codeEl.textContent = joinCode;
  if (urlEl) { urlEl.textContent = url; urlEl.href = url; }

  // Do not destroy/recreate the QR code on every polling refresh.
  // Re-render only if the actual join URL changed.
  if (qrEl && qrEl.dataset.qrUrl !== url) {
    qrEl.innerHTML = '';
    qrEl.dataset.qrUrl = url;
    if (window.QRCode) {
      new window.QRCode(qrEl, {
        text: url,
        width: 256,
        height: 256,
        correctLevel: window.QRCode.CorrectLevel.M
      });
    } else {
      qrEl.textContent = 'QR Code unavailable';
    }
  }

  if (copyButton && !copyButton.dataset.bound) {
    copyButton.dataset.bound = '1';
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        const old = copyButton.textContent;
        copyButton.textContent = '已複製 / Copied';
        setTimeout(() => { copyButton.textContent = old; }, 1500);
      } catch (_) {
        window.prompt('複製網址 / Copy URL:', url);
      }
    });
  }
}
