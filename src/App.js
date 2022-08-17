import { useEffect, useState } from 'react';
import Web3 from 'web3';
import Web3Modal from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import axios from 'axios';

import { contractABI } from './contractABI';

import './App.css';

const smartContractAddress = '0x9d9fA9DbAe391C3FB6866F43De62FF3B393133b2';
const xClubWalletAddress = '0x007a86bb3a8649590e84013dc62900632a8ec89f';
const binancePegETHTokenAddress = '0x2170ed0880ac9a755fd29b2688956bd959f933f8';

function App() {
  let [provider, setProvider] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [web3Modal, setWeb3Modal] = useState(null);

  async function init() {
    const web3 = new Web3(new Web3.providers.HttpProvider('https://bsc-dataseed1.binance.org/'));
    
    const ProXContract = new web3.eth.Contract(contractABI, smartContractAddress);
  
    const rewardsContractAddress = await ProXContract.methods.dividendTracker().call();
    const totalRewardsDistributed = await ProXContract.methods.getTotalDividendsDistributed().call();
    const totalDividendHolders = await ProXContract.methods.getNumberOfDividendTokenHolders().call();
    const xClubWalletDividendsInfo = await ProXContract.methods.getAccountDividendsInfo(xClubWalletAddress).call();
    const binancePegETHPrice = await axios
    .get(`https://api.coingecko.com/api/v3/simple/token_price/binance-smart-chain?contract_addresses=${binancePegETHTokenAddress}&vs_currencies=usd`)
    .then(res => res.data[binancePegETHTokenAddress].usd);
    
    console.log("Rewards Contract Address: ", rewardsContractAddress);
    console.log("Total Rewards Distributed: ", totalRewardsDistributed / Math.pow(10, 18));
    console.log("Total Rewards Distributed USD: ", totalRewardsDistributed / Math.pow(10, 18) * binancePegETHPrice);
    console.log("Total Dividend Holders: ", totalDividendHolders);
    console.log("Total Rewards Distributed To XClub Wallet: ", xClubWalletDividendsInfo[4] / Math.pow(10, 18));
    console.log("Total Rewards Distributed To XClub Wallet USD: ", xClubWalletDividendsInfo[4] / Math.pow(10, 18) * binancePegETHPrice);

    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        display: {
          name: "WalletConnect",
          description: ""
        },
        options: {
          rpc: {
            56: 'https://bsc-dataseed.binance.org/'
          },
          network:'binance'
        }
      },
    };

    let web3_Modal = new Web3Modal({
      cacheProvider: false, // optional
      providerOptions, // required
      disableInjectedProvider: false, // optional, For MetaMask / Brave / Opera.
      theme: {
        background: "rgb(39, 49, 56)",
        main: "rgb(199, 199, 199)",
        secondary: "rgb(136, 136, 136)",
        border: "rgba(195, 195, 195, 0.14)",
        hover: "rgb(16, 26, 32)"
      }
    });

    setWeb3Modal(web3_Modal);
  }

  async function connectWallet() {
    if(typeof window.ethereum === 'undefined') {
      console.log("Please install the MetaMask");
    } else {
      if(!walletConnected) {
        try {
          provider = await web3Modal.connect();
        } catch(e) {
          console.log("Could not get a wallet connection", e);
          return;
        }
        setProvider(provider);
        // Subscribe to accounts change
        provider.on("accountsChanged", (accounts) => {
          fetchAccountData();
        });
        console.log('provider chain changed')
        // Subscribe to chainId change
        provider.on("chainChanged", (chainId) => {
          fetchAccountData();
        });
        console.log('provider network changed')
        // Subscribe to networkId change
        provider.on("networkChanged", (networkId) => {
          fetchAccountData();
        });
        setWalletConnected(true);
        await refreshAccountData();
      } else {
        setWalletConnected(!walletConnected);
        await Disconnect();
      }
    }
  }

  async function refreshAccountData() {
    console.log("refreshAccountData");
    await fetchAccountData(provider);
  }

  async function Disconnect() {
    if(provider.close) {
      await provider.close();
  
      await web3Modal.clearCachedProvider();
      setProvider(null);
    }
    setWalletConnected(false);
  }

  async function fetchAccountData() {
    let web3 = new Web3(provider);
  
    const chainId = await web3.eth.getChainId();
    if(chainId === 56) {
      const ProXContract = new web3.eth.Contract(contractABI, smartContractAddress);

      const accounts = await web3.eth.getAccounts();

      const userWalletDividendsInfo = await ProXContract.methods.getAccountDividendsInfo(accounts[0]).call();
      console.log("Total Rewards Distributed To User Wallet: ", userWalletDividendsInfo[4] / Math.pow(10, 18));
    } else {
      console.log("Please select the Binance Smart Chain Network");
    }
  }

  useEffect(()=>{
    init();
  }, []);

  return (
    <div className="App">
      <button
        onClick={() => connectWallet()}
      >
        {walletConnected ? "Disconnect Wallet" : "Connect Wallet"}
      </button>
    </div>
  );
}

export default App;
