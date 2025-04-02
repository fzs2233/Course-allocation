var CourseAllocation = artifacts.require("../contracts/CourseAllocation.sol");
// var baseproposal = artifacts.require("../contracts/newContracts/baseproposal.sol");
// var baseproposal = artifacts.require("../contracts/newContracts/baseproposal.sol");
// var PunchCard = artifacts.require("../contracts/newContracts/PunchCard.sol");
// var Myballot = artifacts.require("../contracts/Myballot.sol");
// var finanace = artifacts.require("../contracts/Finance/finance.sol");
module.exports = function(deployer) {
  //部署合约
  // deployer.deploy(baseproposal, 'name', 'name', 0,0,0,0);
  deployer.deploy(CourseAllocation);
  // deployer.deploy(finanace, { value: web3.utils.toWei("30", "ether") });
  // deployer.deploy(PunchCard);
  // deployer.deploy(Myballot,['0x1EE2795f42BD4CD585DF085Bd307738ADe8A4Ed8', '0xECAe3e72a037485B6CC9c457DAC623CEC627BDae', '0xEEc343857BbC1A64e992A8F7598E052847E7c51E']);
};