var Vote = artifacts.require("../contracts/Vote.sol");
var ICourseAllocation = artifacts.require("../contracts/ICourseAllocation.sol");
var IStudentVote = artifacts.require("../contracts/IStudentVote.sol");

module.exports = function(deployer) {
  // 部署 CourseAllocation 合约
  deployer.deploy(ICourseAllocation);

  // 部署 Vote 合约
  deployer.deploy(Vote);

  // 部署IStudentVote合约
  deployer.deploy(IStudentVote);

  // // 部署第二个 studentVote 合约实例
  // deployer.deploy(studentVote).then(function() {
  //   // 这里可以添加一些逻辑，比如记录第二个实例的地址
  //   console.log("Second studentVote deployed at:", studentVote.address);
  // });
};