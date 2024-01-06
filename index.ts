const { ethers } = require("ethers");
require("dotenv").config();

export const provider = new ethers.JsonRpcProvider(`https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);

async function getAbi(addr: string): Promise<any | Error> {
  const contractAddress = addr;
  const polygonscanApiKey = process.env.POLYGONSCAN_API_KEY;
  const url = `https://api.polygonscan.com/api?module=contract&action=getabi&address=${contractAddress}&apikey=${polygonscanApiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status == 1) {
      return data.result;
    } else {
      return { message: `Error: ${data.result}` };
    }
  } catch (error) {
    return { message: `Error fetching ABI: ${error}` };
  }
}

//replace with your token IDs. Add more if you want/need
const tokens = ["1111111", "22222222", "33333333", "44444444", "55555555", "66666666", "77777777"]

const PRIVATE_KEY = process.env.MAIN_PRIVATE_KEY;
const proxy_contract_addr = '0x7573933eB12Fa15D5557b74fDafF845B3BaF0ba2';
const cat_contract_addr = '0xb1db1005ee017ad1235bA3f7dA4BDc1b83f4f108'
let contract: any;

async function contractInteraction() {
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const cat_abi = await getAbi(cat_contract_addr);
  contract = new ethers.Contract(proxy_contract_addr, cat_abi, signer);

  runLoopsWithTimers(tokens);
}

async function feedCat(token_id: any) {
  await contract.feedCat(token_id)
  .then((tx: any) => {
    console.log(`Feed cat #${token_id}: `, tx.hash);
    return tx.hash;
  })
  .catch((error: any) => {
    console.error(`Error feeding cat #${token_id}`);
    return error;
  });
}

async function cleanCat(token_id: any) {
  await contract.cleanCat(token_id)
  .then((tx: any) => {
    console.log(`Clean cat #${token_id}: `, tx.hash);
    return tx.hash;
  })
  .catch((error: any) => {
    console.error(`Error cleaning cat #${token_id}`,);
    return error;
  });
}

async function runLoopsWithTimers(tokens: any, feedMax = 7, cleanMax = 2) {
  let feedRestarts = 0;
  let cleanRestarts = 0;

  async function feedLoop() {
    while (feedRestarts < feedMax) {
      try {
        for (let i = 0; i < tokens.length; i++) {
          await feedCat(tokens[i]);
        }
        feedRestarts++;
        return;
      } catch (err) {
        console.log(err);
        feedRestarts++;
      } finally {
        console.log("Waiting 30 seconds to feed again")
        setTimeout(feedLoop, 30000);
      }
    }
  }

  async function cleanLoop() {
    while (cleanRestarts < cleanMax) {
      try {
        for (let i = 0; i < tokens.length; i++) {
          await cleanCat(tokens[i]);
        }
        cleanRestarts++
        return;
      } catch (err) {
        console.log(err);
        cleanRestarts++;
      } finally {
        console.log("Waiting 30 seconds to clean again")
        setTimeout(cleanLoop, 30000);
      }
    }
  }
  await Promise.all([feedLoop(), cleanLoop()]);
}

contractInteraction()