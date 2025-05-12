import { createStore } from 'vuex'

export default createStore({
  state: {
    account: null,
    web3: null,
    contracts: {
      courseAllocation: null,
      vote: null,
      studentVote: null,
      teacherVote: null
    },
    isInitialized: false
  },
  getters: {
    isConnected: state => !!state.account
  },
  mutations: {
    setAccount(state, account) {
      state.account = account
    },
    setWeb3(state, web3) {
      state.web3 = web3
    },
    setContracts(state, contracts) {
      state.contracts = contracts
    },
    setInitialized(state, status) {
      state.isInitialized = status
    }
  },
  actions: {
    async connectWallet({ commit }) {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
          commit('setAccount', accounts[0])
          return accounts[0]
        } catch (error) {
          console.error('连接钱包失败:', error)
          return null
        }
      } else {
        console.error('请安装MetaMask钱包')
        return null
      }
    }
  },
  modules: {
  }
}) 