#!/usr/bin/env node

/**
 * IDeV Advanced Pro — Administrator License Management CLI
 * Restricted tool for authorized IDeV Limited administrative operations.
 */

const {
  issueProductKey,
  revokeLicense,
  listLicenses,
  getActiveEntitlement
} = require('../lib/license_authority');
const { formatProductKeyDisplay } = require('../lib/crypto_utils');

function printUsage() {
  console.log(`
IDeV Advanced Pro — License Administration Tool
Usage:
  node bin/license-admin.js issue [--customer <name>] [--notes <desc>]
      Issue a new 38-digit product key with 60-day cloud entitlement.

  node bin/license-admin.js list
      List all issued product keys, states, and device bindings.

  node bin/license-admin.js revoke <key-or-license-id>
      Revoke an issued or active license immediately.

  node bin/license-admin.js status
      Display the current active local entitlement status.
`);
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  printUsage();
  process.exit(0);
}

switch (command) {
  case 'issue': {
    let customer = 'Enterprise Client';
    let notes = '60-day single-device cloud access';

    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--customer' && args[i + 1]) {
        customer = args[i + 1];
        i++;
      } else if (args[i] === '--notes' && args[i + 1]) {
        notes = args[i + 1];
        i++;
      }
    }

    const issued = issueProductKey({ issuedTo: customer, notes });
    console.log('\n=== NEW 38-DIGIT PRODUCT KEY ISSUED ===');
    console.log(`Raw Key:          ${issued.key}`);
    console.log(`Display Grouped:  ${formatProductKeyDisplay(issued.key)}`);
    console.log(`License ID:       ${issued.licenseId}`);
    console.log(`Tier Granted:     Ultimate`);
    console.log(`Entitlement:      ${issued.permittedDurationDays}-day Ultimate Cloud Access (Single Device, Single Profile)`);
    console.log(`Status:           ${issued.state}`);
    console.log('=======================================\n');
    break;
  }

  case 'list': {
    const list = listLicenses();
    console.log(`\nFound ${list.length} license record(s):`);
    console.table(list);
    break;
  }

  case 'revoke': {
    const target = args[1];
    if (!target) {
      console.error('Error: Please provide a 38-digit product key or license ID to revoke.');
      process.exit(1);
    }
    const res = revokeLicense(target);
    if (res.success) {
      console.log(`[SUCCESS] ${res.message}`);
    } else {
      console.error(`[ERROR] ${res.message}`);
      process.exit(1);
    }
    break;
  }

  case 'status': {
    const active = getActiveEntitlement();
    console.log('\n=== CURRENT ACTIVE LOCAL ENTITLEMENT ===');
    console.log(`Tier:             ${active.tier.toUpperCase()}`);
    console.log(`Status:           ${active.evaluation ? active.evaluation.status : active.status}`);
    console.log(`License ID:       ${active.licenseId}`);
    console.log(`Bound Profile:    ${active.boundProfileId || 'None'}`);
    console.log(`Bound Device:     ${active.boundDeviceFingerprint || 'None'}`);
    console.log(`Activated At:     ${active.activatedAt || 'N/A'}`);
    console.log(`Expires At:       ${active.expiresAt || 'N/A'}`);
    console.log(`Remaining Days:   ${active.evaluation ? active.evaluation.remainingDays : 0}`);
    console.log('========================================\n');
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
}
