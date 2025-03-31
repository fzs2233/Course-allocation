const { ethers } = require("ethers");
const fs = require("fs");
require('dotenv').config({ path: './interact/.env' });
const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:7545");

// 读取 JSON 文件
const contractData = JSON.parse(fs.readFileSync("./build/contracts/ICourseAllocation.json", "utf8"));
const voteData = JSON.parse(fs.readFileSync("./build/contracts/Vote.json", "utf8"));
const classData = JSON.parse(fs.readFileSync("./build/contracts/IStudentVote.json", "utf8"));

// 提取合约地址和 ABI
const contractAddress = process.env.contractAddress;
const voteAddress = process.env.VotingContractAddress;
const classContractAddress = process.env.classAddress;
const contractABI = contractData.abi;
const voteABI = voteData.abi;
const classABI = classData.abi;

// 设置提供者（使用 Infura 或本地节点）
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

// 当前登录的账户
let currentSigner = provider.getSigner(0);
// 创建合约实例
let contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
let voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
let classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);

// 注册班级
async function registerClass(name, addr) {
    let isregister = await contract.addressToClassId(addr);//新注册的话 返回值是0
    isregister = isregister.toNumber();
    if(isregister!=0){
        console.log("该班级已经注册")
        return {
            code: -1,
            message: "Class Already Registered",
        };
    }
    let classCount = await contract.classCount();
    classCount = classCount.toNumber();
    classCount = classCount + 1;
    // console.log(classCount);
    await contract.setClassCount(classCount);
    await contract.setClassId(addr, classCount);
    await voteContract.registerVoter(addr);
    await classContract.addClass(name, addr);
    return {
        code: 0,
        message: "Class Registered successfully",
        courseId: classCount
    };
}

// 注册学生
async function registerStudent(classId, name, addr) {
    let isregister = await classContract.addressToStudentId(addr);//新注册的话 返回值是0
    isregister = isregister.toNumber();
    if(isregister!=0){
        console.log("该学生已经注册")
        return {
            code: -1,
            message: "Student Already Registered",
        };
    }
    let studentCount = await classContract.studentCount();
    studentCount = studentCount.toNumber();
    studentCount = studentCount + 1;
    classContract.registerStudent(classId, name, addr);
    return {
        code: 0,
        message: "student Registered successfully",
        courseId: studentCount
    };
}

// 批量添加学生
async function addStudents(classAddr, numOfStudents){
    let studentCount = await classContract.studentCount();
    let classId = await classContract.addressToClassId(classAddr);
    classId = classId.toNumber();
    for (let i = studentCount+1; i <= studentCount+numOfStudents; i++) {
        const studentName = `Student_${i}`; // 学生姓名
        await classContract.addStudentToClass(studentName);
    }
    return{
        code: 0,
        message: `${numOfStudents} Students have been add to class ${classId} successfully`,
    }
}

// 学生投票
async function studentVote(studentId, proposalId, optionId){
    let classId = await classContract.students(studentId).classId();
    classId = classId.toNumber();
    let [optionIds, voteForId] = await classContract.getProposalInfo(classId, proposalId);
    if(!optionIds.include(optionId)){
        console.log("该选项不在该提案中")
        return {
            code: -1,
            message: "Option not in Proposal",
        };
    }
    await classContract.studentVote(studentId, proposalId, optionId);
    return {
        code: 0,
        message: "Student Vote successfully",
    }
}

// 结束班级投票
async function endClassProposal(classAddr, proposalId){
    let [winningTeacher, courseId] = await classContract.getProposalResults(classAddr, proposalId);
    let classId = await classContract.addressToClassId(classAddr);
    classId = classId.toNumber();
    return{
        code: 0,
        message: `Class ${classId} proposal ${proposalId} has been finished and voted teacher ${winningTeacher} successfully`,
    }
}
module.exports = {
    registerClass,
    registerStudent,
    addStudents,
    studentVote,
    endClassProposal
}