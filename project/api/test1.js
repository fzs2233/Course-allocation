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

// Create a proposal
async function createProposal() {
    const answer = await inquirer.prompt([{
        type: "input",
        name: "courseId",
        message: "请输入课程 ID:",
        validate: val => !isNaN(parseInt(val)) || "请输入有效的数字",
        filter: Number
    }]);

    await teacherVoteContract.setCourseAllocation(contractAddress);
    const tx = await teacherVoteContract.createCombinedProposal(answer.courseId,GAS_CONFIG);
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === "NewCombinedProposal");
    const proposalId = event.args.proposalId;

    console.log(`提案创建成功，proposalId = ${proposalId}`);
}

// Teacher voting
async function init_teacherVote() {
    const answer = await inquirer.prompt([
        { type: "input", name: "proposalId", message: "请输入提案 ID:", validate: val => !isNaN(parseInt(val)), filter: Number },
        { type: "input", name: "importance", message: "请输入课程重要程度（1~10）:", validate: val => (val >= 1 && val <= 10) || "请输入1~10的数字", filter: Number },
        { type: "list", name: "isSuitable", message: "请选择倾向的规则:", choices: [{ name: "Cost-effectiveness", value: 1 }, { name: "Suitability&Preference", value: 0 }] }
    ]);
    const addr = await currentSigner.getAddress();
    const teacherId = await contract.addressToTeacherId(addr);
    console.log("当前账户地址:", addr);
    console.log("对应教师ID:", teacherId.toString());

    const tx = await teacherVoteContract.submitCombinedVote(
        answer.proposalId,
        answer.importance,
        answer.isSuitable,
        GAS_CONFIG
    );
    await tx.wait();

    console.log(`教师投票成功：提案ID ${answer.proposalId}`);
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
    const numTeachers = 2;  // 假设五个老师为智能体评分
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

// End proposal
// 修改后的 executeProposal 方法
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

    // 👉 展示提案投票统计信息
    try {
        const [agree, disagree, total ,courseId] = await teacherVoteContract.getVoteDetails(answer.proposalId);
        const importance = await contract.getCourseImportance(courseId);
        const choice = await contract.ScoreTypeChioce();
        console.log("提案投票结果:");
        console.log(`选择Cost-effectiveness的人数: ${agree.toString()}`);
        console.log(`选择Suitability&Preference的人数: ${disagree.toString()}`);
        console.log(`参与评分人数: ${total.toString()}`);


        console.log(`课程ID: ${courseId.toString()}，重要程度：${importance.toString()}`);
        console.log(`最终选择按照：${choice}的规则`);
        // 展示每个教师的评分（课程重要程度）
        console.log(" 教师评分详情（课程重要程度）:");
        for (let teacherId = 1; teacherId <= 5; teacherId++) { // 假设最多5个教师
            const rating = await teacherVoteContract.getTeacherRating(answer.proposalId, teacherId);
            if (rating.toNumber() > 0) {
                console.log(`教师ID: ${teacherId} -> 评分: ${rating.toString()}`);
            }
        }
    } catch (err) {
        console.error("提案信息读取失败:", err.message);
    }
}

module.exports = {
    createProposal,
    init_teacherVote,
    executeProposal,
    switchCurrentSigner_test1,
    setTeacherSuitabilityForAllCourses,
    saveAverageSuitability
};
