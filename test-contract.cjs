const ethers = require('ethers');

const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');
const tokenAddress = '0x4D62931968fd185423cBf4eA029Be4D48C35312E';

async function test() {
  try {
    // Check if contract exists
    const code = await provider.getCode(tokenAddress);
    console.log('Contract deployed:', code !== '0x');
    console.log('Code length:', code.length);

    if (code === '0x') {
      console.log('ERROR: No contract found at this address!');
      return;
    }

    // Try to read owner
    const abi = ['function owner() view returns (address)'];
    const contract = new ethers.Contract(tokenAddress, abi, provider);
    const owner = await contract.owner();
    console.log('Contract owner:', owner);
    console.log('Expected wallet:', '0xb008e4eE98fF8991fDc079537157eF7ACF2FE614');
    console.log('Match:', owner.toLowerCase() === '0xb008e4eE98fF8991fDc079537157eF7ACF2FE614'.toLowerCase());

  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
