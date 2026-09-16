// SPRINT Laundry - Client Side Script

// Toast Notification
function showToast(message, icon = 'fa-circle-check', isError = false) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');

  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  toastIcon.className = `fa-solid ${icon} ${isError ? 'text-rose-400' : 'text-emerald-400'} text-lg`;

  toast.classList.remove('opacity-0', 'translate-y-20', 'pointer-events-none');
  toast.classList.add('opacity-100', 'translate-y-0');

  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-20', 'pointer-events-none');
  }, 3500);
}

// Copy to Clipboard
function copyToClipboard(text, successMsg = 'Tersalin ke clipboard!') {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg, 'fa-copy');
    }).catch(err => {
      fallbackCopy(text, successMsg);
    });
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast(successMsg, 'fa-copy');
  } catch (err) {
    showToast('Gagal menyalin otomatis', 'fa-triangle-exclamation', true);
  }
  document.body.removeChild(textArea);
}

// Admin Modal Controls
function openNewOrderModal() {
  const modal = document.getElementById('newOrderModal');
  if (modal) {
    modal.classList.remove('hidden');
    calculateTotal();
    setTimeout(() => {
      const input = document.getElementById('customer_name');
      if (input && !input.disabled) input.focus();
    }, 100);
  }
}

function closeNewOrderModal() {
  const modal = document.getElementById('newOrderModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Tab Switcher for Customer Type
function selectCustomerTab(type) {
  const customerTypeInput = document.getElementById('customer_type');
  const tabNew = document.getElementById('tabNewCustomer');
  const tabExist = document.getElementById('tabExistingCustomer');
  const newFields = document.getElementById('newCustomerFields');
  const existFields = document.getElementById('existingCustomerFields');
  const nameInput = document.getElementById('customer_name');
  const phoneInput = document.getElementById('customer_phone');
  const existSelect = document.getElementById('existing_customer_id');

  if (customerTypeInput) customerTypeInput.value = type;

  if (type === 'new') {
    tabNew.className = 'py-2 text-xs font-bold rounded-lg transition-all bg-white text-blue-700 shadow-sm';
    tabExist.className = 'py-2 text-xs font-bold rounded-lg transition-all text-slate-600 hover:text-slate-900';
    newFields.classList.remove('hidden');
    existFields.classList.add('hidden');
    if (nameInput) nameInput.required = true;
    if (phoneInput) phoneInput.required = true;
    if (existSelect) existSelect.required = false;
  } else {
    tabExist.className = 'py-2 text-xs font-bold rounded-lg transition-all bg-white text-blue-700 shadow-sm';
    tabNew.className = 'py-2 text-xs font-bold rounded-lg transition-all text-slate-600 hover:text-slate-900';
    existFields.classList.remove('hidden');
    newFields.classList.add('hidden');
    if (nameInput) nameInput.required = false;
    if (phoneInput) phoneInput.required = false;
    if (existSelect) existSelect.required = true;
  }
}

// Dynamic Price Calculation
function calculateTotal() {
  const serviceSelect = document.getElementById('service_id');
  const weightInput = document.getElementById('weight');
  const totalDisplay = document.getElementById('calculated-total');
  const descDisplay = document.getElementById('calculation-desc');

  if (!serviceSelect || !weightInput || !totalDisplay) return;

  const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
  const price = parseFloat(selectedOption?.getAttribute('data-price')) || 0;
  const weight = parseFloat(weightInput.value) || 0;

  const total = Math.round(price * weight);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(total);

  totalDisplay.textContent = formatted;
  if (descDisplay) {
    descDisplay.textContent = `${weight} kg × ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price)}`;
  }
}

// On DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  // Listen for Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNewOrderModal();
    }
  });

  // Check URL params for success notifications
  const urlParams = new URLSearchParams(window.location.search);
  const createdInvoice = urlParams.get('created');
  if (createdInvoice) {
    showToast(`Pesanan #${createdInvoice} berhasil dibuat!`, 'fa-circle-check');
    // Clean URL without refresh
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  }

  // Initial calculation if modal elements exist
  calculateTotal();
});
