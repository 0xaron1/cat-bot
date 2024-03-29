const { ethers } = require("ethers");
require("dotenv").config();

//export const provider = new ethers.JsonRpcProvider(`https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
export const provider = new ethers.JsonRpcProvider(
  `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
);

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

const tokens = ["111111", "222222", "333333", "444444", "555555"];

const PRIVATE_KEY = process.env.MAIN_PRIVATE_KEY;
const proxy_contract_addr = "0x7573933eB12Fa15D5557b74fDafF845B3BaF0ba2";
const cat_contract_addr = "0xb1db1005ee017ad1235bA3f7dA4BDc1b83f4f108";
let contract: any;
let runningErrCount: any = 0;

async function contractInteraction() {
  const signerMain = new ethers.Wallet(PRIVATE_KEY, provider);
  const cat_abi = await getAbi(cat_contract_addr);
  contract = new ethers.Contract(proxy_contract_addr, cat_abi, signerMain);

  runLoopsWithTimers(tokens);
}

async function feedCat(token_id: any) {
  await contract
    .feedCat(token_id)
    .then((tx: any) => {
      console.log(`Feed cat #${token_id}: `, tx.hash);
      return tx.hash;
    })
    .catch((error: any) => {
      console.error(`Error feeding cat #${token_id}`);
      runningErrCount++;
      return error;
    });
}

async function cleanCat(token_id: any) {
  await contract
    .cleanCat(token_id)
    .then((tx: any) => {
      console.log(`Clean cat #${token_id}: `, tx.hash);
      return tx.hash;
    })
    .catch((error: any) => {
      console.error(`Error cleaning cat #${token_id}`);
      runningErrCount++;
      return error;
    });
}

//adjust params to how many cleans/feeds you want
async function runLoopsWithTimers(tokens: any, feedMax = 9, cleanMax = 6) {
  let feedRestarts = 0;
  let cleanRestarts = 0;
  let cleanRan = false;

  async function feedLoop() {
    if (runningErrCount >= tokens.length - 1) {
      cleanRestarts = cleanMax;
      feedRestarts = feedMax;
    }
    while (feedRestarts < feedMax) {
      runningErrCount = 0;
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
        if (!cleanRan) {
          cleanRan = true;
          cleanLoop();
        }
        if (runningErrCount < tokens.length - 1) {
          console.log("Waiting 90 seconds to feed again");
          setTimeout(feedLoop, 90000);
        }
        console.log(
          `Exiting after ${runningErrCount} errors. You might be done :D`
        );
      }
    }
  }

  async function cleanLoop() {
    if (runningErrCount >= tokens.length - 1) {
      cleanRestarts = cleanMax;
      feedRestarts = feedMax;
    }
    while (cleanRestarts < cleanMax && runningErrCount < tokens.length) {
      runningErrCount = 0;
      try {
        for (let i = 0; i < tokens.length; i++) {
          await cleanCat(tokens[i]);
        }
        cleanRestarts++;
        return;
      } catch (err) {
        console.log(err);
        cleanRestarts++;
      } finally {
        console.log("Waiting 90 seconds to clean again");
        setTimeout(cleanLoop, 90000);
      }
      if (runningErrCount < tokens.length - 1) {
        console.log("Waiting 90 seconds to feed again");
        setTimeout(feedLoop, 90000);
      }
    }
  }
  await Promise.all([feedLoop()]);
}

contractInteraction();
