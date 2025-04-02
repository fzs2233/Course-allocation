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

// 老师自评
async function giveScoreByMyself(teacherId, scores) {
    let reallyAssignedCourses = await contract.getTeacherReallyAssignedCourses(teacherId);
    if(reallyAssignedCourses.length != scores.length) {
        console.log("输入的分数数量与分配的课程数量不匹配");
        return {
            code: -1,
            message: "输入的分数数量与分配的课程数量不匹配"
        };
    }
    for (let i = 0; i < reallyAssignedCourses.length; i++) {
        await contract.setCourseSelfScore(reallyAssignedCourses[i], scores[i]);
    }
    return {
        code: 0,
        message: "成功给课程打分"
    };
}

// 班级评价
async function giveScoreByClass(teacherId, classId, scores) {
    let assignedCourses = await contract.getTeacherReallyAssignedCourses(teacherId); 
}