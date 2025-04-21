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
let currentName = "account_0";
// 创建合约实例
let contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
let voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
let classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
let teacherVoteContract = new ethers.Contract(teacherVoteAddress, teacherVoteABI, currentSigner);

const {
    sendMultipleData
} = require("../api/api_py.js");

// 创建课程
async function initializeCourse(name, Importance) {
    let courseCount = await contract.courseCount();
    courseCount = courseCount.toNumber();
    courseCount = courseCount + 1;
    // console.log(courseCount);
    await contract.setCourseCount(courseCount);
    await contract.setCourseId(courseCount);
    await contract.setCourseName(courseCount, name);
    await contract.setCourseImportance(courseCount, Importance);
    //await contract.setCourseIsAgentSuitable(courseCount, IsAgentSuitable);

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
    await teacherVoteContract.registerVoter(addr);
    return {
        code: 0,
        message: "Teacher Registered successfully",
        courseId: teacherCount
    };
}

// 注册班级
async function registerClass(name, addr) {
    let isregister = await contract.addressToClassId(addr);//新注册的话 返回值是0
    isregister = isregister.toNumber();
    if(isregister!=0){
        console.log("该班级已经注册")
        return {
            code: -1,
            message: "Class Already Registered",
        };
    }
    let classCount = await contract.classCount();
    classCount = classCount.toNumber();
    classCount = classCount + 1;
    // console.log(classCount);
    await contract.setClassCount(classCount);
    await contract.setClassId(addr, classCount);
    await voteContract.registerVoter(addr);
    await classContract.addClass(name, addr);
    return {
        code: 0,
        message: "Class Registered successfully",
        courseId: classCount
    };
}

// 创建智能体
async function registerAgent(name, addr) {
    let isregister = await contract.addressToAgentId(addr);
    isregister = isregister.toNumber();
    if(isregister!=0){
        console.log("该智能体已经注册")
        return {
            code: -1,
            message: "Agent Already Registered",
        };
    }
    let agentCount = await contract.agentCount();
    agentCount = agentCount.toNumber();
    agentCount = agentCount + 1;
    // console.log(agentCount);
    await contract.setAgentCount(agentCount);
    await contract.setAgentId(addr, agentCount);
    await contract.setAgentName(agentCount, name);
    await contract.setAgentAddress(agentCount, addr);
    await voteContract.registerVoter(addr);
    return {
        code: 0,
        message: "Agent Registered successfully",
        courseId: agentCount
    };
}

// 注册学生
async function registerStudent(classId, name, addr) {
    let isregister = await classContract.addressToStudentId(addr);//新注册的话 返回值是0
    isregister = isregister.toNumber();
    if(isregister!=0){
        console.log("该学生已经注册")
        return {
            code: -1,
            message: "Student Already Registered",
        };
    }
    let studentCount = await classContract.studentCount();
    studentCount = studentCount.toNumber();
    studentCount = studentCount + 1;
    await classContract.registerStudent(classId, name, addr);
    return {
        code: 0,
        message: "student Registered successfully",
        courseId: studentCount
    };
}

// 注册督导
async function registerSupervisor(name, addr) {
    let isregister = await contract.addressToSupervisorId(addr);
    if(isregister!=0){
        console.log("该督导已经注册")
        return {
            code: -1,
            message: "该督导已经注册",
        };
    }
    let supervisorCount = await contract.supervisorCount();
    supervisorCount = Number(supervisorCount);
    supervisorCount++;
    await contract.addSupervisorId(supervisorCount);
    await contract.setSupervisorId(addr, supervisorCount);
    await contract.setSupervisorName(supervisorCount, name);
    await voteContract.registerVoter(addr);
    return {
        code: 0,
        message: "督导注册成功",
        courseId: supervisorCount
    };
}

async function register(){
    const { registerType, Name } = await inquirer.prompt([
        {
          type: 'list',
          name: 'registerType',
          message: '您的要注册身份类型:',
          choices: [
            { name: '教师', value: 'Teacher' },
            { name: '智能体', value: 'Agent' },
            { name: '班级', value: 'Class' },
            { name: '学生', value: 'Student' },
            { name: '督导', value: 'Supervisor' },
          ]
        },
        {
          type: 'input',
          name: 'Name',
          message: '输入您的姓名:',
        }
    ]);
    let addr = await currentSigner.getAddress();
    // console.log(addr);
    if(registerType === 'Student') {
        const {classId} = await inquirer.prompt([
            {
            type: 'number',
            name: 'classId',
            message: '输入您的班级 ID:',
            }
        ])
        await registerStudent(classId, Name, addr);
    }else if(registerType === 'Teacher'){
        await registerTeacher(Name, addr);
    }else if(registerType === 'Agent'){
        await registerAgent(Name, addr);
    }else if(registerType === 'Class'){
        await registerClass(Name, addr);
    }else if(registerType === 'Supervisor'){
        await registerSupervisor(Name, addr);
    }
    currentName = Name;
    return [Name, registerType];
}

async function switchUser(){
    
    const { userType } = await inquirer.prompt([
        {
          type: 'list',
          name: 'userType',
          message: '您的身份类型:',
          choices: [
            { name: '教师', value: 'Teacher' },
            { name: '智能体', value: 'Agent' },
            { name: '班级', value: 'Class' },
            { name: '学生', value: 'Student' },
            { name: '督导', value: 'Supervisor' },
            { name: '未注册', value: 'NoRegister' },
          ]
        }
    ]);
    let userName = "user";
    let userId = -1;
    if(userType != 'NoRegister'){
        userName = await inquirer.prompt([
            {
              type: 'input',
              name: 'userName',
              message: `输入您的姓名:`,
            }
        ]);
    }
    else{
        userId = await inquirer.prompt([
            {
              type: 'number',
              name: 'userId',
              message: `输入您的账户Id:`,
            }
        ]);
    }
    userId = userId.userId;
    userName = userName.userName;
    // 按身份类型进行验证
    if (userType === 'Teacher') {
        let teacherIds = await contract.getTeacherIds();
        teacherIds = teacherIds.map( id => id.toNumber() );
        const [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName] = await loginWithIdentity('Teacher', teacherIds, userName, '切换为教师');
        if(!nowCurrentSigner){
            console.log('不存在这个老师')
            return {
                code:-1,
                message: "不存在这个老师"
            }
        }
        [currentSigner, contract, voteContract, classContract, currentName] = [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName]

    } else if (userType === 'Agent') {
        let agentIds = await contract.getAgentIds();
        agentIds = agentIds.map( id => id.toNumber() );
        const [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName]  = await loginWithIdentity('Agent', agentIds, userName, '切换为智能体');
        if(!nowCurrentSigner){
            console.log('不存在这个智能体')
            return {
                code:-1,
                message: "不存在这个智能体"
            }
        }
        [currentSigner, contract, voteContract, classContract, currentName] = [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName]

    } else if (userType === 'Class') {
        let classIds = await classContract.getClassIds();
        classIds = classIds.map( id => id.toNumber() );
        const [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName]  = await loginWithIdentity('Class', classIds, userName, '切换为班级');
        if(!nowCurrentSigner){
            console.log('不存在这个班级')
            return {
                code:-1,
                message: "不存在这个班级"
            }
        }
        [currentSigner, contract, voteContract, classContract, currentName] = [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName]

    } else if (userType === 'Student') {
        let studentIds = await classContract.getStudentIds();
        studentIds = studentIds.map( id => id.toNumber() );
        const [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName]  = await loginWithIdentity('Student', studentIds, userName, '切换为学生');
        if(!nowCurrentSigner){
            console.log('不存在这个学生')
            return {
                code:-1,
                message: "不存在这个学生"
            }
        }
        [currentSigner, contract, voteContract, classContract, currentName] = [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName]

    } else if(userType === 'Supervisor'){
        let supervisorIds = await contract.getSupervisorIds();
        supervisorIds = supervisorIds.map( id => Number(id) );
        const [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName]  = await loginWithIdentity('Supervisor', supervisorIds, userName, '切换为督导');
        if(!nowCurrentSigner){
            console.log('不存在这个督导')
            return {
                code:-1,
                message: "不存在这个督导"
            } 
        }
    } else if(userType === 'Supervisor'){
        let supervisorIds = await contract.getSupervisorIds();
        supervisorIds = supervisorIds.map( id => Number(id) );
        const [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName]  = await loginWithIdentity('Supervisor', supervisorIds, userName, '切换为督导');
        if(!nowCurrentSigner){
            console.log('不存在这个督导')
            return {
                code:-1,
                message: "不存在这个督导"
            } 
        }
    } else {
        currentSigner = provider.getSigner(userId);
        contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
        voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
        classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
        currentName = `account_${userId}`
    }
    let currentAddress = await currentSigner.getAddress();
    return{
        code: 0,
        currentAddress: currentAddress,
        currentName: currentName,
        currentType: userType
    }
}

// 登录通用函数
async function loginWithIdentity(identityType, ids, userName, message) {
    for (const id of ids) {
        let user = identityType;
        if(identityType != 'Student' && identityType != 'Class'){
            user = await contract[identityType.toLowerCase() + 's'](id);
        }else if(identityType == 'Student' ){
            user = await classContract[identityType.toLowerCase() + 's'](id);
        }else{
            user = await classContract[identityType.toLowerCase() + 'es'](id);
        }
        
        if (user.name === userName) {
            let currentAddress = user.addr;
            currentSigner = provider.getSigner(currentAddress);
            contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
            voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
            classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
            currentName = user.name;
            console.log(`${message} ${user.name} 成功`);
            return [currentSigner,contract,voteContract,classContract,currentName];
        }
    }
    return [false, false, false, false, false];
}


async function initializeData() {
        const accounts = await web3.eth.getAccounts();
        // 初始化课程
        console.log("Initializing courses...");
        const courseCount = await contract.courseCount();
        if (courseCount == 0) {
            await initializeCourse("计算机网络", 3);
            await initializeCourse("数据结构", 7);
            await initializeCourse("操作系统", 1);
            await initializeCourse("数据库原理", 9);
            await initializeCourse("人工智能", 5);
            await initializeCourse("机器学习", 2);
            await initializeCourse("计算机图形学", 8);
            await initializeCourse("编译原理", 4);
            await initializeCourse("软件工程", 6);
            await initializeCourse("计算机体系结构", 10);
        }else {
            console.log("Courses already initialized. Skipping...");
        }
     

       // 注册教师
       console.log("Registering teachers...");
       await switchAcount(1);
       await registerTeacher("teacher_1", accounts[1]);
       await contract.setTeacherValue(1, 800);
       await contract.setTeacherSuitabilityWeight(1,1);
       await contract.setTeacherTransferCourseCoins(1, 6);
       await contract.setAllTeacherCourseSuitability(1, [80,81,82,94,70,68,89,96,57,93]);
       await contract.setAllTeacherCoursePreferences(1, [95,94,66,62,93,48,44,40,46,40]);
   
       await switchAcount(2);
       await registerTeacher("teacher_2", accounts[2]);
       await contract.setTeacherValue(2, 1000);
       await contract.setTeacherSuitabilityWeight(2,2);
       await contract.setTeacherTransferCourseCoins(2, 6);
       await contract.setAllTeacherCourseSuitability(2, [71,62,73,64,85,86,87,88,95,73]);
       await contract.setAllTeacherCoursePreferences(2, [35,44,47,55,47,83,88,66,64,80]);
   
       await switchAcount(3);
       await registerTeacher("teacher_3", accounts[3]);
       await contract.setTeacherValue(3, 1500);
       await contract.setTeacherSuitabilityWeight(3,3);
       await contract.setTeacherTransferCourseCoins(3, 6);
       await contract.setAllTeacherCourseSuitability(3, [62,61,74,73,68,77,64,72,58,70]);
       await contract.setAllTeacherCoursePreferences(3, [31,42,43,34,55,46,47,40,45,37]);

       await switchAcount(4);
       await registerTeacher("teacher_4", accounts[4]);
       await contract.setTeacherSuitabilityWeight(4,4);
       await contract.setTeacherValue(4, 1200);
       await contract.setTeacherTransferCourseCoins(4, 6);
       await contract.setAllTeacherCourseSuitability(4, [73,64,65,66,97,68,79,80,81,63]);
       await contract.setAllTeacherCoursePreferences(4, [42,33,24,45,26,27,28,39,47,10]);
   
       await switchAcount(5);
       await registerTeacher("teacher_5", accounts[5]);
       await contract.setTeacherSuitabilityWeight(5,5);
       await contract.setTeacherValue(5, 1100);
       await contract.setTeacherTransferCourseCoins(5, 6);
       await contract.setAllTeacherCourseSuitability(5, [62,83,84,75,100,77,71,72,73,74]);
       await contract.setAllTeacherCoursePreferences(5, [43,34,45,45,46,37,38,49,49,49]);

       // 注册智能体
       console.log("Registering agents...");
       await switchAcount(6);
       await registerAgent("agent_1", accounts[6]);
    //    await contract.setAllAgentCourseSuitability(1, [75,99,72,91,88,73,70,76,86,100]);
       await contract.setAllAgentCourseSuitability(1, [75,79,72,51,68,63,70,76,66,50]);
       await contract.setAgentValue(1,1000);
   
       await switchAcount(7);
       await registerAgent("agent_2", accounts[7]);
    //    await contract.setAllAgentCourseSuitability(2, [86,98,93,90,87,94,91,97,88,99]); 
       await contract.setAllAgentCourseSuitability(2, [66,48,53,50,57,54,51,57,58,59]);
       await contract.setAgentValue(2,1200);
    
        // 教师1
        await contract.addTeacherResearchDirection(1, '大规模视频分析与理解');
        await contract.addTeacherPaperCount(1, 5);
        await contract.addTeacherResearchDirection(1, '视频风格迁移');
        await contract.addTeacherPaperCount(1, 3);
        await contract.addTeacherResearchDirection(1, '计算机视觉');
        await contract.addTeacherPaperCount(1, 4);

        // 教师2
        await contract.addTeacherResearchDirection(2, '统计机器学习');
        await contract.addTeacherPaperCount(2, 6);
        await contract.addTeacherResearchDirection(2, '信息检索');
        await contract.addTeacherPaperCount(2, 5);
        await contract.addTeacherResearchDirection(2, '自然语言处理');
        await contract.addTeacherPaperCount(2, 4);

        // 教师3
        await contract.addTeacherResearchDirection(3, '人工智能');
        await contract.addTeacherPaperCount(3, 7);
        await contract.addTeacherResearchDirection(3, '机器学习');
        await contract.addTeacherPaperCount(3, 8);
        await contract.addTeacherResearchDirection(3, '数据挖掘');
        await contract.addTeacherPaperCount(3, 5);

        // 教师4
        await contract.addTeacherResearchDirection(4, '机器学习基础理论');
        await contract.addTeacherPaperCount(4, 9);
        await contract.addTeacherResearchDirection(4, '高效算法');
        await contract.addTeacherPaperCount(4, 6);
        await contract.addTeacherResearchDirection(4, '应用研究');
        await contract.addTeacherPaperCount(4, 5);

        // 教师5
        await contract.addTeacherResearchDirection(5, '自然语言处理');
        await contract.addTeacherPaperCount(5, 10);
        await contract.addTeacherResearchDirection(5, '机器学习');
        await contract.addTeacherPaperCount(5, 7);
        await contract.addTeacherResearchDirection(5, '社会与人文计算');
        await contract.addTeacherPaperCount(5, 5);

        // 注册班级
        console.log("Registering classes...");
        await switchAcount(8);
        await registerClass("class_1", accounts[8]);
        console.log("班级1注册完毕");

        await switchAcount(10);
        await registerStudent(1, "student_1", accounts[10]);
        console.log("student_1 (class_1) 注册完毕");

        await switchAcount(11);
        await registerStudent(1, "student_2", accounts[11]);
        console.log("student_2 (class_1) 注册完毕");
        
        await switchAcount(12);
        await registerStudent(1, "student_3", accounts[12]);
        console.log("student_3 (class_1) 注册完毕");

        await switchAcount(13);
        await registerStudent(1, "student_4", accounts[13]);
        console.log("student_4 (class_1) 注册完毕");

        await switchAcount(14);
        await registerStudent(1, "student_5", accounts[14]);
        console.log("student_5 (class_1) 注册完毕");

        await switchAcount(9);
        await registerClass("class_2", accounts[9]);
        console.log("班级2注册完毕");

        await switchAcount(15);
        await registerStudent(2, "student_6", accounts[15]);
        console.log("student_6 (class_2) 注册完毕");

        await switchAcount(16);
        await registerStudent(2, "student_7", accounts[16]);
        console.log("student_7 (class_2) 注册完毕");
        
        await switchAcount(17);
        await registerStudent(2, "student_8", accounts[17]);
        console.log("student_8 (class_2) 注册完毕");

        await switchAcount(18);
        await registerStudent(2, "student_9", accounts[18]);
        console.log("student_9 (class_2) 注册完毕");
        
        await switchAcount(19);
        await registerStudent(2, "student_10", accounts[19]);
        console.log("student_10 (class_2) 注册完毕");
        
        console.log("Registering supervisors...");
        await switchAcount(20);
        await registerSupervisor("supervisor_1", accounts[20]);
        console.log("supervisor_1 注册完毕");

        await switchAcount(21);
        await registerSupervisor("supervisor_2", accounts[21]);
        console.log("supervisor_2 注册完毕");

        await switchAcount(0);
}

async function switchAcount(Index){
    currentSigner = provider.getSigner(Index);
    contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
}

async function getTeacherCourseSuitabilityByPython(teacherId){
    // 获取教师研究方向
    let reseacherDirection = await contract.getTeacherResearchDirection(teacherId);
    //获取教师每个方向的论文数量
    let paperCount = await contract.getTeacherPaperCount(teacherId);
    // 获取教师的课程ID
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => id.toNumber());
    // 获取所有的课程名字
    let courseName = [];
    // 上个学期的课程评分
    let courseScore = [];
    for(let index = 0; index < courseIds.length; index++){
        let course = await contract.courses(courseIds[index]);
        courseName.push(course.name)
        let totalcourseScore = (await contract.courseScores(courseIds[index])).totalScore;
        totalcourseScore = Number(totalcourseScore);
        if(totalcourseScore == 0) totalcourseScore = 100;
        courseScore.push(totalcourseScore)
    }
    paperCount = paperCount.map(id => id.toNumber());
    // 获取教师对所有课程的适合程度
    let result = await sendMultipleData(courseName, reseacherDirection, paperCount);

    for (const key in result) {
        if (result.hasOwnProperty(key)) {
            // 将字符串转换为浮点数
            const floatValue = parseFloat(result[key]);
            // 检查是否为有效数字
            if (!isNaN(floatValue)) {
                // 转换为整数（这里使用 Math.floor 向下取整）
                result[key] = Math.floor(floatValue);
            }
        }
    }
    // console.log(courseName)
    // console.log(result)
    // 按照 courseName 的顺序排列 result
    const orderedResults = [];
    for (const course of courseName) {
    if (result.hasOwnProperty(course)) {
        orderedResults.push(result[course]);
    } else {
        console.error(`课程 "${course}" 在 result 中不存在`);
    }
    }

    // console.log(orderedResults);
    // console.log(courseScore)
    let table = {}
    for(let index = 0; index < orderedResults.length; index++){
        orderedResults[index] = Math.floor(0.8 * orderedResults[index] + 0.2 * courseScore[index]);
        table[courseName[index]] = orderedResults[index];
    }
    await contract.setAllTeacherCourseSuitability(teacherId, orderedResults);
    console.table(table);
    return {
        code: 0,
        message: `已经通过画像评分算法计算得到教师 ${teacherId} 对课程的适合程度，并保存`
    }
}

module.exports = {
    initializeData,
    switchUser,
    initializeCourse,
    register,
    getTeacherCourseSuitabilityByPython,
}