const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config({ path: "./interact/.env" });
const Web3 = require("web3");
const inquirer = require("inquirer");
const web3 = new Web3("http://127.0.0.1:7545");

// 加载 ABI 和地址
const contractData = JSON.parse(fs.readFileSync("./build/contracts/CourseAllocation.json", "utf8"));
const voteData = JSON.parse(fs.readFileSync("./build/contracts/Vote.json", "utf8"));
const classData = JSON.parse(fs.readFileSync("./build/contracts/IStudentVote.json", "utf8"));
const teacherVoteData = JSON.parse(fs.readFileSync("./build/contracts/TeacherVote.json", "utf8"));

const contractAddress = process.env.contractAddress;
const voteAddress = process.env.VotingContractAddress;
const classContractAddress = process.env.classAddress;
const teacherVoteAddress = process.env.teachervoteAddress;

const contractABI = contractData.abi;
const voteABI = voteData.abi;
const classABI = classData.abi;
const teacherVoteABI = teacherVoteData.abi;

// 设置 provider
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

const GAS_CONFIG = {
  gasLimit: 6700000,
  gasPrice: Web3.utils.toWei("20", "gwei"),
};

let currentSigner = provider.getSigner(0);
let contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
let voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
let classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
let teacherVoteContract = new ethers.Contract(teacherVoteAddress, teacherVoteABI, currentSigner);

async function switchAcount(Index) {
  currentSigner = provider.getSigner(Index);
  contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
  voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
  classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
  teacherVoteContract = new ethers.Contract(teacherVoteAddress, teacherVoteABI, currentSigner);
}

async function initializeCourse(name) {
  let courseCount = (await contract.courseCount()).toNumber();
  courseCount += 1;
  await contract.setCourseCount(courseCount);
  await contract.setCourseId(courseCount);
  await contract.setCourseName(courseCount, name);
  return {
    code: 0,
    message: "Course initialized",
    courseId: courseCount,
  };
}

async function registerTeacher(name, addr) {
  let isregister = (await contract.addressToTeacherId(addr)).toNumber();
  if (isregister !== 0) {
    console.log("该教师已经注册");
    return { code: -1, message: "已注册" };
  }
  let teacherCount = (await contract.teacherCount()).toNumber() + 1;
  await contract.setTeacherCount(teacherCount);
  await contract.setTeacherId(addr, teacherCount);
  await contract.setTeacherName(teacherCount, name);
  await contract.setTeacherAddress(teacherCount, addr);
  await voteContract.registerVoter(addr);
  return {
    code: 0,
    message: "教师注册成功",
    teacherId: teacherCount,
  };
}

async function initializeData() {
  const accounts = await web3.eth.getAccounts();
  console.log("📚 初始化课程...");
  for (let i = 1; i <= 10; i++) {
    await initializeCourse("课程_" + i);
  }

  console.log("👨‍🏫 注册教师...");
  for (let i = 1; i <= 5; i++) {
    await switchAcount(i);
    await registerTeacher(`teacher_${i}`, accounts[i]);
    await contract.setTeacherSuitabilityWeight(i, i);
    await teacherVoteContract.registerVoter(accounts[i]);
  }
}

async function interactiveVotingFlow() {
  try {
    console.log("\n=== 🗳️ TeacherVote 交互式测试模式 ===\n");

    const accounts = await web3.eth.getAccounts();
    let proposalId = null;

    while (true) {
      const action = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "请选择操作：",
          choices: [
            { name: "1. 切换教师账户", value: "switch" },
            { name: "2. 创建新提案（当前教师）", value: "create" },
            { name: "3. 为提案投票", value: "vote" },
            { name: "4. 执行提案", value: "execute" },
            { name: "退出", value: "exit" },
          ],
        },
      ]);

      if (action.action === "exit") break;

      if (action.action === "switch") {
        const answer = await inquirer.prompt([
          {
            type: "input",
            name: "index",
            message: "请输入教师账户编号（1-5）：",
            validate: input => {
              const n = parseInt(input);
              return n >= 1 && n <= 5 ? true : "请输入1~5之间的编号";
            },
            filter: Number,
          },
        ]);
        await switchAcount(answer.index);
        const addr = await currentSigner.getAddress();
        const tid = await contract.addressToTeacherId(addr);
        console.log(`✅ 已切换到账户 ${answer.index}，教师ID = ${tid.toString()}`);
      }

      else if (action.action === "create") {
        const addr = await currentSigner.getAddress();
        const tid = await contract.addressToTeacherId(addr);
        if (tid.toNumber() === 0) {
          console.log("❌ 当前账户不是教师，不能创建提案");
          continue;
        }
      
        const courseCount = (await contract.courseCount()).toNumber();
      
        const { courseId } = await inquirer.prompt([
          {
            type: "input",
            name: "courseId",
            message: `请输入要为哪门课程创建提案（1-${courseCount}）：`,
            validate: val => {
              const n = parseInt(val);
              return n >= 1 && n <= courseCount ? true : `请输入 1~${courseCount} 范围内的课程ID`;
            },
            filter: Number
          }
        ]);
      
        const txCreate = await teacherVoteContract.createCombinedProposal(courseId, GAS_CONFIG);
        const receiptCreate = await txCreate.wait();
        const eventCreate = receiptCreate.events.find(e => e.event === "NewCombinedProposal");
        proposalId = eventCreate.args.proposalId;
        console.log(`✅ 提案已为课程 ${courseId} 创建成功，proposalId = ${proposalId.toString()}`);
      }
      

      else if (action.action === "vote") {
        if (!proposalId) {
          console.log("⚠️ 请先创建一个提案！");
          continue;
        }

        const addr = await currentSigner.getAddress();
        const tid = await contract.addressToTeacherId(addr);
        if (tid.toNumber() === 0) {
          console.log("❌ 当前账户不是教师，不能投票");
          continue;
        }

        const input = await inquirer.prompt([
          {
            type: "input",
            name: "rating",
            message: "请输入评分（1~10）:",
            validate: val => {
              const n = parseInt(val);
              return n >= 1 && n <= 10 ? true : "请输入 1 ~ 10 之间的数字";
            },
            filter: Number,
          },
          {
            type: "list",
            name: "voteOption",
            message: "请选择投票：",
            choices: [
              { name: "反对", value: 0 },
              { name: "赞成", value: 1 },
            ],
          },
        ]);

        try {
          await teacherVoteContract.callStatic.submitCombinedVote(
            proposalId,
            input.rating,
            input.voteOption,
            GAS_CONFIG
          );

          const txVote = await teacherVoteContract.submitCombinedVote(
            proposalId,
            input.rating,
            input.voteOption,
            GAS_CONFIG
          );
          await txVote.wait();
          console.log("✅ 投票成功");
        } catch (err) {
          console.log("❌ 投票失败：", err.reason || err.message);
        }
      }

      else if (action.action === "execute") {
        if (!proposalId) {
          console.log("⚠️ 当前无提案可执行");
          continue;
        }

        const txExec = await teacherVoteContract.executeProposal(proposalId, GAS_CONFIG);
        await txExec.wait();
        const courseInfo = await contract.courses(1);
        const [agree, disagree, total] = await teacherVoteContract.getVoteDetails(proposalId);
        console.log("\n📊 执行完成，结果如下：");
        console.log(`· 赞成：${agree}, 反对：${disagree}, 总票数：${total}`);
        console.log(`· 评分结果：${courseInfo.importance.toString()}`);
        console.log(`· 是否通过：${courseInfo.isAgentSuitable ? "✅ 是" : "❌ 否"}`);
      }
    }

    console.log("\n👋 测试结束，感谢使用！");
  } catch (error) {
    console.error("❌ 测试发生错误:", error.reason || error.message);
  }
}

async function main() {
  await initializeData();
  await interactiveVotingFlow();
}

main();
