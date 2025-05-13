// contractConfig.js
import axios from 'axios';

// 创建一个对象来存储合约配置
const contractAddresses = {
  ContractAddress: "",
  VotingContractAddress: "",
  classAddress: "",
  teachervoteAddress: ""
};

// 从后端获取最新的合约配置
async function loadContractConfig() {
  try {
    const response = await axios.get('/api/contract-config');
    if (response.data.success) {
      const config = response.data.data;
      // 更新contractAddresses对象
      Object.keys(config).forEach(key => {
        contractAddresses[key] = config[key];
      });
      console.log('成功加载合约配置');
    } else {
      console.error('加载合约配置失败');
    }
  } catch (error) {
    console.error('获取合约配置出错:', error);
  }
}

// 应用启动时加载合约配置
loadContractConfig();

export default contractAddresses; 