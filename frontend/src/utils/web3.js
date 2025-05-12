import { ethers } from 'ethers';
import Web3 from 'web3';
import contractAddresses from '../contractConfig';

// 创建Web3实例
const getWeb3 = () => {
  return new Promise(async (resolve, reject) => {
    // 检查MetaMask是否安装
    if (window.ethereum) {
      const web3 = new Web3(window.ethereum);
      try {
        // 请求用户授权
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        resolve(web3);
      } catch (error) {
        reject(error);
      }
    } 
    // 如果用户没有MetaMask，尝试使用本地provider
    else if (window.web3) {
      const web3 = new Web3(window.web3.currentProvider);
      resolve(web3);
    } 
    // 如果没有注入的web3实例，使用本地开发环境
    else {
      const provider = new Web3.providers.HttpProvider('http://127.0.0.1:7545');
      const web3 = new Web3(provider);
      resolve(web3);
    }
  });
};

// 获取Ethers的Provider
const getEthersProvider = () => {
  if (window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  } else {
    return new ethers.providers.JsonRpcProvider('http://127.0.0.1:7545');
  }
};

// 获取合约实例
const getContracts = async (abis) => {
  const provider = getEthersProvider();
  const signer = provider.getSigner();

  const contracts = {
    courseAllocation: new ethers.Contract(
      contractAddresses.ContractAddress,
      abis.courseAllocationABI,
      signer
    ),
    vote: new ethers.Contract(
      contractAddresses.VotingContractAddress,
      abis.voteABI,
      signer
    ),
    studentVote: new ethers.Contract(
      contractAddresses.classAddress,
      abis.studentVoteABI,
      signer
    ),
    teacherVote: new ethers.Contract(
      contractAddresses.teachervoteAddress,
      abis.teacherVoteABI,
      signer
    )
  };

  return contracts;
};

export {
  getWeb3,
  getEthersProvider,
  getContracts
}; 