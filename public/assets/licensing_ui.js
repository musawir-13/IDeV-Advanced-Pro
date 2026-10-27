/**
 * IDeV Advanced Pro — Native Licensing & Cloud Entitlements UI
 * Injected under the Cloud setting in the Settings view.
 */

(function () {
  let isCheckingLicense = false;
  let licenseState = null;

  async function fetchLicenseStatus() {
    try {
      const res = await fetch('/api/v1/license/status');
      if (res.ok) {
        licenseState = await res.json();
        return licenseState;
      }
    } catch (e) {
      console.warn('Failed to fetch license status:', e);
    }
    return null;
  }

  function formatKeyInput(value) {
    const digits = value.replace(/[^\d]/g, '').slice(0, 38);
    const parts = [];
    let rem = digits;
    while (rem.length > 5) {
      parts.push(rem.slice(0, 5));
      rem = rem.slice(5);
    }
    if (rem.length > 0) parts.push(rem);
    return parts.join('-');
  }

  function renderLicensingSection(container) {
    if (document.getElementById('idev-cloud-license-card')) return;

    const card = document.createElement('div');
    card.id = 'idev-cloud-license-card';
    card.style.cssText = `
      margin-top: 16px;
      padding: 18px 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-family: inherit;
      color: #1e293b;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    `;

    const isCloudActive = licenseState && licenseState.active;
    const tier = licenseState ? licenseState.tier : 'free';
    const status = licenseState ? licenseState.status : 'FREE';
    const remainingDays = licenseState ? licenseState.remainingDays : 0;
    const expiresAt = licenseState && licenseState.expiresAt ? new Date(licenseState.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;
    const boundDevice = licenseState && licenseState.boundDevice ? licenseState.boundDevice.slice(0, 16) + '...' : 'Bound to current machine';

    let statusBadgeColor = '#64748b';
    let statusBadgeBg = '#f1f5f9';
    let statusLabel = 'Free — Local models only';

    if (isCloudActive) {
      statusBadgeColor = '#059669';
      statusBadgeBg = '#ecfdf5';
      statusLabel = `Active — 60-Day Cloud Entitlement (${remainingDays} days left)`;
    } else if (status === 'EXPIRED') {
      statusBadgeColor = '#d97706';
      statusBadgeBg = '#fffbeb';
      statusLabel = 'Expired — Local models only';
    } else if (status === 'REVOKED') {
      statusBadgeColor = '#dc2626';
      statusBadgeBg = '#fef2f2';
      statusLabel = 'Revoked — Local models only';
    }

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
          <div style="font-weight: 600; font-size: 14px; color: #0f172a; display: flex; align-items: center; gap: 6px;">
            <span>Cloud Access License</span>
            <span style="font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 9999px; background: ${statusBadgeBg}; color: ${statusBadgeColor}; border: 1px solid ${statusBadgeColor}22;">
              ${statusLabel}
            </span>
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
            Unlock premier cloud models with an authorized 38-digit IDeV Advanced Pro product key.
          </div>
        </div>
      </div>

      ${isCloudActive ? `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; font-size: 12px; line-height: 1.6;">
          <div style="display: grid; grid-template-columns: 120px 1fr; gap: 4px;">
            <span style="color: #64748b;">Entitlement Scope:</span>
            <span style="font-weight: 500; color: #0f172a;">Full Cloud Models, Vision & Web Search</span>
            <span style="color: #64748b;">Bound Device:</span>
            <span style="font-family: monospace; font-size: 11px; color: #334155;">${boundDevice}</span>
            <span style="color: #64748b;">Expires On:</span>
            <span style="font-weight: 500; color: #0f172a;">${expiresAt} (${remainingDays} days remaining)</span>
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end;">
          <button id="idev-deactivate-btn" style="background: transparent; border: 1px solid #cbd5e1; color: #64748b; padding: 6px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.15s;">
            Remove Key
          </button>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; gap: 8px;">
            <input 
              id="idev-product-key-input" 
              type="text" 
              placeholder="Enter your 38-digit product key (XXXXX-XXXXX-...)" 
              style="flex: 1; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: monospace; color: #0f172a; background: #ffffff; outline: none;"
            />
            <button 
              id="idev-activate-key-btn" 
              style="background: #0284c7; color: #ffffff; border: none; padding: 8px 18px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.15s; white-space: nowrap;"
            >
              Activate Key
            </button>
          </div>
          <div id="idev-license-feedback" style="font-size: 12px; min-height: 16px; margin-top: 2px;"></div>
          <div style="font-size: 11px; color: #94a3b8; line-height: 1.4;">
            A valid license enables cloud access for 60 days bound to one authorized profile and device. Local models remain 100% free and offline at all times.
          </div>
        </div>
      `}
    `;

    container.appendChild(card);

    // Event listeners
    if (isCloudActive) {
      const deactBtn = document.getElementById('idev-deactivate-btn');
      if (deactBtn) {
        deactBtn.onclick = async () => {
          if (!confirm('Are you sure you want to remove the active cloud entitlement on this device?')) return;
          deactBtn.disabled = true;
          deactBtn.textContent = 'Removing...';
          await fetch('/api/v1/license/deactivate', { method: 'POST' });
          await fetchLicenseStatus();
          card.remove();
          renderLicensingSection(container);
        };
      }
    } else {
      const input = document.getElementById('idev-product-key-input');
      const actBtn = document.getElementById('idev-activate-key-btn');
      const feedback = document.getElementById('idev-license-feedback');

      if (input) {
        input.addEventListener('input', (e) => {
          const cursor = e.target.selectionStart;
          input.value = formatKeyInput(input.value);
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') actBtn.click();
        });
      }

      if (actBtn) {
        actBtn.onclick = async () => {
          const rawKey = input.value;
          feedback.style.color = '#0284c7';
          feedback.textContent = 'Validating and activating license...';
          actBtn.disabled = true;

          try {
            const res = await fetch('/api/v1/license/activate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productKey: rawKey })
            });
            const data = await res.json();

            if (res.ok && data.success) {
              feedback.style.color = '#059669';
              feedback.textContent = 'Activation successful! 60-day cloud access enabled.';
              await fetchLicenseStatus();
              setTimeout(() => {
                card.remove();
                renderLicensingSection(container);
              }, 800);
            } else {
              feedback.style.color = '#dc2626';
              feedback.textContent = data.error || 'Activation failed.';
              actBtn.disabled = false;
            }
          } catch (err) {
            feedback.style.color = '#dc2626';
            feedback.textContent = 'Connection error during activation. Please try again.';
            actBtn.disabled = false;
          }
        };
      }
    }
  }

  function monitorSettingsModal() {
    // Look for the Cloud setting section in the DOM
    const observer = new MutationObserver(() => {
      if (document.getElementById('idev-cloud-license-card')) return;

      // Find text containing "Enable cloud models and web search"
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let cloudTextNode = null;
      while (walker.nextNode()) {
        if (walker.currentNode.nodeValue && walker.currentNode.nodeValue.includes('Enable cloud models')) {
          cloudTextNode = walker.currentNode;
          break;
        }
      }

      if (cloudTextNode) {
        const cloudRow = cloudTextNode.parentElement.closest('div.flex') || cloudTextNode.parentElement.parentElement;
        if (cloudRow && cloudRow.parentElement) {
          const targetContainer = cloudRow.parentElement;
          fetchLicenseStatus().then(() => {
            renderLicensingSection(targetContainer);
          });
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', monitorSettingsModal);
  } else {
    monitorSettingsModal();
  }
})();
