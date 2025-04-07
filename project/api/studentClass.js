const { ethers } = require("ethers");
const fs = require("fs");
require('dotenv').config({ path: './interact/.env' });
const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:7545");
const inquirer = require('inquirer');

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
let currentName = "account_0";
// 创建合约实例
let contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
let voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
let classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);

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
async function studentVote(studentAddress, proposalId, optionId){
    // console.log(studentAddress)
    let studentId = await classContract.addressToStudentId(studentAddress);
    // console.log(studentId);
    studentId = studentId.toNumber();
    let student = await classContract.students(studentId);
    let classId = student.classId;
    classId = classId.toNumber();
    let [optionIds, voteForId] = await classContract.getProposalInfo(classId, proposalId);
    // console.log(classId, proposalId)
    optionIds = optionIds.map(id => id.toNumber());
    // console.log(optionIds)
    if(!optionIds.includes(optionId)){
        console.log("该选项不在该提案中")
        return {
            code: -1,
            message: "Option not in Proposal",
        };
    }
    await classContract.studentVote(studentId, proposalId, optionId);
    return {
        code: 0,
        message: `Student ${studentId} Vote for teacher ${optionId} successfully`,
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

async function endClassProposal_interact(proposalId){
    let currentClassAddress = await currentSigner.getAddress();
    console.log(await endClassProposal(currentClassAddress, proposalId));
}

async function switchCurrentSigner_studentClass(newAddress, newCurrentName){
    currentSigner = provider.getSigner(newAddress);
    contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    currentName = newCurrentName;
}

module.exports = {
    switchCurrentSigner_studentClass,
    addStudents,
    studentVote,
    endClassProposal_interact
}