var Vote = artifacts.require("../contracts/Vote.sol");
var CourseAllocation = artifacts.require("../contracts/ICourseAllocation.sol");
var IStudentVote = artifacts.require("../contracts/IStudentVote.sol");
var TeacherVote = artifacts.require("../contracts/TeacherVote.sol");

module.exports = async function (deployer) {
  // 1. 先部署基础合约
  await deployer.deploy(CourseAllocation);
  const courseAlloc = await CourseAllocation.deployed();

  await deployer.deploy(Vote);
  await deployer.deploy(IStudentVote);

  // 2. 最后部署 TeacherVote 并传入参数
  await deployer.deploy(TeacherVote, courseAlloc.address); 
};
