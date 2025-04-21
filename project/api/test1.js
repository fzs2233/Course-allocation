const { ethers } = require("ethers");
const fs = require("fs");
require('dotenv').config({ path: './interact/.env' });
const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:7545");
const inquirer = require('inquirer');

// Load JSON files
const contractData = JSON.parse(fs.readFileSync("./build/contracts/ICourseAllocation.json", "utf8"));
const teacherVoteData = JSON.parse(fs.readFileSync("./build/contracts/TeacherVote.json", "utf8"));

// Extract addresses and ABI
const contractAddress = process.env.contractAddress;
const teacherVoteAddress = process.env.teachervoteAddress;
const contractABI = contractData.abi;
const teacherVoteABI = teacherVoteData.abi;

// Provider setup
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

const GAS_CONFIG = {
    gasLimit: 6700000, // 提升至500万
    gasPrice: Web3.utils.toWei('20', 'gwei') // 明确gas价格
  };

// Current account
let currentSigner = provider.getSigner(0);

// Contract instances
let contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
let teacherVoteContract = new ethers.Contract(teacherVoteAddress, teacherVoteABI, currentSigner);

// Switch account
async function switchCurrentSigner_test1(newAddress){
    currentSigner = provider.getSigner(newAddress);
    teacherVoteContract = new ethers.Contract(teacherVoteAddress, teacherVoteABI, currentSigner);
}

// Function to create a proposal without any rule selection
async function createProposal() {
    // 调用合约创建提案，不需要任何交互，只是创建提案
    const options = [1, 2]; // 选项：1 反对, 2 赞成

    // 调用合约创建提案
    const tx = await teacherVoteContract.createCombinedProposal(options, GAS_CONFIG); // 无需其他输入
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === "NewCombinedProposal");
    const proposalId = event.args.proposalId;

    console.log(`提案创建成功，proposalId = ${proposalId}`);
}



// Teacher voting (updated for no rating)
async function init_teacherVote() {
    const answer = await inquirer.prompt([
        { 
            type: "input", 
            name: "proposalId", 
            message: "请输入提案 ID:", 
            validate: val => !isNaN(parseInt(val)), 
            filter: Number 
        },
        { 
            type: "list", 
            name: "isSuitable", 
            message: "请选择倾向的规则:", 
            choices: [
                { name: "Cost-effectiveness", value: 1 }, 
                { name: "Suitability&Preference", value: 0 }
            ]
        }
    ]);

    // 获取当前账户地址
    const addr = await currentSigner.getAddress();
    const teacherId = await contract.addressToTeacherId(addr);
    console.log("当前账户地址:", addr);
    console.log("对应教师ID:", teacherId.toString());

    // 提交投票：只提交提案ID和选项（1或0）
    const tx = await teacherVoteContract.submitCombinedVote(
        answer.proposalId, 
        answer.isSuitable,  // 投票选项 1 或 0
        GAS_CONFIG
    );
    await tx.wait();

    console.log(`教师投票成功：提案ID ${answer.proposalId}`);
}

async function init_teacherVote_auto(proposalId, isSuitable) {

    // 获取当前账户地址
    const addr = await currentSigner.getAddress();
    const teacherId = await contract.addressToTeacherId(addr);
    console.log("当前账户地址:", addr);
    console.log("对应教师ID:", teacherId.toString());

    // 提交投票：只提交提案ID和选项（1或0）
    const tx = await teacherVoteContract.submitCombinedVote(
        proposalId, 
        isSuitable,  // 投票选项 1 或 0
        GAS_CONFIG
    );
    await tx.wait();

    console.log(`教师投票成功：提案ID ${proposalId}`);
}

let teacherScores = {};
async function setTeacherSuitabilityForAllCourses(
    _teacherId,
    _agentId,
    _courseIds,  // 多门课程的 ID 数组
    _suitabilities  // 每门课程的适合度评分数组
) {
    // 验证课程和评分数组的长度
    if (_courseIds.length !== _suitabilities.length) {
        console.log("课程和适合度评分数组长度不匹配");
        return;
    }

    // 存储每个教师的评分
    for (let i = 0; i < _courseIds.length; i++) {
        let suitability = _suitabilities[i];

        // 确保适合度评分在0到100之间
        if (suitability < 0 || suitability > 100) {
            console.log("适合度评分无效");
            return;
        }

        // 将评分存储在 teacherScores 中
        if (!teacherScores[_teacherId]) {
            teacherScores[_teacherId] = {};
        }

        if (!teacherScores[_teacherId][_agentId]) {
            teacherScores[_teacherId][_agentId] = [];
        }

        teacherScores[_teacherId][_agentId].push(suitability);
    }
}

// 函数：计算五个老师对智能体所有课程的平均适合度评分并保存
async function saveAverageSuitability(_agentId, _courseIds) {
    const numTeachers = 5;  // 假设五个老师为智能体评分
    const averageSuitabilities = [];

    // 计算每门课程的平均适合度评分
    for (let j = 0; j < _courseIds.length; j++) {
        let totalSuitability = 0;

        for (let teacherId = 1; teacherId <= numTeachers; teacherId++) {
            let scores = teacherScores[teacherId][_agentId];
            if (scores && scores[j] !== undefined) {
                totalSuitability += scores[j];  // 累加每个老师对课程的评分
            }
        }

        // 计算平均适合度评分
        const averageSuitability = totalSuitability / numTeachers;
        const flooredSuitability = Math.floor(averageSuitability);
        averageSuitabilities.push(flooredSuitability);
    }

    // 使用 setAllAgentCourseSuitability 函数保存适合度评分
    console.table(averageSuitabilities);
    const tx = await contract.setAllAgentCourseSuitability(_agentId, averageSuitabilities);
    await tx.wait();
    console.log(`已保存智能体 ${_agentId} 的所有课程的平均适合度评分`);
}

let Scores = {};
async function setImportanceForAllCourses(
    _teacherId,
    _courseIds,  // 多门课程的 ID 数组
    _importances  // 每门课程的适合度评分数组
) {
    // 验证课程和评分数组的长度
    if (_courseIds.length !== _importances.length) {
        console.log("课程ID数组和重要程度数组长度不匹配");
        return;
    }

    // 存储每个教师的评分
    for (let i = 0; i < _courseIds.length; i++) {
        let score = _importances[i];

        // 确保适合度评分在0到100之间
        if (score < 0 || score > 100) {
            console.log("适合度评分无效");
            return;
        }

        // 将评分存储在 teacherScores 中
        if (!Scores[_teacherId]) {
            Scores[_teacherId] = [];
        }

        Scores[_teacherId].push(score);
    }
}

async function saveAverageImportance(_courseIds) {
    const numTeachers = 5;  // 假设五个老师为智能体评分
    const averageimportances = [];

    // 计算每门课程的平均评分
    for (let j = 0; j < _courseIds.length; j++) {
        let totalimportance = 0;

        for (let teacherId = 1; teacherId <= numTeachers; teacherId++) {
            let scores = Scores[teacherId];
            if (scores && scores[j] !== undefined) {
                totalimportance += scores[j];  // 累加每个老师对课程的评分
            }
        }

        // 计算评分
        const averageimportance = totalimportance / numTeachers;
        const flooredimportance = Math.floor(averageimportance);
        averageimportances.push(flooredimportance);
    }

    // 使用 setAllAgentCourseSuitability 函数保存评分
    console.table(averageimportances);
    const tx = await contract.setAllCourseImportance(averageimportances);
    await tx.wait();
    console.log(`已保存所有课程重要程度评分`);
}

// End proposal
async function executeProposal() {
    const answer = await inquirer.prompt([{
        type: "input",
        name: "proposalId",
        message: "请输入要结束的提案 ID:",
        validate: val => !isNaN(parseInt(val)),
        filter: Number
    }]);
    await teacherVoteContract.setCourseAllocation(contractAddress);
    const tx = await teacherVoteContract.executeProposal(answer.proposalId, GAS_CONFIG);
    await tx.wait();

    console.log(`提案 ${answer.proposalId} 已成功结束`);

    // 展示提案投票统计信息
    try {
        const [agree, disagree, total] = await teacherVoteContract.getVoteDetails(answer.proposalId);
        const choice = await contract.ScoreTypeChioce();
        console.log("提案投票结果:");
        console.log(`选择Cost-effectiveness的人数: ${agree.toString()}`);
        console.log(`选择Suitability&Preference的人数: ${disagree.toString()}`);
        console.log(`参与投票人数: ${total.toString()}`);

        console.log(`最终选择按照：${choice}的规则`);
    } catch (err) {
        console.error("提案信息读取失败:", err.message);
    }
}

async function executeProposal_auto(proposalId) {
    await teacherVoteContract.setCourseAllocation(contractAddress);
    const tx = await teacherVoteContract.executeProposal(proposalId, GAS_CONFIG);
    await tx.wait();

    console.log(`提案 ${proposalId} 已成功结束`);

    // 展示提案投票统计信息
    try {
        const [agree, disagree, total] = await teacherVoteContract.getVoteDetails(proposalId);
        const choice = await contract.ScoreTypeChioce();
        console.log("提案投票结果:");
        console.log(`选择Cost-effectiveness的人数: ${agree.toString()}`);
        console.log(`选择Suitability&Preference的人数: ${disagree.toString()}`);
        console.log(`参与投票人数: ${total.toString()}`);

        console.log(`最终选择按照：${choice}的规则`);
    } catch (err) {
        console.error("提案信息读取失败:", err.message);
    }
}


module.exports = {
    createProposal,
    init_teacherVote,
    init_teacherVote_auto,
    executeProposal,
    executeProposal_auto,
    switchCurrentSigner_test1,
    setTeacherSuitabilityForAllCourses,
    saveAverageSuitability,
    setImportanceForAllCourses,
    saveAverageImportance
};
