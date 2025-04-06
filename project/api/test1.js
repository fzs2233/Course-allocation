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

    console.log(`✅ 提案创建成功，proposalId = ${proposalId}`);
}

// Teacher voting
async function init_teacherVote() {
    const answer = await inquirer.prompt([
        { type: "input", name: "proposalId", message: "请输入提案 ID:", validate: val => !isNaN(parseInt(val)), filter: Number },
        { type: "input", name: "importance", message: "请输入课程重要程度（1~10）:", validate: val => (val >= 1 && val <= 10) || "请输入1~10的数字", filter: Number },
        { type: "list", name: "isSuitable", message: "该课程是否适合智能体:", choices: [{ name: "适合", value: 1 }, { name: "不适合", value: 0 }] }
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

    console.log(`✅ 教师投票成功：提案ID ${answer.proposalId}`);
}

// End proposal
// 修改后的 executeProposal 方法
// 修改后的 executeProposal 方法
async function executeProposal() {
    const answer = await inquirer.prompt([{
        type: "input",
        name: "proposalId",
        message: "请输入要结束的提案 ID:",
        validate: val => !isNaN(parseInt(val)),
        filter: Number
    }]);

    const tx = await teacherVoteContract.executeProposal(answer.proposalId, GAS_CONFIG);
    await tx.wait();

    console.log(`✅ 提案 ${answer.proposalId} 已成功结束`);

    // 👉 展示提案投票统计信息
    try {
        const [agree, disagree, total] = await teacherVoteContract.getVoteDetails(answer.proposalId);
        console.log("📊 提案投票结果:");
        console.log(`👍 同意: ${agree.toString()}`);
        console.log(`👎 反对: ${disagree.toString()}`);
        console.log(`🧑‍🏫 参与评分人数: ${total.toString()}`);

        // 展示每个教师的评分（课程重要程度）
        console.log("📘 教师评分详情（课程重要程度）:");
        for (let teacherId = 1; teacherId <= 5; teacherId++) { // 假设最多5个教师
            const rating = await teacherVoteContract.getTeacherRating(answer.proposalId, teacherId);
            if (rating.toNumber() > 0) {
                console.log(`教师ID: ${teacherId} -> 评分: ${rating.toString()}`);
            }
        }
    } catch (err) {
        console.error("❌ 提案信息读取失败:", err.message);
    }
}

module.exports = {
    createProposal,
    init_teacherVote,
    executeProposal,
    switchCurrentSigner_test1
};