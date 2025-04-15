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
async function endClassProposal(classAddr, proposalId) {
    // 获取提案结果
    let [winningTeacher, courseId, teacherIds, teacherIdsVoteCount] = await classContract.getProposalResults(classAddr, proposalId);
    courseId = Number(courseId)
    let classId = await classContract.addressToClassId(classAddr);
    classId = classId.toNumber();

    // 创建投票结果表格
    let tableData = teacherIds.map((teacherId, index) => ({
        老师ID: Number(teacherId),
        票数: Number(teacherIdsVoteCount[index])
    }));
    console.table(tableData);

    // 找出最大票数
    const maxVotes = Math.max(...teacherIdsVoteCount.map(v => v.toNumber()));
    
    // 找出所有获得最大票数的老师
    const maxVoteTeachers = teacherIds.filter((teacherId, index) => 
        teacherIdsVoteCount[index].toNumber() === maxVotes
    ).map(id => id.toNumber());

    if (maxVoteTeachers.length === 1) {
        let teacherProposalId = await classContract.getTeacherProposalId();
        teacherProposalId = teacherProposalId.toNumber();
        // 如果只有一个最大票数的老师，执行投票
        await voteContract.voteChooseTeacher(classAddr, teacherProposalId, maxVoteTeachers[0]);

        return {
            code: 0,
            message: `Class ${classId} proposal ${proposalId} has been finished and voted teacher ${maxVoteTeachers[0]} successfully`
        };
    } else {
        // 如果有多个最大票数的老师，重新创建提案
        // 假设有一个createNewProposal函数
        let result = await createNewClassProposal(courseId, maxVoteTeachers);
        console.log(result)
        return {
            code: 1,
            message: `Multiple teachers have the highest votes. Created new proposal with Id: ${result.classProposalId} for Class ${classId} and Course ${courseId}`
        };
    }
}

// 假设的重新创建提案函数
async function createNewClassProposal(selectedCourseId, candidateId) {
    let tx = await classContract.createProposal("createProposal", selectedCourseId, candidateId);
    let receipt = await tx.wait();
    const event = receipt.events.find(event => event.event === "ProposalCreated");
    let { classProposalId, description } = event.args;
    classProposalId = classProposalId.toNumber();
    return {
        code: 0,
        message: `Create new Proposal in class successfully, Proposal Id: ${classProposalId}`,
        classProposalId: classProposalId,
        selectedCourseId : selectedCourseId,
        candidateTeacherId : candidateId
    };
}

async function endClassProposal_interact(proposalId){
    let currentClassAddress = await currentSigner.getAddress();
    await endClassProposal(currentClassAddress, proposalId);
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