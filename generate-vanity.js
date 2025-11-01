import { ethers } from 'ethers';

function generateVanityAddress(prefix) {
  prefix = prefix.toLowerCase();
  let attempts = 0;
  const startTime = Date.now();

  console.log(`\n🔍 Searching for address starting with "0x${prefix}"...`);
  console.log(`⏱️  This may take a few seconds...\n`);

  while (true) {
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address.toLowerCase();
    attempts++;

    // Log progress every 5000 attempts
    if (attempts % 5000 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (attempts / elapsed).toFixed(0);
      console.log(`⚡ Checked ${attempts.toLocaleString()} addresses (${rate}/sec)...`);
    }

    // Check if address starts with desired prefix (after 0x)
    if (address.slice(2).startsWith(prefix)) {
      const elapsed = (Date.now() - startTime) / 1000;
      console.log('\n🎉 ✅ Found vanity address!\n');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`📍 Address:     ${wallet.address}`);
      console.log(`🔑 Private Key: ${wallet.privateKey}`);
      console.log(`📝 Mnemonic:    ${wallet.mnemonic.phrase}`);
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`\n📊 Stats:`);
      console.log(`   • Attempts: ${attempts.toLocaleString()}`);
      console.log(`   • Time: ${elapsed.toFixed(2)} seconds`);
      console.log(`   • Rate: ${(attempts / elapsed).toFixed(0)} addr/sec`);
      console.log(`\n⚠️  SECURITY WARNING:`);
      console.log(`   • Write down the private key and mnemonic on paper`);
      console.log(`   • Never share them with anyone`);
      console.log(`   • Store them in a secure location`);
      console.log(`   • This address works on both Ethereum and BSC\n`);
      break;
    }
  }
}

// Get prefix from command line argument or use default "boo"
const prefix = process.argv[2] || 'boo';

// Validate prefix
if (!/^[0-9a-fA-F]+$/.test(prefix)) {
  console.error('❌ Error: Prefix must contain only hexadecimal characters (0-9, a-f)');
  process.exit(1);
}

if (prefix.length > 6) {
  console.warn('⚠️  Warning: Generating addresses with 6+ character prefix may take hours or days!');
}

console.log('\n🐼 Panboo Vanity Address Generator');
console.log('═══════════════════════════════════════\n');

generateVanityAddress(prefix);
