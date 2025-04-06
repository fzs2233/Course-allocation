const { ethers } = require("ethers");
const fs = require("fs");
require('dotenv').config({ path: './interact/.env' });
const Web3 = require("web3");
//const { initializeData } = require("./courseAllocation");
const web3 = new Web3("http://127.0.0.1:7545");

// 读取 JSON 文件
const contractData = JSON.parse(fs.readFileSync("./build/contracts/CourseAllocation.json", "utf8"));
const voteData = JSON.parse(fs.readFileSync("./build/contracts/Vote.json", "utf8"));
const classData = JSON.parse(fs.readFileSync("./build/contracts/IStudentVote.json", "utf8"));
const teacherVoteData = JSON.parse(fs.readFileSync("./build/contracts/TeacherVote.json", "utf8"));


// 提取合约地址和 ABI
const contractAddress = process.env.contractAddress;
const voteAddress = process.env.VotingContractAddress;
const classContractAddress = process.env.classAddress;
const teacherVoteAddress = process.env.teachervoteAddress;

const contractABI = contractData.abi;
const voteABI = voteData.abi;
const classABI = classData.abi;
const teacherVoteABI = teacherVoteData.abi;

// 设置提供者（使用 Infura 或本地节点）
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

const GAS_CONFIG = {
  gasLimit: 6700000, // 提升至500万
  gasPrice: Web3.utils.toWei('20', 'gwei') // 明确gas价格
};

// 当前登录的账户
let currentSigner = provider.getSigner(0);
// 创建合约实例
let contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
let voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
let classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
let teacherVoteContract = new ethers.Contract(
    teacherVoteAddress,
    teacherVoteABI,
    currentSigner
  );

  async function switchAcount(Index) {
    currentSigner = provider.getSigner(Index);
    
    // 重新初始化所有合约实例
    contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    teacherVoteContract = new ethers.Contract(
        teacherVoteAddress,
        teacherVoteABI,
        currentSigner
    );
}


// 创建课程
async function initializeCourse(name) {
    let courseCount = await contract.courseCount();
    courseCount = courseCount.toNumber();
    courseCount = courseCount + 1;
    // console.log(courseCount);
    await contract.setCourseCount(courseCount);
    await contract.setCourseId(courseCount);
    await contract.setCourseName(courseCount, name);

    return {
        code: 0,
        message: "Course initialized successfully",
        courseId: courseCount
    };
}


// 创建教师
async function registerTeacher(name, addr) {
    let isregister = await contract.addressToTeacherId(addr);
    isregister = isregister.toNumber();
    if(isregister!=0){
        console.log("该教师已经注册")
        return {
            code: -1,
            message: "Teacher Already Registered",
        };
    }
    let teacherCount = await contract.teacherCount();
    teacherCount = teacherCount.toNumber();
    teacherCount = teacherCount + 1;
    // console.log(teacherCount);
    await contract.setTeacherCount(teacherCount);
    await contract.setTeacherId(addr, teacherCount);
    await contract.setTeacherName(teacherCount, name);
    await contract.setTeacherAddress(teacherCount, addr);
    await voteContract.registerVoter(addr);
    return {
        code: 0,
        message: "Teacher Registered successfully",
        courseId: teacherCount
    };
}

async function initializeData() {
  const accounts = await web3.eth.getAccounts();
  // 初始化课程
  console.log("Initializing courses...");
  await initializeCourse("c1");
  await initializeCourse("c2");
  await initializeCourse("c3");
  await initializeCourse("c4");
  await initializeCourse("c5");
  await initializeCourse("c6");
  await initializeCourse("c7");
  await initializeCourse("c8");
  await initializeCourse("c9");
  await initializeCourse("c10");
  // 注册教师
  console.log("Registering teachers...");
  await switchAcount(1);
  await registerTeacher("teacher_1", accounts[1]);;
  await contract.setTeacherSuitabilityWeight(1,1);
  await teacherVoteContract.registerVoter(accounts[1]);

  await switchAcount(2);
  await registerTeacher("teacher_2", accounts[2]);
  await contract.setTeacherSuitabilityWeight(2,2);
  await teacherVoteContract.registerVoter(accounts[2]);

  await switchAcount(3);
  await registerTeacher("teacher_3", accounts[3]);
  await contract.setTeacherSuitabilityWeight(3,3);
  await teacherVoteContract.registerVoter(accounts[3]);

  await switchAcount(4);
  await registerTeacher("teacher_4", accounts[4]);
  await contract.setTeacherSuitabilityWeight(4,4);
  await teacherVoteContract.registerVoter(accounts[4]);

  await switchAcount(5);
  await registerTeacher("teacher_5", accounts[5]);
  await contract.setTeacherSuitabilityWeight(5,5);
  await teacherVoteContract.registerVoter(accounts[5]);

}
const inquirer = require("inquirer");

async function testTeacherVote() {
  try {
    console.log("\n=== 🌟 启动 TeacherVote 测试（使用 inquirer 交互）===\n");

    const accounts = await web3.eth.getAccounts();

    // 创建合并提案（由教师1执行）
    await switchAcount(1);
    await teacherVoteContract.setCourseAllocation(contractAddress);
    console.log("📌 创建课程提案中...");
    const txCreate = await teacherVoteContract.createCombinedProposal(1, GAS_CONFIG);
    const receiptCreate = await txCreate.wait();
    const eventCreate = receiptCreate.events.find(e => e.event === "NewCombinedProposal");
    const proposalId = eventCreate.args.proposalId;
    console.log(`✅ 提案创建成功，proposalId = ${proposalId}\n`);

    const voteData = [];

    for (let i = 1; i <= 5; i++) {
      await switchAcount(i);
      const address = await currentSigner.getAddress();
      const teacherId = (await contract.addressToTeacherId(address)).toNumber();

      console.log(`👤 教师 ${teacherId} 请填写评分与投票选项：`);

      const answers = await inquirer.prompt([
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
          message: "请选择投票选项:",
          choices: [
            { name: "反对", value: 0 },
            { name: "赞成", value: 1 }
          ],
        }
      ]);

      voteData.push({
        teacherIndex: i,
        teacherId,
        rating: answers.rating,
        voteOption: answers.voteOption
      });

      console.log("✅ 数据已保存。\n");
    }

    // 开始提交投票与评分
    console.log("📩 提交所有教师的评分与投票...\n");
    for (let v of voteData) {
      try {
        await switchAcount(v.teacherIndex);

        await teacherVoteContract.callStatic.submitCombinedVote(
          proposalId,
          v.rating,
          v.voteOption,
          GAS_CONFIG
        );

        const txVote = await teacherVoteContract.submitCombinedVote(
          proposalId,
          v.rating,
          v.voteOption,
          GAS_CONFIG
        );
        await txVote.wait();

        console.log(`✅ 教师 ${v.teacherId} 提交成功`);
      } catch (error) {
        const reason = error.reason || (error.error && error.error.message) || error.message;
        console.error(`❌ 教师 ${v.teacherId} 提交失败:`, reason);
      }
    }

    // 执行提案
    console.log("\n⚙️ 执行提案...");
    await switchAcount(1);
    const txExec = await teacherVoteContract.executeProposal(proposalId, GAS_CONFIG);
    await txExec.wait();
    console.log(`✅ 提案 ${proposalId} 执行成功！`);

    // 验证执行结果
    console.log("\n📊 提案执行结果：");
    const courseInfo = await contract.courses(1);
    const [numAgree, numDisagree, totalVoters] = await teacherVoteContract.getVoteDetails(proposalId);
    const ratings = voteData.map(v => v.rating);
    const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

    console.log("· 理论平均评分：", avgRating.toFixed(2));
    console.log("· 合约中记录的重要性：", courseInfo.importance.toString());
    console.log(`· 投票结果：赞成 = ${numAgree}，反对 = ${numDisagree}，投票人数 = ${totalVoters}`);
    console.log("· 是否通过：", courseInfo.isAgentSuitable ? "✅ 通过" : "❌ 未通过");

    console.log("\n🎉 TeacherVote 测试完成！");

  } catch (error) {
    console.error("❌ 测试发生错误:", error.reason || error.message);
    if (error.data) console.error("错误详情:", error.data);
  }
}



async function main() {
  await initializeData();
  await testTeacherVote();
}

main();