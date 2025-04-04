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
  // await contract.setAllTeacherCourseSuitability(1, [26,44,65,88,40,37,79,92,14,87]);
  // await contract.setAllTeacherCoursePreferences(1, [35,54,76,80,93,48,64,17,86,70]);

  await switchAcount(2);
  await registerTeacher("teacher_2", accounts[2]);
  await contract.setTeacherSuitabilityWeight(2,2);
  await teacherVoteContract.registerVoter(accounts[2]);
  // await contract.setAllTeacherCourseSuitability(2, [51,32,53,34,85,26,37,48,55,43]);
  // await contract.setAllTeacherCoursePreferences(2, [35,74,17,95,57,23,88,46,64,60]);

  await switchAcount(3);
  await registerTeacher("teacher_3", accounts[3]);
  await contract.setTeacherSuitabilityWeight(3,3);
  await teacherVoteContract.registerVoter(accounts[3]);

  // await contract.setAllTeacherCourseSuitability(3, [32,31,54,43,68,27,44,72,58,30]);
  // await contract.setAllTeacherCoursePreferences(3, [51,32,83,14,95,76,27,70,45,67]);

  await switchAcount(4);
  await registerTeacher("teacher_4", accounts[4]);
  await contract.setTeacherSuitabilityWeight(4,4);
  await teacherVoteContract.registerVoter(accounts[4]);
  // await contract.setAllTeacherCourseSuitability(4, [43,24,35,36,67,18,39,80,61,33]);
  // await contract.setAllTeacherCoursePreferences(4, [22,63,44,85,66,87,38,79,57,60]);

  await switchAcount(5);
  await registerTeacher("teacher_5", accounts[5]);
  await contract.setTeacherSuitabilityWeight(5,5);
  await teacherVoteContract.registerVoter(accounts[5]);
  // await contract.setAllTeacherCourseSuitability(5, [22,43,44,35,36,37,31,32,33,34]);
  // await contract.setAllTeacherCoursePreferences(5, [43,14,75,35,56,67,28,59,59,79]);

  // // 注册智能体
  // console.log("Registering agents...");
  // await switchAcount(6);
  // await registerAgent("Agent_1", accounts[6]);
  // await contract.setAllAgentCourseSuitability(1, [85,94,68,27,48,34,37,42,46,14]);
  // await contract.setAgentValue(1,1000);

  // await switchAcount(7);
  // await registerAgent("Agent_2", accounts[7]);
  // await contract.setAllAgentCourseSuitability(2, [43,86,90,47,24,36,32,45,16,34]);
  // await contract.setAgentValue(2,1200);

  // // 注册班级
  // console.log("Registering classes...");
  // await switchAcount(8);
  // await registerClass("Class_1", accounts[8]);
  // for (let i = 1; i <= 25; i++) {
  //     const studentName = `Student_${i}`; // 学生姓名
  //     await classContract.addStudentToClass(studentName);
  // }
  // console.log("班级1学生注册完毕");


  // await switchAcount(9);
  // await registerClass("Class_2", accounts[9]);
  // for (let i = 26; i <= 50; i++) {
  //     const studentName = `Student_${i}`; // 学生姓名
  //     await classContract.addStudentToClass(studentName);
  // }
  // console.log("班级2学生注册完毕");

}

async function testTeacherVote() {
  try {
    console.log("\n=== 开始新版 TeacherVote 测试 ===");

    // 1. 获取账户信息（这里以 Ganache / 本地节点为例）
    const accounts = await web3.eth.getAccounts();
    // 切换到教师1（在你的合约中，已注册为教师）
    await switchAcount(1);
    await teacherVoteContract.setCourseAllocation(contractAddress);
    // 2. 创建新的合并提案（示例：courseId = 1）
    console.log("测试1：创建合并提案...");
    const txCreate = await teacherVoteContract.createCombinedProposal(1, GAS_CONFIG);
    const receiptCreate = await txCreate.wait();

    // 从事件中解析出 proposalId
    const eventCreate = receiptCreate.events.find(e => e.event === "NewCombinedProposal");
    const proposalId = eventCreate.args.proposalId;
    console.log(`创建合并提案成功，proposalId = ${proposalId}`);

    // 3. 教师依次对该提案进行评分 + 投票
    console.log("\n测试2：教师提交合并操作（评分 + 投票）...");
    // 假设有 5 名教师，分别准备了他们的评分和投票意向
    const voteData = [
      { teacherIndex: 1, teacherId: 1, rating: 8, voteOption: 1 }, // 1 表示赞成
      { teacherIndex: 2, teacherId: 2, rating: 7, voteOption: 0 }, // 0 表示反对
      { teacherIndex: 3, teacherId: 3, rating: 9, voteOption: 1 },
      { teacherIndex: 4, teacherId: 4, rating: 6, voteOption: 1 },
      { teacherIndex: 5, teacherId: 5, rating: 8, voteOption: 0 },
    ];

    // 修改 testTeacherVote 函数中投票提交部分代码
for (let v of voteData) {
  try {
    await switchAcount(v.teacherIndex);
    const currentAddress = await currentSigner.getAddress();
    const teacherIdCheck = await contract.addressToTeacherId(currentAddress);
    console.log(`教师${v.teacherIndex} 的地址 ${currentAddress} 在主合约中查到 teacherId = ${teacherIdCheck.toString()}`);

    if (teacherIdCheck.toNumber() !== v.teacherId) {
      throw new Error(`教师ID校验失败！期望${v.teacherId}，实际${teacherIdCheck.toNumber()}`);
    }

    console.log(`教师ID=${v.teacherId} 正在为提案 ${proposalId} 提交评分=${v.rating}，投票选项=${v.voteOption}`);

    try {
      await teacherVoteContract.callStatic.submitCombinedVote(
        proposalId,
        v.rating,
        v.voteOption,
        GAS_CONFIG
      );
    } catch (callErr) {
      const reason = callErr.reason || (callErr.error && callErr.error.message) || callErr.message;
      console.error(`❌ 教师${v.teacherIndex} 模拟调用失败！revert 原因:`, reason);
      continue;  // 继续执行下一个投票
    }

    const txVote = await teacherVoteContract.submitCombinedVote(
      proposalId,
      v.rating,
      v.voteOption,
      GAS_CONFIG
    );
    await txVote.wait();
    console.log(`✅ 教师${v.teacherIndex} 提交成功！`);

  } catch (error) {
    const reason = error.reason || (error.error && error.error.message) || error.message;
    console.error(`❌ 教师${v.teacherIndex} 提交失败:`, reason);

    if (error.data) {
      try {
        const decodedError = teacherVoteContract.interface.parseError(error.data);
        console.error("🔍 合约错误详情:", decodedError.name, decodedError.args);
      } catch (decodeErr) {
        console.error("⚠️ 无法解码合约错误信息:", decodeErr.message);
      }
    }
  }
}


    // 4. 执行提案
    console.log("\n测试3：执行提案...");
    // 切换回教师1（或拥有执行权限的账户）
    await switchAcount(1);
    const txExec = await teacherVoteContract.executeProposal(proposalId, GAS_CONFIG);
    await txExec.wait();
    console.log(`提案 ${proposalId} 执行成功！`);

    // 5. 验证执行结果
    console.log("\n测试4：验证执行结果...");
    const courseInfo = await contract.courses(1);
    const [numAgree, numDisagree, totalVoters] = await teacherVoteContract.getVoteDetails(proposalId);

    // 计算理论平均评分
    const ratings = voteData.map(v => v.rating);
    const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

    console.log("· 理论平均重要性（ratings 平均值）：", averageRating);
    console.log("· 合约中存储的课程重要性（importance）：", courseInfo.importance.toString());
    console.log("· 投票统计：", `赞成票=${numAgree}, 反对票=${numDisagree}, 总投票人数=${totalVoters}`);
    console.log("· 是否通过智能体适用性（isAgentSuitable）：", courseInfo.isAgentSuitable ? "通过" : "未通过");

    // 也可以在这里加入更多断言逻辑，比如判断 importance 是否接近平均值、赞成票是否大于反对票等等
    // if (numAgree <= numDisagree) {
    //   throw new Error("测试失败：赞成票应当大于反对票");
    // }

    console.log("\n=== TeacherVote 测试完毕 ===");

  } catch (error) {
    console.error("testTeacherVote() 测试出现异常:", error.reason || error.message);
    if (error.data) {
      console.error("错误详情:", error.data);
    }
  }
}


async function main() {
  await initializeData();
  await testTeacherVote();
}

main();