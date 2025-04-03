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

async function switchAcount(Index){
    currentSigner = provider.getSigner(Index);
    contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    teacherVoteContract = new ethers.Contract(teacherVoteAddress,teacherVoteABI,currentSigner);
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
  await registerTeacher("teacher_1", accounts[1]);
  await contract.setTeacherValue(1, 800);
  await contract.setTeacherSuitabilityWeight(1,1);
  // await contract.setAllTeacherCourseSuitability(1, [26,44,65,88,40,37,79,92,14,87]);
  // await contract.setAllTeacherCoursePreferences(1, [35,54,76,80,93,48,64,17,86,70]);

  await switchAcount(2);
  await registerTeacher("teacher_2", accounts[2]);
  await contract.setTeacherValue(2, 1000);
  await contract.setTeacherSuitabilityWeight(2,2);
  // await contract.setAllTeacherCourseSuitability(2, [51,32,53,34,85,26,37,48,55,43]);
  // await contract.setAllTeacherCoursePreferences(2, [35,74,17,95,57,23,88,46,64,60]);

  await switchAcount(3);
  await registerTeacher("teacher_3", accounts[3]);
  await contract.setTeacherSuitabilityWeight(3,3);
  await contract.setTeacherValue(3, 1500);
  // await contract.setAllTeacherCourseSuitability(3, [32,31,54,43,68,27,44,72,58,30]);
  // await contract.setAllTeacherCoursePreferences(3, [51,32,83,14,95,76,27,70,45,67]);

  await switchAcount(4);
  await registerTeacher("teacher_4", accounts[4]);
  await contract.setTeacherValue(4, 1200);
  await contract.setTeacherSuitabilityWeight(4,4);
  // await contract.setAllTeacherCourseSuitability(4, [43,24,35,36,67,18,39,80,61,33]);
  // await contract.setAllTeacherCoursePreferences(4, [22,63,44,85,66,87,38,79,57,60]);

  await switchAcount(5);
  await registerTeacher("teacher_5", accounts[5]);
  await contract.setTeacherSuitabilityWeight(5,5);
  await contract.setTeacherValue(5, 1100);
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

// 测试 TeacherVote 全流程
async function testTeacherVote() {
  try {
    console.log("\n=== 开始 TeacherVote 测试 ===");
    const accounts = await web3.eth.getAccounts();

    // 测试1：创建评分提案
    console.log("测试1：创建评分提案...");
    await switchAcount(1);
    const tx = await teacherVoteContract.createRatingProposal(1);
    const receipt = await tx.wait();
    
    // 解析创建的提案ID
    const ratingProposalId = receipt.events.find(e => e.event === "NewRatingProposal").args.proposalId;
    console.log(`创建评分提案成功 ID: ${ratingProposalId}`);

    // 获取关联的投票提案ID
    const suitProposalId = (await teacherVoteContract.proposals(ratingProposalId)).suitabilityProposalId;
    console.log(`关联的投票提案ID: ${suitProposalId}`);

    // 测试2的投票部分
    console.log("\n测试2：进行适用性投票...");
    const votes = [
      { teacher: 1, option: 2 },
      { teacher: 2, option: 2 },
      { teacher: 3, option: 1 },
      { teacher: 4, option: 2 },
      { teacher: 5, option: 1 }
    ];

    for (const vote of votes) {
      try {
        // 1. 切换账户
        await switchAcount(vote.teacher);
        const currentAddress = await currentSigner.getAddress();
        
        // 2. 验证教师身份
        const teacherId = await contract.addressToTeacherId(currentAddress);
        if (teacherId.eq(0)) {
          throw new Error(`账户 ${currentAddress} 不是注册教师`);
        }

        // 3. 检查提案状态
        const proposal = await teacherVoteContract.proposals(ratingProposalId);
        if (proposal.isExecuted) {
          throw new Error("提案已执行，无法投票");
        }

        // 4. 执行投票（带 gas limit）
        const tx = await teacherVoteContract.voteForSuitability(
          suitProposalId,
          vote.option,
          { 
            gasLimit: 1000000, // 手动设置 gas limit
            gasPrice: 0
          }
        );
        
        // 5. 等待交易确认
        const receipt = await tx.wait();
        console.log(`教师${vote.teacher} 投票成功，交易哈希: ${receipt.transactionHash}`);

      } catch (error) {
        console.error(`教师${vote.teacher} 投票失败:`, {
          errorCode: error.code,
          reason: error.reason || error.message,
          rawData: error.data
        });
        
        // 6. 解析合约错误
        if (error.data) {
          const decodedError = teacherVoteContract.interface.parseError(error.data);
          console.error("合约错误详情:", decodedError.name);
        }
      }
    }

    // 测试3：提交课程评分
    console.log("\n测试3：提交课程评分...");
    const ratings = [8, 7, 9, 6, 8]; // 五位教师的评分
    for (let i = 0; i < 5; i++) {
      await switchAcount(i + 1);
      await teacherVoteContract.submitRating(ratingProposalId, ratings[i]);
      console.log(`教师${i+1} 提交评分: ${ratings[i]}`);
    }

    // 测试4：执行提案
    console.log("\n测试4：执行提案...");
    await switchAcount(1);
    const executeTx = await teacherVoteContract.executeProposal(ratingProposalId);
    await executeTx.wait();
    console.log("提案执行成功");

    // 验证结果
    console.log("\n验证结果:");
    const course = await contract.courses(1);
    const avgImportance = ratings.reduce((a, b) => a + b) / ratings.length;
    
    console.log("理论平均重要性:", avgImportance);
    console.log("实际存储重要性:", course.importance.toString());
    console.log("智能体适用性:", course.isAgentSuitable ? "通过" : "拒绝");

    // 验证投票结果
    const [voteResult] = await voteContract.endVoteChooseTeacher(suitProposalId);
    console.log("投票结果:", voteResult === 2 ? "赞成占优" : "反对占优");

    console.log("\n=== 测试完成 ===");

  } catch (error) {
    console.error("测试失败:", error.reason || error.message);
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