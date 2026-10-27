/**
 * IDeV Advanced Pro — Native Licensing & Cloud Entitlements UI
 * Injected under the Cloud setting in the Settings view.
 * Exclusively supports two tiers: Free and Ultimate.
 */

(function () {
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
      margin-top: 18px;
      padding: 18px 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-family: inherit;
      color: #1e293b;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    `;

    const isCloudActive = Boolean(licenseState && licenseState.active);
    const tier = (licenseState && licenseState.tier === 'ultimate') || isCloudActive ? 'Ultimate' : 'Free';
    const status = licenseState ? licenseState.status : 'FREE';
    const remainingDays = licenseState ? licenseState.remainingDays : 0;
    const remainingHours = licenseState ? (licenseState.remainingHours % 24) : 0;
    const expiresAt = licenseState && licenseState.expiresAt ? new Date(licenseState.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
    const boundDevice = licenseState && licenseState.boundDevice ? licenseState.boundDevice.slice(0, 16) + '...' : 'Bound to current machine';
    const boundProfile = licenseState && licenseState.boundProfile ? licenseState.boundProfile : 'Current local profile';

    let statusBadgeColor = '#64748b';
    let statusBadgeBg = '#f1f5f9';
    let statusLabel = 'Free — Local models only';

    if (isCloudActive) {
      statusBadgeColor = '#059669';
      statusBadgeBg = '#ecfdf5';
      statusLabel = `Ultimate — Active (${remainingDays} days left)`;
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
      <!-- Account Tier Section -->
      <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 13px; font-weight: 600; color: #0f172a;">Account Tier</span>
          <span style="font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 9999px; background: ${tier === 'Ultimate' ? '#dcfce7' : '#f1f5f9'}; color: ${tier === 'Ultimate' ? '#15803d' : '#475569'}; border: 1px solid ${tier === 'Ultimate' ? '#86efac' : '#cbd5e1'};">
            ${tier}
          </span>
        </div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
          ${tier === 'Ultimate' 
            ? 'Ultimate tier active: 60-day single-profile cloud model execution, multimodal reasoning, and web intelligence enabled.' 
            : 'Free tier active: 100% offline local model inference, unlimited conversations, and local tool settings.'}
        </div>
      </div>

      <!-- Ultimate License Management Section -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="font-weight: 600; font-size: 13px; color: #0f172a; display: flex; align-items: center; gap: 8px;">
            <span>Ultimate License</span>
            <span style="font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 9999px; background: ${statusBadgeBg}; color: ${statusBadgeColor}; border: 1px solid ${statusBadgeColor}22;">
              Status: ${statusLabel}
            </span>
          </div>
        </div>

        <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
          ${isCloudActive
            ? 'Your device and profile are bound to this 60-day Ultimate entitlement.'
            : 'Enter your 38-digit product key to unlock eligible cloud features for 60 days.'}
        </div>

        ${isCloudActive ? `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 12px; font-size: 12px; line-height: 1.6;">
            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 6px;">
              <span style="color: #64748b;">Tier:</span>
              <span style="font-weight: 600; color: #0f172a;">Ultimate</span>
              <span style="color: #64748b;">License Status:</span>
              <span style="font-weight: 600; color: #059669;">Active</span>
              <span style="color: #64748b;">Profile Binding:</span>
              <span style="color: #0f172a;">${boundProfile}</span>
              <span style="color: #64748b;">Device Binding:</span>
              <span style="font-family: monospace; font-size: 11px; color: #334155;">${boundDevice}</span>
              <span style="color: #64748b;">Expiration Date:</span>
              <span style="font-weight: 500; color: #0f172a;">${expiresAt}</span>
              <span style="color: #64748b;">Time Remaining:</span>
              <span style="font-weight: 600; color: #0284c7;">${remainingDays} days, ${remainingHours} hours</span>
              <span style="color: #64748b;">Renewal Instructions:</span>
              <span style="color: #64748b; font-size: 11px;">To renew, activate a new 38-digit product key upon entitlement expiration.</span>
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
                placeholder="Enter 38-digit key (XXXXX-XXXXX-XXXXX-...)" 
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
              A single-use Ultimate product key binds 60 days of cloud access to this machine and profile. Local models remain 100% free, offline, and unlimited at all times.
            </div>
          </div>
        `}
      </div>
    `;

    container.appendChild(card);

    // Event listeners
    if (isCloudActive) {
      const deactBtn = document.getElementById('idev-deactivate-btn');
      if (deactBtn) {
        deactBtn.onclick = async () => {
          if (!confirm('Are you sure you want to remove the active Ultimate entitlement on this device?')) return;
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
          feedback.textContent = 'Validating 38-digit key and binding entitlement...';
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
              feedback.textContent = 'Activation successful! Ultimate 60-day cloud access enabled.';
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
    const observer = new MutationObserver(() => {
      if (document.getElementById('idev-cloud-license-card')) return;

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', monitorSettingsModal);
  } else {
    monitorSettingsModal();
  }
})();
