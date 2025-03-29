const { ethers } = require("ethers");
const fs = require("fs");
require('dotenv').config({ path: './interact/.env' });
const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:7545");

// 读取 JSON 文件
const contractData = JSON.parse(fs.readFileSync("./build/contracts/CourseAllocation.json", "utf8"));
const classData = JSON.parse(fs.readFileSync("./build/contracts/IStudentVote.json", "utf8"));

// 提取合约地址和 ABI
const contractAddress = process.env.contractAddress;
const classContractAddress = process.env.classAddress;
const contractABI = contractData.abi;
const classABI = classData.abi;

// 设置提供者（使用 Infura 或本地节点）
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

// 当前登录的账户
let currentSigner = provider.getSigner(0);
let currentName = "admin";
// 创建合约实例
let contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
let classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);

let accountIndex = 0;
// readline 模块用于命令行交互
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setVoteAndClassVote() {
    await contract.setVotingContractAddress(process.env.VotingContractAddress);
    await contract.setclassVotingContract(process.env.classAddress);
}
setVoteAndClassVote();

console.log('欢迎使用智能合约交互工具！');
console.log('输入 "help" 查看可用命令，输入 "exit" 退出程序。');
console.log('----------------------------------------');

showPrompt();


function showPrompt() {
    readline.question(`[${currentName}] 请输入命令: `, (input) => {
      handleCommand(input);
    });
  }

  async function handleCommand(command) {
    const args = command.split(' ');
    const cmd = args[0].toLowerCase().trim();
  
    switch (cmd) {
      case 'help':
        showHelp();
        break;
      case 'switch':
        await handleSwitchAccount(args); // 等待异步操作完成
        break;
      case 'check_all_teacher_course':
        await checkTeacherCourse(); // 等待异步操作完成
        break;
      case 'check_all_course':
        await checkCourseStatus(); // 等待异步操作完成
        break;
      case 'get_course_importance':
        await getCourseImportance(); // 等待异步操作完成
        break;
      case 'addcourse':
        await handleAddCourse(args);
        break;
      case 'setimportance':
        await handleSetCourseImportance(args);
        break;
      case 'registeragent':
        await handleRegisterAgent(args);
        break;
      case 'get_agent_assigned_courses':
        await getAgentAssignedCourses(args);
        break;
      case 'updatesuitability':
        await handleUpdateSuitability(args);
        break;
      case 'update_suitability_for_agent':
        await UpdateSuitabilityAgent(args);
        break;
      case 'allocate_course_for_agent':
        await allocateAgentCourses();
        break;
      case 'registerteacher':
        await handleRegisterTeacher(args);
        break;
      case 'updatesuitabilities':
        await handleUpdateSuitability(args);
        break;
      case 'updatepreferences':
        await handleUpdatePreferences(args);
        break;
      case 'registerclass':
        await handleRegisterClass(args);
        break;
      case 'registerstudent':
        await handleRegisterStudent(args);
        break;
      case 'addstudent':
        await handleAddStudent(args);
        break;
      case 'addallstudent':
        await AddAllStudent(args);
        break;
      case 'allstudentvote':
        await AllStudentVote(args);
        break;
      case 'otherstudentvote':
        await OtherStudentVote(args);
        break;
      case 'other_student_vote_for_without_course':
        await OtherStudentVoteForWithoutCourse(args);
        break;
      case 'studentvote':
        await StudentVote(args);
        break;
      case 'all_student_vote_for_without_course_teacher':
        await AllStudentVoteForWithout(args);
        break;
      case 'other_student_vote_for_without_course_teacher':
        await OtherStudentVoteForWithout(args);
        break;
      case 'end_class_vote':
        await endClassVote(args);
        break;
      case 'end_class_vote_for_without_course':
        await endWithoutCourse(args);
        break;
      case 'createproposal':
        await handleCreateProposal();
        break;
      case 'vote':
        await handleVote(args);
        break;
      case 'endvote':
        await endVote(args);
        break;
      case 'end_vote_for_without_course':
        await endVoteForWithoutCourse(args);
        break;
      case 'getproposal':
        await getproposal(args);
        break;
      case 'machinevote':
        await machineVote();
        break;
      case 'auto_all_vote':
        await autoAllVote();
        break;
      case 'setweight':
        await setweight(args);
        break;
      case 'check_proposal_count':
        await checkVoteCount(args);
        break;
      case 'checkstudent':
        await checkStudent(args);
        break;
      case 'student_set_suitability':
        await setCourseScore(args);
        break;
      case 'other_student_set_suitability':
        await setOtherCourseScore();
        break;
      case 'check_student_suitability':
        await checkStudentSuitability(args);
        break;
      case 'check_student_average_suitability':
        await getAllCourseSuitability();
        break;
      case 'create_proposal_for_without_course_teacher':
        await createProposalForWithoutCourseTeacher();
        break;
      case 'auto_vote_for_teacher_without_course':
        await checkAndMachineVoteForTeacher();
        break;
      case 'update_suitability_by_student':
        await updateSuitabilityByStudent();
        break;
      case 'exit':
        console.log('感谢使用，再见！');
        readline.close();
        return; // 退出函数，不再执行后续代码
      default:
        console.log('未知命令，请输入 "help" 查看可用命令。');
    }
  
    showPrompt(); // 在异步操作完成后调用 showPrompt
  }

function showHelp() {
    console.log('可用命令:');
    console.log('  help                - 显示此帮助信息');
    console.log('  switch <account>   - 切换账户，例如: switch 1');
    console.log('  addcourse <id> <isElective> - 添加课程，例如: addcourse c1 true');
    console.log('  setimportance <importance> - 设置课程重要程度，例如: setimportance 3,7,1,9,5,2,8,4,6,10');
    console.log('  registeragent <name> - 注册智能体，例如: registeragent ai1');
    console.log('  updatesuitability <suitability> - 更新课程适合程度，例如: updatesuitability 8,9,10,2,5,7,3,6,4,1');
    console.log('  registerteacher <name> - 注册教师，例如: registerteacher teacher_1');
    console.log('  updatepreferences <preferences> - 更新课程偏好程度，例如: updatepreferences 3,5,7,2,9,4,6,1,8,10');
    console.log('  registerclass <name> - 注册班级，例如: registerclass class1');
    console.log('  addstudent <classId> <studentId> <studentName> - 添加学生，例如: addstudent 1 1 Student1');
    console.log('  createproposal      - 创建提案');
    console.log('  vote <proposalId> <teacherId> - 投票，例如: vote 1 3');
    console.log('  exit                - 退出程序');
    console.log('----------------------------------------');
}

async function handleSwitchAccount(args) {
    
    const accounts = await web3.eth.getAccounts();
    if (args.length < 2) {
        console.log('请提供账户索引，例如: switch 1');
        return;
    }
    accountIndex = parseInt(args[1]);
    if (isNaN(accountIndex) || accountIndex < 0) {
        console.log('无效的账户索引');
        return;
    }
    if (accountIndex == 0) {
        currentName = "admin";
        console.log(`已切换到账户 ${currentName}`);
        currentSigner = provider.getSigner(accountIndex);
        contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
        classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
        return;
    }
    // console.log(`已切换到账户 ${accounts[accountIndex]}`);
    currentSigner = provider.getSigner(accountIndex);
    contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    let nowAddress = accounts[accountIndex];
    let Id1 = await contract.addressToTeacherId(nowAddress);
    if(Id1!=0){
        let teacher = await contract.teachers(Id1);
        currentName = teacher.name;
    }
    let Id2 = await contract.addressToAgentId(nowAddress);
    if(Id2!=0){
        let agent = await contract.agents(Id2);
        currentName = agent.name;
    } 
    let Id3 = await classContract.addressToClassId(nowAddress);
    if(Id3!=0){
        let classname = await classContract.classes(Id3);
        currentName = classname.name;
    } 
    let Id4 = await classContract.addressToStudentId(nowAddress);
    if(Id4!=0){
        let studentname = await classContract.students(Id4);
        currentName = studentname.name;
    } 
    if(Id1 == 0 && Id2 == 0 && Id3 == 0 && Id4 == 0 && accountIndex != 0) currentName = "acount_" + accountIndex;
    console.log(`已切换到账户 ${currentName}`);
}

async function checkTeacherCourse() {
    const accounts = await web3.eth.getAccounts();
    for (let i = 0; i < accounts.length; i++) {
        currentSigner = provider.getSigner(i);
        contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
        let teacherId = await contract.addressToTeacherId(accounts[i]);
        // console.log(teacherId);
        if (teacherId != 0) {
            let allocateCourse = await contract.getTeacherAssignedCourses();
            let allocationcourseNum = allocateCourse.map(id => parseInt(id._hex, 16));
            console.log(`老师${teacherId}已分配的课程：${allocationcourseNum}`);
        }else {
            let agentId = await contract.addressToAgentId(accounts[i]);
            if(agentId!= 0){
                let allocateCourse = await contract.getAgentAssignedCourses();
                let allocationcourseNum = allocateCourse.map(id => parseInt(id._hex, 16));
                console.log(`智能体${agentId}已分配的课程：${allocationcourseNum}`); 
            }
        }

    // classContract = new ethers.Contract(classContractAddress, classABI, currentSigner); 
    }
    currentSigner = provider.getSigner(accountIndex);
    contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
}

async function getCourseImportance() {
    let allCourseImportance = await contract.getAllCourseImportance();
    for (let i = 0; i < allCourseImportance.length; i++) {
        // 将 BigNumber 转换为普通的数字或字符串
        let importanceValue = allCourseImportance[i].toNumber(); // 或者使用 .toString()
        console.log(`课程 ${i + 1} 的重要程度: ${importanceValue}`);
    }
}

async function checkCourseStatus() {
    let courseCounts = await contract.courseCount();
    console.log(`目前的课程数量：${courseCounts}`);
    for (let Id = 1 ; Id <= courseCounts ; Id++) {
        let course = await contract.getcourse(Id);
        console.log(`课程 ${Id} 的名字是 ${course.name}`);
    }
}

async function handleAddCourse(args) {
    if (args.length < 3) {
        console.log('请提供课程 ID 和是否适合智能体，例如: addcourse c1 true');
        return;
    }
    const courseId = args[1];
    const isElective = args[2].toLowerCase() === 'true';
    try {
        const tx = await contract.initializeCourse(courseId, isElective);
        await tx.wait();
        console.log(`课程 ${courseId} 已添加`);
    } catch (error) {
        console.log('添加课程时出错:', error);
    }
}

async function handleSetCourseImportance(args) {
    if (args.length < 2) {
        console.log('请提供课程重要程度列表，例如: setimportance 3,7,1,9,5,2,8,4,6,10');
        return;
    }
    const importance = args[1].split(',').map(Number);
    try {
        const tx = await contract.setAllCourseImportance(importance);
        await tx.wait();
        console.log('课程重要程度已设置');
    } catch (error) {
        console.log('设置课程重要程度时出错:', error);
    }
}

async function handleRegisterAgent(args) {
    if (args.length < 2) {
        console.log('请提供智能体名称，例如: registeragent agent_1');
        return;
    }
    const agentName = args[1];
    try {
        const tx = await contract.registerAgent(agentName);
        await tx.wait();
        currentName = agentName;
        console.log(`智能体 ${agentName} 已注册`);
    } catch (error) {
        console.log('注册智能体时出错:', error);
    }
}

async function handleUpdateSuitability(args) {
    if (args.length < 2) {
        console.log('请提供课程适合程度列表，例如: updatesuitability 8,9,10,2,5,7,3,6,4,1');
        return;
    }
    const suitability = args[1].split(',').map(Number);
    try {
        await contract.updateTeacherAllSuitability(suitability);
        console.log('课程适合程度已更新');
    } catch (error) {
        console.log('更新课程适合程度时出错:', error);
    }
}

async function UpdateSuitabilityAgent(args) {
    if (args.length < 2) {
        console.log('请提供课程适合程度列表，例如: update_suitability_for_agent 85,94,100,27,48,34,37,42,46,14');
        return;
    }
    const suitability = args[1].split(',').map(Number);
    try {
        const tx = await contract.updateAgentAllSuitability(suitability);
        await tx.wait();
        console.log('智能体课程适合程度已设定');
    } catch (error) {
        console.log('设定课程适合程度时出错:', error);
    }
}

async function allocateAgentCourses() {
    await contract.allocateAgentCourses();
    console.log("已经为智能体初始化课程");
}

async function handleRegisterTeacher(args) {
    if (args.length < 2) {
        console.log('请提供教师名称，例如: registerteacher teacher_1');
        return;
    }
    const teacherName = args[1];
    await contract.registerTeacher(teacherName);
    currentName = teacherName;
    console.log(`教师 ${teacherName} 已注册`);

}

async function handleUpdateSuitability(args) {
    if (args.length < 2) {
        console.log('请提供课程适合程度列表，例如: updatesuitabilities 3,5,7,2,9,4,6,1,8,10');
        return;
    }
    const preferences = args[1].split(',').map(Number);
    try {
        const tx = await contract.updateTeacherAllSuitability(preferences);
        await tx.wait();
        console.log('对每门课程的适合程度已更新');
    } catch (error) {
        console.log('更新课程适合程度时出错:', error);
    }
}

async function handleUpdatePreferences(args) {
    if (args.length < 2) {
        console.log('请提供对课程意愿列表，例如: updatepreferences 3,5,7,2,9,4,6,1,8,10');
        return;
    }
    const preferences = args[1].split(',').map(Number);
    try {
        const tx = await contract.updateAllCoursepreferences(preferences);
        await tx.wait();
        console.log('对课程的意愿已更新');
    } catch (error) {
        console.log('更新课程意愿时出错:', error);
    }
}

async function handleRegisterClass(args) {
    if (args.length < 2) {
        console.log('请提供班级名称，例如: registerclass class1');
        return;
    }

    const className = args[1];
    try {
        await contract.registerClass();
        const tx = await classContract.addClass(className);
        await tx.wait();
        currentName = className;
        console.log(`班级 ${className} 已注册`);
    } catch (error) {
        console.log('注册班级时出错:', error);
    }
}

async function handleRegisterStudent(args) {
    if (args.length < 2) {
        console.log('请提供班级ID和学生名称，例如: registerstudent 1 student_1');
        return;
    }

    const classId = parseInt(args[1]);
    const studentName = args[2];
    try {
        const tx = await classContract.registerStudent(classId, studentName);
        await tx.wait();
        currentName = studentName;
        console.log(`学生 ${studentName} 已在 班级${classId} 注册`);
    } catch (error) {
        console.log('注册班级时出错:', error);
    }
}

async function handleAddStudent(args) {
    if (args.length < 2) {
        console.log('请提供学生姓名，例如: addstudent Student1');
        return;
    }
    const studentName = args[1];

    try {
        const tx = await classContract.addStudentToClass(studentName);
        await tx.wait();
        console.log(`学生 ${studentName} 已添加到班级 ${currentName}`);
    } catch (error) {
        console.log('添加学生时出错:', error);
    }
}

async function AddAllStudent(args) {
    if (args.length < 2) {
        console.log('请提供学生数量，例如: addallstudent 25');
        return;
    }
    const studentNum = parseInt(args[1]);
    let studentCount = await classContract.studentCount();
    for(let i = 1; i <= studentNum; i++) {
        let nowstudent = parseInt(i)+parseInt(studentCount);
        let studentName = `student_${nowstudent}`;
        const tx = await classContract.addStudentToClass(studentName);
        await tx.wait();
        console.log(`学生 ${studentName} 已添加到班级 ${currentName}`);
    }
}

async function AllStudentVote(args) {
    if (args.length < 3) {
        console.log('请提供要投票的提案ID和要投票的教师，例如: allstudentvote 1 1');
        return;
    }
    let proposalId = parseInt(args[1]);
    let teacherId = parseInt(args[2]);
    let StudentIds = await classContract.getStudent();
    StudentIds = StudentIds.map(id => parseInt(id._hex, 16));
    // console.log(StudentIds);
    for(let i = 0; i < StudentIds.length; i++) {
        let studentId = StudentIds[i];
        await classContract.vote(studentId, proposalId, teacherId);
        console.log(`学生 ${studentId} 在提案 ${proposalId} 向教师 ${teacherId}投票`);
    }
    console.log("全部学生投票完毕!")
}

async function OtherStudentVote(args) {
    if (args.length < 2) {
        console.log('请提供要投票的提案ID，例如: otherstudentvote 1');
        return;
    }
    let proposalId = parseInt(args[1]);
    let [votedIds, result] = await contract.getCandidateTeacher(proposalId);
    
    let StudentIds = await classContract.getStudent();
    StudentIds = StudentIds.map(id => parseInt(id._hex, 16));
    // console.log(StudentIds);
    for(let i = 2; i < StudentIds.length; i++) {
        let studentId = StudentIds[i];
        let randomchoice = Math.floor(Math.random() * 2);
        let teacherId = votedIds[randomchoice];
        await classContract.vote(studentId, proposalId, teacherId);
        console.log(`学生 ${studentId} 在提案 ${proposalId} 向教师 ${teacherId}投票`);
    }
    console.log("全部学生投票完毕!")
}

async function OtherStudentVoteForWithoutCourse(args) {
    if (args.length < 2) {
        console.log('请提供要投票的提案ID，例如: other_student_vote_for_without_course 1');
        return;
    }
    let proposalId = parseInt(args[1]);
    let [votedIds, result] = await contract.getCandidateTeacher(proposalId);
    
    let StudentIds = await classContract.getStudent();
    StudentIds = StudentIds.map(id => parseInt(id._hex, 16));
    // console.log(StudentIds);
    for(let i = 2; i < StudentIds.length; i++) {
        let studentId = StudentIds[i];
        let teacherId = votedIds[0];
        await classContract.vote(studentId, proposalId, teacherId);
        console.log(`学生 ${studentId} 在提案 ${proposalId} 向教师 ${teacherId}投票`);
    }
    console.log("全部学生投票完毕!")
}

async function StudentVote(args) {
    if (args.length < 3) {
        console.log('请提供要投票的提案ID和要投票的教师，例如: studentvote 1 1');
        return;
    }
    let proposalId = parseInt(args[1]);
    let teacherId = parseInt(args[2]);
    await classContract.studentVote(proposalId, teacherId);
    console.log(`学生 ${currentName} 在提案 ${proposalId} 向教师 ${teacherId}投票`);

}

async function AllStudentVoteForWithout(args) {
    if (args.length < 3) {
        console.log('请提供要投票的提案ID和要投票的课程，例如: allstudentvote 1 1');
        return;
    }
    let proposalId = parseInt(args[1]);
    let teacherId = parseInt(args[2]);
    let StudentIds = await classContract.getStudent();
    StudentIds = StudentIds.map(id => parseInt(id._hex, 16));
    // console.log(StudentIds);
    for(let i = 0; i < StudentIds.length; i++) {
        let studentId = StudentIds[i];
        await classContract.vote(studentId, proposalId, teacherId);
        console.log(`学生 ${studentId} 在提案 ${proposalId} 向教师 ${teacherId}投票`);
    }
    console.log("全部学生投票完毕!")
}

async function OtherStudentVoteForWithout(args) {
    if (args.length < 3) {
        console.log('请提供要投票的提案ID和要投票的课程，例如: otherstudentvote 1 1');
        return;
    }
    let proposalId = parseInt(args[1]);
    let teacherId = parseInt(args[2]);
    let StudentIds = await classContract.getStudent();
    StudentIds = StudentIds.map(id => parseInt(id._hex, 16));
    // console.log(StudentIds);
    for(let i = 0; i < StudentIds.length; i++) {
        let studentId = StudentIds[i];
        await classContract.vote(studentId, proposalId, teacherId);
        console.log(`学生 ${studentId} 在提案 ${proposalId} 向教师 ${teacherId}投票`);
    }
    console.log("全部学生投票完毕!")
}

async function endClassVote(args) {
    if (args.length < 2) {
        console.log('请提供要投票的提案ID，例如: end_class_vote 1');
        return;
    }
    let proposalId = parseInt(args[1]);
    let tx = await contract.classvoteForTeacher(proposalId);
    let receipt = await tx.wait();
    const event = receipt.events.find(event => event.event === "endClassVote");
    if (event) {
        const { proposalId, winningTeacherId } = event.args;
        console.log(`${currentName} 在 提案${proposalId} 中投票给 教师${winningTeacherId}`)
    }

}

async function endWithoutCourse(args) {
    if (args.length < 2) {
        console.log('请提供要投票的提案ID，例如: end_class_vote_for_without_course 1');
        return;
    }
    let proposalId = parseInt(args[1]);
    let tx = await contract.classvoteForTeacher(proposalId);
    let receipt = await tx.wait();
    const event = receipt.events.find(event => event.event === "endClassVote");
    if (event) {
        const { proposalId, winningTeacherId } = event.args;
        console.log(`${currentName} 在 提案${proposalId} 中投票给 课程${winningTeacherId}`)
    }

}

async function handleCreateProposal() {
    try {
        const tx = await contract.createProposalForCourse();
        await tx.wait();
        console.log('提案已创建');
    } catch (error) {
        console.log('创建提案时出错:', error);
    }
}

async function handleVote(args) {
    if (args.length < 3) {
        console.log('请提供提案 ID 和教师 ID，例如: vote 1 1');
        return;
    }
    const proposalId = parseInt(args[1]);
    const teacherId = parseInt(args[2]);
    try {
        const tx = await contract.voteForTeacher(proposalId, teacherId);
        await tx.wait();
        console.log(`已为提案 ${proposalId} 投票给教师 ${teacherId}`);
    } catch (error) {
        console.log('投票时出错:', error);
    }
}

async function endVote(args) {
    if (args.length < 2) {
        console.log('请提供提案 ID，例如: endvote 1');
        return;
    }
    // 获取候选人的ID
    const proposalId = parseInt(args[1]);
    let [votedIds, result] = await contract.getCandidateTeacher(proposalId);
    votedIds = votedIds.map(id => parseInt(id._hex, 16));
    // 创建一个数组来存储结果
    let results = [];

    // 使用 for 循环获取每个人的票数
    for (let i = 0; i < votedIds.length; i++) {
        let voteCount = await contract.getVoteIdToCount(proposalId, votedIds[i]);
        results.push({ id: votedIds[i], count: voteCount });
    }

    // 以表格形式打印结果
    console.log('Teacher ID'.padEnd(15) + 'Vote Count'.padEnd(15));
    for (let result of results) {
        console.log('--------------------------------');
        console.log(`${result.id.toString().padEnd(15)}${result.count.toString().padEnd(15)}`);
    }
    let tx = await contract.endProposalAndAssignCourse(proposalId);
    // 等待交易确认
    let receipt = await tx.wait();
    // 提取事件日志中的返回值
    const event = receipt.events.find(event => event.event === "CourseAssignedToTeacher");
    if (event) {
        const { courseId, teacherId } = event.args;
        console.log("Course ID:", courseId.toString());
        console.log("Winning Teacher ID:", teacherId.toString());
    }
}

async function endVoteForWithoutCourse(args) {
    if (args.length < 2) {
        console.log('请提供提案 ID，例如: end_vote_for_without_course 1');
        return;
    }
    // 获取提案的ID
    const proposalId = parseInt(args[1]);
    let [votedIds, result] = await contract.getCandidateTeacher(proposalId);
    votedIds = votedIds.map(id => parseInt(id._hex, 16));
    // 创建一个数组来存储结果
    let results = [];

    // 使用 for 循环获取每个人的票数
    for (let i = 0; i < votedIds.length; i++) {
        let voteCount = await contract.getVoteIdToCount(proposalId, votedIds[i]);
        results.push({ id: votedIds[i], count: voteCount });
    }

    // 以表格形式打印结果
    console.log('Teacher ID'.padEnd(15) + 'Vote Count'.padEnd(15));
    for (let result of results) {
        console.log('--------------------------------');
        console.log(`${result.id.toString().padEnd(15)}${result.count.toString().padEnd(15)}`);
    }
    let tx = await contract.endProposalAndAssignCourseforWithoutteacher(proposalId);
    // 等待交易确认
    let receipt = await tx.wait();
    // 提取事件日志中的返回值
    const event = receipt.events.find(event => event.event === "CourseAssignedToTeacher");
    if (event) {
        const { courseId, teacherId } = event.args;
        console.log("Course ID:", courseId.toString());
        console.log("Winning Teacher ID:", teacherId.toString());
        
    }
}

async function checkVoteCount(args) {
    if (args.length < 2) {
        console.log('请提供提案 ID，例如: check_proposal_count 1');
        return;
    }
    // 获取提案的ID
    const proposalId = parseInt(args[1]);
    let [votedIds, result] = await contract.getCandidateTeacher(proposalId);
    votedIds = votedIds.map(id => parseInt(id._hex, 16));
    // 创建一个数组来存储结果
    let results = [];

    // 使用 for 循环获取每个人的票数
    for (let i = 0; i < votedIds.length; i++) {
        let voteCount = await contract.getVoteIdToCount(proposalId, votedIds[i]);
        results.push({ id: votedIds[i], count: voteCount });
    }

    // 以表格形式打印结果
    console.log('Teacher ID'.padEnd(15) + 'Vote Count'.padEnd(15));
    for (let result of results) {
        console.log('--------------------------------');
        console.log(`${result.id.toString().padEnd(15)}${result.count.toString().padEnd(15)}`);
    }
}

async function getproposal(args) {
    if (args.length < 2) {
        console.log('请提供提案 ID，例如: getproposal 1');
        return;
    }
    const proposalId = parseInt(args[1]);

    let [votedIds, result] = await contract.getCandidateTeacher(proposalId);
    votedIds = votedIds.map(id => parseInt(id._hex, 16));
    result = parseInt(result._hex, 16);
    console.log("Teachers IDs:", votedIds);
    console.log("course ID:", result);
}

async function autoAllVote() {
    let count = await contract.courseCount();
    count = parseInt(count._hex, 16);
    // console.log(count);
    let noallocated = 0;
    for (let i = 1; i <= count; i++) {
        let course = await contract.getcourse(i);
        let teacherID = course.assignedTeacherId;
        teacherID = parseInt(teacherID._hex, 16);
        // console.log(teacherID);
        if (teacherID == 0) {
            noallocated++;
        }
    }
    console.log("Number of courses not assigned: ", noallocated);
    for(let i = 1; i <= noallocated;i++){
        await machineVote();
    }
}
async function machineVote() {
    let classlength = await classContract.classCount();
    classlength = parseInt(classlength._hex, 16);
    let tx = await contract.machineVoting();
    // 等待交易确认
    let receipt = await tx.wait();
    // 提取事件日志中的返回值
    const event = receipt.events.find(event => event.event === "MachineProposal");
    if (event) {
        let { proposalId, courseId, teacherIds, teacherCounts} = event.args;
        teacherIds = teacherIds.map(id => parseInt(id._hex, 16));
        teacherCounts = teacherCounts.map(id => parseInt(id._hex, 16));

        // 创建一个数组来存储结果
        let results = [];
        let teacherCount = await contract.teacherCount();
        teacherCount = parseInt(teacherCount._hex, 16);
        // 使用 for 循环获取每个人的票数
        for (let i = 0; i < teacherIds.length; i++) {
            if(teacherIds[i] != 0){
                let nowTeacherId = teacherIds[i];
                let newTeacherCount = teacherCounts[nowTeacherId-1];
                let divided = (teacherCount + classlength - 1) * 10;
                // console.log(newTeacherCount);
                // console.log(teacherCount);
                // console.log(classlength);

                newTeacherCount = newTeacherCount / divided;
                results.push({ id: teacherIds[i], count: newTeacherCount });
            }
        }

        // 以表格形式打印结果
        console.log('Teacher ID'.padEnd(15) + 'Vote Count'.padEnd(15));
        for (let result of results) {
            console.log('--------------------------------');
            console.log(`${result.id.toString().padEnd(15)}${result.count.toString().padEnd(15)}`);
        }
        
        console.log("Propose ID:", proposalId.toString());
        console.log("Course ID:", courseId.toString());
        
    }

    const event2 = receipt.events.find(event => event.event === "CourseAssignedToTeacher");
    let courseId = 0;
    if (event2) {
        const {_courseId, teacherId} = event2.args;
        courseId = _courseId;
        console.log("Winning Teacher ID:", teacherId.toString());
    }

    const event3 = receipt.events.find(event => event.event === "samescore");
    if (event3) {
        console.log("存在教师票数相等，下面是意愿情况");
        let {maxScoreTeachers, preferences} = event3.args;
        maxScoreTeachers = maxScoreTeachers.map(id => parseInt(id._hex, 16))
        preferences = preferences.map(id => parseInt(id._hex, 16))
        // 创建一个数组来存储结果
        let results = [];

        // 使用 for 循环获取每个人的票数
        for (let i = 0; i < preferences.length; i++) {
            results.push({ id: maxScoreTeachers[i], count: preferences[i]});
        }
        console.log('Teacher ID'.padEnd(15) + 'preference'.padEnd(15));
        for (let result of results) {
            console.log('--------------------------------');
            console.log(`${result.id.toString().padEnd(15)}${result.count.toString().padEnd(15)}`);
        }
    }
    console.log("\n");
}

async function setweight(args) {
    if (args.length < 2) {
        console.log('请提供权重大小，例如: setweight 1');
        return;
    }
    const weight = parseInt(args[1]);

    await contract.updateSuitabilityWeight(weight);
    console.log(`${currentName} 设置权重 :`, weight);
}

async function checkStudent() {
    let student = await classContract.getStudent();
    student = student.map(id => parseInt(id._hex, 16));
    console.log("班级的学生ID：", student);
}

async function setCourseScore(args) {
    if (args.length < 2) {
        console.log('请提供对课程的评分列表，例如: student_set_suitability 3,5,7,2,9,4,6,1,8,10');
        return;
    }
    const suitability = args[1].split(',').map(Number);

    await classContract.studentSetCourseSuitability(suitability);
    console.log(`学生${currentName} 已经设置对每门课程的评分!`)
}

async function setOtherCourseScore() {
    let studentCount = await classContract.getStudentofClass();
    console.log(`学生的数量：${studentCount.length}`);
    
    for (let i = 2; i < studentCount.length; i++) {
        let studentId = studentCount[i];
        // 生成随机的 suitability 数组
        const suitability = generateRandomSuitability();
        
        // 调用合约方法设置评分
        await classContract.setCourseSuitability(studentId, suitability);
        console.log(`Student ${studentId} 已经设置对每门课程的评分!`);
    }
}

// 辅助函数：生成随机的 suitability 数组
function generateRandomSuitability() {
    const suitability = [];
    for (let i = 0; i < 10; i++) {
        // 生成 70 到 100 之间的随机整数
        suitability.push(Math.floor(Math.random() * 31) + 70);
    }
    return suitability;
}

async function getAllCourseSuitability() {
    let suitability = await classContract.getAverageSuitability();
    suitability = suitability.map(id => parseInt(id._hex, 16));
    console.log('每门课程的平均评分为：', suitability);
}

async function checkStudentSuitability(args) {
    if (args.length < 2) {
        console.log('请提供学生ID，例如: check_student_suitability 1');
        return;
    }
    const studentId = args[1];

    let score = await classContract.getCourseSuitability(studentId);
    console.log(`Student ${studentId} 对课程的评分为 ${score}`);
}

async function getAgentAssignedCourses(args) {
    // 命令： get_agent_assigned_courses
    let allocateCourse = await contract.getAgentAssignedCourses();
    allocateCourse = allocateCourse.map(id => parseInt(id._hex, 16));
    console.log(`智能体 ${currentName} 分配的课程为 ${allocateCourse}`);
}

async function checkStudentSuitability(args) {
    if (args.length < 2) {
        console.log('请提供学生ID，例如: check_student_suitability 1');
        return;
    }
    const studentId = args[1];

    let score = await classContract.getCourseSuitability(studentId);
    console.log(`Student ${studentId} 对课程的评分为 ${score}`);
}

async function createProposalForWithoutCourseTeacher() {
    let tx = await contract.checkAndCreateProposalForTeacher();
    let receipt = await tx.wait();
    const event = receipt.events.find(event => event.event === "ProposalCreated");
    if (event) {
        let { proposalId, courseId, teacherIds} = event.args;
        proposalId = parseInt(proposalId._hex, 16);
        courseId = parseInt(courseId._hex, 16);
        teacherIds = teacherIds.map(id => parseInt(id._hex, 16));
        let saveId = [];
        let index=0;
        for(let i = 0; i < teacherIds.length; i++){
            if(teacherIds[i]!=0){
                saveId[index] = teacherIds[i];
                index++;
            }
        }
        console.log(`Proposal ID ${proposalId}`);
        console.log(`course ID ${courseId}`);
        console.log(`Candidate Teacher ID ${saveId}`);
    }
}

async function checkAndMachineVoteForTeacher() {
    let tx = await contract.checkAndMachineVoteForTeacher();
    let receipt = await tx.wait();
    const event = receipt.events.find(event => event.event === "MachineProposal");
    let teacherCount = await contract.teacherCount();
    teacherCount = parseInt(teacherCount._hex, 16);
    let classCount = await classContract.classCount();
    classCount = parseInt(classCount._hex, 16);
    if (event) {
        let { proposalId, courseId, teacherIds, teacherCounts} = event.args;
        proposalId = parseInt(proposalId._hex, 16);
        courseId = parseInt(courseId._hex, 16);
        let candidateTeacher = teacherIds.map(id => parseInt(id._hex, 16));
        teacherCounts = teacherCounts.map(id => parseInt(id._hex, 16));
        console.log(`Proposal ID ${proposalId}`);
        console.log(`Teacher ID ${courseId}`);
        // console.log(`Candidate Course ID ${candidateTeacher}`);
        // console.log(`counts ${teacherCounts}`);
        // 创建一个数组来存储结果
        let results = [];
        
        // 使用 for 循环获取每个人的票数
        for (let i = 0; i < candidateTeacher.length; i++) {
            if(candidateTeacher[i]!=0){
                let nowCount = teacherCounts[candidateTeacher[i]-1];
                let divied = (teacherCount + classCount - 1)*10;
                nowCount = nowCount / divied;
                results.push({ id: candidateTeacher[i], count: nowCount});
            }
        }
        console.log('Teacher ID'.padEnd(15) + 'teacherCounts'.padEnd(15));
        for (let result of results) {
            console.log('--------------------------------');
            console.log(`${result.id.toString().padEnd(15)}${result.count.toString().padEnd(15)}`);
        }
    }
    const event1 = receipt.events.find(event => event.event === "CourseAssignedToTeacher");
    if (event1) {
        let { courseId, teacherId} = event1.args;
        courseId = parseInt(courseId._hex, 16);
        teacherId = parseInt(teacherId._hex, 16);

        console.log(`course ID ${courseId}`);
        console.log(`winning teacherId ID ${teacherId}`);
    }

}

async function updateSuitabilityByStudent() {
    let suitability = await classContract.getAverageSuitability();
    
    let teacherChangeSuitability = [];
    let agentChangeSuitability = [];
    let teacherSuitability = [];
    let agentSuitability = [];
    let teacherCourseIds = [];
    let agentCourseIds = [];
    let teacherIds = [];
    let agentIds = [];
    let courseCount = await contract.courseCount();
    for(let i = 1; i <= courseCount; i++){
        
        let course = await contract.getcourse(i);
        let isAgent = await course.isAssignedAgent;
        let teacherId = await course.assignedTeacherId;
        if(!isAgent){
            teacherCourseIds.push(i);
            teacherIds.push(teacherId);
            teacherChangeSuitability.push(suitability[i-1]);

            let _teacherSuitability = await contract.getteacherCourseSuitability(teacherId, i);
            teacherSuitability.push(_teacherSuitability);
        }else{
            agentCourseIds.push(i);
            agentIds.push(teacherId);
            agentChangeSuitability.push(suitability[i-1]);

            let _agentSuitability = await contract.getagentCourseSuitability(teacherId, i);
            agentSuitability.push(_agentSuitability);
        }
    }

    let teacherResults = [];
        
    // 使用 for 循环获取每个人的票数
    for (let i = 0; i < teacherIds.length; i++) {
        teacherResults.push({id: teacherIds[i], courseId: teacherCourseIds[i], count: teacherSuitability[i], changeCount: teacherChangeSuitability[i]});
    }

    teacherResults.sort((a, b) => {
        if (a.id !== b.id) {
            return a.id - b.id; // 按照 id 升序排列
        } else {
            return a.courseId - b.courseId; // 按照 courseId 升序排列
        }
    });

    let agentResults = [];
        
    // 使用 for 循环获取每个人的票数
    for (let i = 0; i < agentIds.length; i++) {
        agentResults.push({ id: agentIds[i], courseId: agentCourseIds[i], count: agentSuitability[i], changeCount: agentChangeSuitability[i]});
    }

    agentResults.sort((a, b) => {
        if (a.id !== b.id) {
            return a.id - b.id; // 按照 id 升序排列
        } else {
            return a.courseId - b.courseId; // 按照 courseId 升序排列
        }
    });

    console.log('Teacher ID'.padEnd(15) + 'courseId'.padEnd(15)+ 'score'.padEnd(15)+ 'changedScore'.padEnd(15));
    for (let result of teacherResults) {
        console.log('----------------------------------------------------');
        console.log(`${result.id.toString().padEnd(15)}${result.courseId.toString().padEnd(15)}${result.count.toString().padEnd(15)}${result.changeCount.toString().padEnd(15)}`);
    }

    console.log('Agent ID'.padEnd(15) + 'courseId'.padEnd(15)+ 'score'.padEnd(15)+ 'changedScore'.padEnd(15));
    for (let result of agentResults) {
        console.log('---------------------------------------------------');
        console.log(`${result.id.toString().padEnd(15)}${result.courseId.toString().padEnd(15)}${result.count.toString().padEnd(15)}${result.changeCount.toString().padEnd(15)}`);
    }
    await contract.changeSuitabilitybyStudent(suitability);
}