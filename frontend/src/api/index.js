import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: '/api', // 与vue.config.js中的代理配置一致
  timeout: 60000  // 请求超时时间
});

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 可以在这里设置请求头等信息
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    console.error('请求失败:', error);
    return Promise.reject(error);
  }
);

// API函数
export default {
  // 初始化系统数据
  initializeData() {
    return api.post('/initialize');
  },
  
  // 获取合约ABI
  getContractABI() {
    return api.get('/contract-abi');
  },
  
  // 注册用户
  register(data) {
    return api.post('/register', data);
  },
  
  // 切换用户
  switchUser(data) {
    return api.post('/switch-user', data);
  },
  
  // 获取课程重要程度和智能体适合程度
  getCourseImportance() {
    return api.get('/course-importance');
  },
  
  // 获取教师对课程适合程度
  getTeacherSuitability() {
    return api.get('/teacher-suitability');
  }
}; 