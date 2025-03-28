const { ethers } = require("ethers");
const fs = require("fs");
require('dotenv').config({ path: './interact/.env' });
const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:7545");

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
// 创建合约实例
let contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
let voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
let classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);



// 自动为老师分配课程（适合度≥50且意愿≥60）并更新结构体
async function init_TeacherCourses() {
    const allocationResults = [];
    const teacherIds = (await contract.getTeacherIds()).map(id => id.toNumber());
    const courseIds = (await contract.getCourseIds()).map(id => id.toNumber());

    for (const courseId of courseIds) {
        const course = await contract.courses(courseId);
        if (course.isAgentSuitable) continue; // 跳过智能体专属课程

        for (const teacherId of teacherIds) {
            const suitability = (await contract.getTeacherSuitability(teacherId, courseId)).toNumber();
            const preference = (await contract.getPreference(teacherId, courseId)).toNumber();

            if (suitability >= 50 && preference >= 60) {
                await contract.addTeacherAssignedCourses(teacherId, courseId);
                await contract.addCourseAssignedTeacherId(courseId, teacherId);
                allocationResults.push({ teacherId, courseId });
            }
        }
    }
    return allocationResults;
}

//为Agent分配课程 （适合度≥50
async function init_AgentCourses() {
    const allocationResults = [];
    const agentIds = (await contract.getAgentIds()).map(id => id.toNumber());
    const courseIds = (await contract.getCourseIds()).map(id => id.toNumber());

    for (const courseId of courseIds) {
        const course = await contract.courses(courseId);
        if (!course.isAgentSuitable) continue; // 只处理智能体专属课程

        for (const agentId of agentIds) {
            const suitability = (await contract.getAgentSuitability(agentId, courseId)).toNumber();

            if (suitability >= 50) { 
                await contract.addAgentAssignedCourses(agentId, courseId);
                await contract.addCourseAssignedAgentId(courseId, agentId);
                allocationResults.push({ agentId, courseId });
            }
        }
    }
    return allocationResults;
}

async function printAssignments() { //查看目前的课程分配情况
    const courseIds = (await contract.getCourseIds()).map(id => id.toNumber());
    const assignments = [];

    for (const courseId of courseIds) {
        // 获取课程基础信息（id, name, importance, isAgentSuitable）
        const course = await contract.courses(courseId);
        const courseName = course[1];
        const importance = course[2].toNumber();
        const isAgentSuitable = course[3] ? 'Yes' : 'No';

        // 获取分配的教师和智能体ID
        const assignedTeachers = (await contract.getCoursesAssignedTeacher(courseId)).map(t => t.toNumber());
        const assignedAgents = (await contract.getCoursesAssignedAgent(courseId)).map(a => a.toNumber());

        // 构建分配信息
        let assignedTo = [];
        if (assignedTeachers.length > 0) {
            assignedTo.push(`教师: ${assignedTeachers.join(', ')}`);
        }
        if (assignedAgents.length > 0) {
            assignedTo.push(`智能体: ${assignedAgents.join(', ')}`);
        }
        if (assignedTo.length === 0) {
            assignedTo.push('Unassigned');
        }

        assignments.push({
            "课程ID": courseId,
            "课程名": courseName,
            "课程重要程度": importance,
            "是否适合智能体": isAgentSuitable,
            "分配对象": assignedTo.join(' | ')
        });
    }

    // 打印表格
    console.log('\n目前课程的分配情况:');
    console.table(assignments);
}



/**
 * 获取指定教师的课程性价比数据（适合度/工资）
 * @param {number} targetTeacherId - 要查询的教师ID
 * @returns {Promise<{code: number, data?: {teacherId: number, salary: number, costPerformance: number[]}, message?: string}>}
 */
async function getTeacherCostPerformance(targetTeacherId) { //获取某个教师的性价比数组
    try {
        // 参数验证
        if (!Number.isInteger(targetTeacherId) || targetTeacherId <= 0) {
            throw new Error('教师ID必须为正整数');
        }

        // 获取课程ID列表
        const courseIds = (await contract.getCourseIds())
            .map(id => id.toNumber())
            .sort((a, b) => a - b);

        // 获取教师工资
        const salary = (await contract.teachers(targetTeacherId)).value.toNumber();
        if (salary === 0) throw new Error('教师工资不能为0');

        // 获取所有课程的适合度
        const suitabilities = await Promise.all(
            courseIds.map(courseId => 
                contract.getTeacherSuitability(targetTeacherId, courseId)
            )
        );

        // 计算性价比数组
        const costPerformance = suitabilities.map(s => 
            Number((s.toNumber() / salary).toFixed(4))
        );

        // 控制台输出
        console.log(`\n教师 ${targetTeacherId} 的课程性价比：`);
        courseIds.forEach((courseId, index) => {
            console.log(`课程 ${courseId}: ${costPerformance[index]}`);
        });

        return {
            code: 0,
            data: {
                teacherId: targetTeacherId,
                salary,
                costPerformance
            }
        };

    } catch (error) {
        // 错误处理
        let code = -1;
        if (error.message.includes("revert")) code = 404;  // 教师不存在
        if (error.message.includes("invalid arrayify")) code = 400;  // 数据格式错误

        console.error(`错误：${error.message}`);
        return { code, message: error.message };
    }
}

/**
 * 获取指定教师的课程性价比数据（适合度/工资）
 * @param {number} targetAgentId - 要查询的教师ID
 * @returns {Promise<{code: number, data?: {agentId: number, salary: number, costPerformance: number[]}, message?: string}>}
 */
async function getAgentCostPerformance(targetAgentId) { //获取某个智能体的性价比数组
    try {
        // 参数验证
        if (!Number.isInteger(targetAgentId) || targetAgentId <= 0) {
            throw new Error('ID必须为正整数');
        }

        // 获取课程ID列表
        const courseIds = (await contract.getCourseIds())
            .map(id => id.toNumber())
            .sort((a, b) => a - b);

        // 获取智能体工资
        const salary = (await contract.agents(targetAgentId)).value.toNumber();
        if (salary === 0) throw new Error('智能体工资不能为0');

        // 获取所有课程的适合度
        const suitabilities = await Promise.all(
            courseIds.map(courseId => 
                contract.getAgentSuitability(targetAgentId, courseId)
            )
        );

        // 计算性价比数组
        const costPerformance = suitabilities.map(s => 
            Number((s.toNumber() / salary).toFixed(4))
        );

        // 控制台输出
        console.log(`\n智能体 ${targetAgentId} 的课程性价比：`);
        courseIds.forEach((courseId, index) => {
            console.log(`课程 ${courseId}: ${costPerformance[index]}`);
        });

        return {
            code: 0,
            data: {
                agentId: targetAgentId,
                salary,
                costPerformance
            }
        };

    } catch (error) {
        // 错误处理
        let code = -1;
        if (error.message.includes("revert")) code = 404;  // 教师不存在
        if (error.message.includes("invalid arrayify")) code = 400;  // 数据格式错误

        console.error(`错误：${error.message}`);
        return { code, message: error.message };
    }
}




// 创建课程提案 手动投票的
async function createProposalForCourse() {
    let highestImportance = 0;
    let selectedCourseId = 0;

    // 遍历所有课程，找到尚未分配且重要程度最高的课程
    let course;
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => id.toNumber());
    let teacherIds = await contract.getTeacherIds();
    teacherIds = teacherIds.map(id => id.toNumber());

    for (let courseIndex = 0; courseIndex < courseIds.length; courseIndex++) {
        let courseId = courseIds[courseIndex];
        course = await contract.courses(courseId);
        let AssignedTeacherArray = await contract.getCoursesAssignedTeacher(courseId);
        let AssignedAgentArray = await contract.getCoursesAssignedAgent(courseId);
        if (AssignedAgentArray.length==0 && AssignedTeacherArray.length==0 && course.importance > highestImportance) {
            highestImportance = course.importance.toNumber();
            selectedCourseId = courseId;
        }
    }
    if(selectedCourseId == 0) {
        return {
            code: 0,
            message: "课程全部分配完毕"
        }
    }
    let candidateTeachers = [];

    // 遍历所有教师，筛选出适合的教师
    for (let teacherIndex = 0; teacherIndex < teacherIds.length; teacherIndex++) {
        let teacherId = teacherIds[teacherIndex];
        let assignedCourses = await contract.getTeacherAssignedCourses(teacherId);
        if (assignedCourses.length < 2) {
            // 将教师ID和偏好程度作为元组存储
            candidateTeachers.push(teacherId);
        }
    }
    let topThreeTeachers = new Array(2);
    // 按偏好程度排序，选择前二名
    if (candidateTeachers.length > 0) {
        // 冒泡排序
        for (let i = 0; i < candidateTeachers.length; i++) {
            for (let j = i + 1; j < candidateTeachers.length; j++) {
                let teacherId1 = candidateTeachers[i];
                let teacherId2 = candidateTeachers[j];
                
                let preference1 = await contract.getPreference(teacherId1, selectedCourseId);
                let preference2 = await contract.getPreference(teacherId2, selectedCourseId);
                // console.log("preference1: ", preference1);
                // console.log("preference2: ", preference2);
                if (preference1 < preference2) {
                    // 交换
                    let temp = candidateTeachers[i];
                    candidateTeachers[i] = candidateTeachers[j];
                    candidateTeachers[j] = temp;
                }
            }
        }
        console.log("candidateTeachers: ", candidateTeachers);

        // 对符合条件的老师进行排序
        // 取前二名
        
        for (let i = 0; i < 2 && i < candidateTeachers.length; i++) {
            if(candidateTeachers[i] != 0){
                topThreeTeachers[i] = candidateTeachers[i]; // 这里2是候选老师的数量
            }
        }

        // 调用提案投票合约的创建提案功能
        let proposalId = await voteContract.createChooseTeacherProposal("createProposal", selectedCourseId, topThreeTeachers, 7);
        // emit ProposalCreated(proposalId, selectedCourseId, topThreeTeachers);
        let studentProposalId = await classContract.createProposal("createStudentsProposal", selectedCourseId, topThreeTeachers);
        // emit ProposalCreated(studentProposalId, selectedCourseId, topThreeTeachers);
        console.log("Proposal created for course " + selectedCourseId);
        console.log("Proposal created for topThreeTeachers: " , topThreeTeachers);
        
    }
    return {
        code: 0,
        message: "成功为课程 "+ selectedCourseId +" 创建提案",
        topThreeTeachers: topThreeTeachers
    }
}

// 机器投票 一次一门
async function machineVoting() {
    // 找到未分配且重要性最高的课程
    let highestImportance = 0;
    let selectedCourseId = 0;
    let course;
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => id.toNumber());
    for (let courseIndex = 0; courseIndex < courseIds.length; courseIndex++) {
        let courseId = courseIds[courseIndex];
        course = await contract.courses(courseId);
        let AssignedTeacherArray = await contract.getCoursesAssignedTeacher(courseId);
        let AssignedAgentArray = await contract.getCoursesAssignedAgent(courseId);
        // console.log(courseId, AssignedTeacherArray, AssignedAgentArray)
        if (AssignedAgentArray.length == 0 && AssignedTeacherArray.length == 0 && course.importance > highestImportance) {
            highestImportance = course.importance;
            selectedCourseId = courseId;
        }
    }
    if (selectedCourseId == 0) {
        return {
            code: 0,
            message: "课程全部分配完毕"
        }
    }
    // 计算教师总权重和候选教师数量
    let totalWeight = 0;

    let classweights = await classContract.getClassWeight();
    classweights = classweights.toNumber();
    totalWeight = totalWeight + classweights;
    let teacher;
    let teacherId;
    let teacherIds = await contract.getTeacherIds();
    teacherIds = teacherIds.map(id => id.toNumber());
    let teacherCount = teacherIds.length;
    
    for (let teacherIndex = 0; teacherIndex < teacherIds.length; teacherIndex++) {
        teacherId = teacherIds[teacherIndex];
        teacher = await contract.teachers(teacherId);
        totalWeight = totalWeight + teacher.suitabilityWeight.toNumber();
    }

    // 找到对课程评分最高的教师
    let highestScore = 0;
    let selectedTeacherId = 0;
    let maxCoursePreferences = 0;
    let classCount = await classContract.classCount();
    for (let teacherIndex = 0; teacherIndex < teacherIds.length; teacherIndex++) {
        let teacherId = teacherIds[teacherIndex];
        teacher = await contract.teachers(teacherId);
        let assignedCourses = await contract.getTeacherAssignedCourses(teacherId);
        if (assignedCourses.length < 2) {
            let teacherWeight = totalWeight - teacher.suitabilityWeight.toNumber();
            let suit = await contract.getTeacherSuitability(teacherId, selectedCourseId);
            suit = suit.toNumber();
            let preference = await contract.getPreference(teacherId, selectedCourseId);
            preference = preference.toNumber();
            let score = teacherWeight * suit + (10 * (teacherCount + classCount - 1) - teacherWeight) * preference;
            
            if (score > highestScore) {
                highestScore = score;
                selectedTeacherId = teacherId;
                maxCoursePreferences = preference;
            } else if (score == highestScore) {
                if (preference > maxCoursePreferences) {
                    maxCoursePreferences = preference;
                    selectedTeacherId = teacherId;
                }
            }
        }
    }

    if(selectedTeacherId == 0) {
        return {
            code: 0,
            message: "没有合适的老师"
        } 
    }
 
    // emit CourseAssignedToTeacher(selectedCourseId, selectedTeacherId);
    let candidateTeachers = await getCandidateTeachers();
    candidateTeachers = candidateTeachers.data;
    let scores = await getTeachersScores(selectedCourseId);
    scores = scores.data;
    let proposalId = await voteContract.createMachineVoteProposal("MachineProposal", selectedCourseId, candidateTeachers, scores);
    await classContract.createProposal("createProposal", selectedCourseId, candidateTeachers);
    // // emit MachineProposal(proposalId, selectedCourseId, candidateTeachers, getTeachersScores(selectedCourseId));
    // // 创建提案并分配课程
    let result = await AssignedTeacherCourse(selectedTeacherId, selectedCourseId);
    // console.log(result)
    return {
        code: 0,
        message: "成功为课程 "+ selectedCourseId +" 分配教师 "+ selectedTeacherId
    }
}

// 获取最不重要的智能体课程
async function getLeastSuitableAgentCourse() {
    let leastSuitableCourseId = 0;
    let minSuitability = 1000000;
    let course;
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => id.toNumber());
    for (let i = 0; i < courseIds.length; i++) {
        let courseId = courseIds[i];
        course = await contract.courses(courseId)
        if (course.isAgentSuitable) {
            let AssignedAgentCourses = await contract.getCoursesAssignedAgent(courseId);
            let suitability = 10000;
            if (AssignedAgentCourses.length == 1) {
                let agentId = AssignedAgentCourses[0];
                agentId = agentId.toNumber();
                suitability = await contract.getAgentSuitability(agentId, courseId);
                suitability = suitability.toNumber();
            }else if(AssignedAgentCourses.length > 1){
                return {
                    code: -1,
                    message: "课程 " + courseId + " 拥有者超过一个"
                }
            }
            
            if (suitability < minSuitability) {
                minSuitability = suitability;
                leastSuitableCourseId = courseId;
            }
        }
    }

    return {
        code: 0,
        message: "成功获取最不重要的智能体课程",
        data: Number(leastSuitableCourseId)
    }
}

// 给没有课程的老师机器投票
async function checkAndMachineVoteForTeacher(){
    let teacherWithoutCourse = [];
    // 遍历所有老师，找到没有课程的老师
    let teacher;
    let teacherIds = await contract.getTeacherIds();
    teacherIds = teacherIds.map(id => id.toNumber());
    for (let index = 0; index < teacherIds.length; index++) {
        let teacherId = teacherIds[index];
        teacher = await contract.teachers(teacherId);
        let assignedCourses = await contract.getTeacherAssignedCourses(teacherId);
        if (assignedCourses.length == 0) {
            teacherWithoutCourse.push(teacherId);
        }
    }

    if (teacherWithoutCourse.length == 0) {
        // 所有老师都有课程，结束
        return {
            code: 0,
            message: "所有老师都有课程"
        }
    }

    // 获取智能体的课程作为被分配的课程
    let result = await getLeastSuitableAgentCourse();
    let candidateCourses = result.data;

    // 计算教师总权重和候选教师数量
    let totalWeight = 0;
    let classweights = await classContract.getClassWeight();
    classweights = classweights.toNumber();

    totalWeight = totalWeight + classweights;

    for (let index = 0; index < teacherIds.length; index++) {
        let teacherId = teacherIds[index];
        teacher = await contract.teachers(teacherId);
        totalWeight = totalWeight + teacher.suitabilityWeight.toNumber();
    }

    // 找到对课程评分最高的教师
    // 找到对课程评分最高的教师
    let highestScore = 0;
    let selectedTeacherId = 0;
    let maxCoursePreferences = 0;
    let teacherCount = teacherIds.length;
    const classCount = await contract.classCount();
    for (let i = 0; i < teacherWithoutCourse.length; i++) {
        teacher = await contract.teachers(teacherWithoutCourse[i]);
        let assignedCourses = await contract.getTeacherAssignedCourses(teacherWithoutCourse[i]);
        if (assignedCourses.length < 2) {
            let teacherWeight = totalWeight - teacher.suitabilityWeight.toNumber();
            let suit = await contract.getTeacherSuitability(teacherWithoutCourse[i], candidateCourses);
            suit = suit.toNumber();
            let preference = await contract.getPreference(teacherWithoutCourse[i], candidateCourses);
            preference = preference.toNumber();
            let score = teacherWeight * suit + (10 * (teacherCount + classCount - 1) - teacherWeight) * preference;
            
            if (score > highestScore) {
                highestScore = score;
                selectedTeacherId = teacherWithoutCourse[i];
                maxCoursePreferences = preference;
            } else if (score == highestScore) {
                if (preference > maxCoursePreferences) {
                    maxCoursePreferences = preference;
                    selectedTeacherId = teacherWithoutCourse[i];
                }
            }
        }
    }
    if (selectedTeacherId == 0) {
        return {
            code: -1,
            message: "没有合适的老师"
        }
    }

    // emit CourseAssignedToTeacher(candidateCourses, selectedTeacherId);
    let scores = await getTeachersScores(candidateCourses);
    scores = scores.data;
    let proposalId = voteContract.createMachineVoteProposal("MachineProposal", candidateCourses, teacherWithoutCourse, scores);
    // emit MachineProposal(proposalId, candidateCourses, teacherWithoutCourse, getTeachersScores(candidateCourses));
    // 创建提案并分配课程
    console.log("selectedTeacherId: ", selectedTeacherId);
    console.log("candidateCourses: ", candidateCourses);
    await assignCourseToTeacherWithoutCourse(candidateCourses, selectedTeacherId);
}

// 给没有课程的老师创建投票提案
async function checkAndCreateProposalForTeacher(){
    let teacherWithoutCourse = [];
    // 遍历所有老师，找到没有课程的老师
    let teacherIds = await contract.getTeacherIds();
    teacherIds = teacherIds.map(id => id.toNumber());
    let teacher;
    let teacherId;
    for (let index = 0; index < teacherIds.length; index++) {
        teacherId = teacherIds[index];
        teacher = await contract.teachers(teacherId);
        let assignedCourses = await contract.getTeacherAssignedCourses(teacherId);
        if (assignedCourses.length == 0) {
            teacherWithoutCourse.push(teacherId);
        }
    }
    console.log("teacherWithoutCourse: ", teacherWithoutCourse);
    if (teacherWithoutCourse.length == 0) {
        // 所有老师都有课程，结束
        return {
            code: 0,
            message: "所有老师都有课程"
        };
    }

    // 获取所有智能体的课程作为候选课程
    let candidateCourse = await getLeastSuitableAgentCourse();
    candidateCourse = candidateCourse.data;
    // 创建提案
    let proposalId = voteContract.createChooseTeacherProposal("Create proposals for teachers without courses", candidateCourse, teacherWithoutCourse, 7);
    let studentProposalId = classContract.createProposal("createProposal", candidateCourse, teacherWithoutCourse);
    // emit ProposalCreated(proposalId, candidateCourse, teacherWithoutCourse);
    // emit ProposalCreated(studentProposalId, candidateCourse, teacherWithoutCourse);
    return {
        code: 0,
        message: "成功为没有课程的老师创建提案",
        candidateCourse: candidateCourse,
        teacherWithoutCourse: teacherWithoutCourse
    }
}

// 分配智能体课程
async function allocateAgentCourses(){
    let allocatedCount = 0;
    // 遍历所有课程，找到适合智能体的课程
    let course;
    let agent;
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => id.toNumber());
    let agentIds = await contract.getAgentIds();
    agentIds = agentIds.map(id => id.toNumber());
    for (let courseIndex = 0; courseIndex < courseIds.length; courseIndex++) {
        let courseId = courseIds[courseIndex];
        course = await contract.courses(courseId);
        let assignedTeacherId = await contract.getCoursesAssignedTeacher(courseId);
        let assignedAgentId = await contract.getCoursesAssignedAgent(courseId);
        if (!course.isAgentSuitable || assignedTeacherId.length != 0 || assignedAgentId.length != 0) continue;

        let bestAgentId = 0;
        let maxSuitability = -1;

        // 遍历所有教师，找到最适合的智能体教师
        for (let agentIndex = 0; agentIndex < agentIds.length; agentIndex++) {
            let agentId = agentIds[agentIndex];
            agent = await contract.agents(agentId);
            let assignedCourses = await contract.getAgentAssignedCourses(agentId);
            if (assignedCourses.length >= 2) continue; // 跳过非智能体或已满额的教师
            let suitability = await contract.getAgentSuitability(agentId, courseId);
            suitability = suitability.toNumber();
            if (suitability > maxSuitability) {
                maxSuitability = suitability;
                bestAgentId = agentId;
            }
        }
        console.log("bestAgentId: ", bestAgentId);

        // 分配课程给最适合的智能体教师
        if (bestAgentId != 0) {
            await contract.addCourseAssignedAgentId(courseId, bestAgentId);
            await contract.addAgentAssignedCourses(bestAgentId, courseId);
            console.log("分配课程给智能体教师 " + bestAgentId + " 课程 " + courseId);
            allocatedCount++;
        }
    }
    return {
        code: 0,
        message: "成功分配智能体课程"
    }
}

// 一门课获取所有老师分数，机器投票使用 (allreadfinished, To test functional)
async function getTeachersScores(courseId) {
    let teachersScores = [];
    let totalWeight = 0;

    let classWeight = await classContract.getClassWeight();
    totalWeight = totalWeight + classWeight.toNumber();
    let teacherIds = await contract.getTeacherIds();
    teacherIds = teacherIds.map(id => id.toNumber());

    let teacherCount = await contract.teacherCount();
    teacherCount = teacherCount.toNumber();
    let classCount = await contract.classCount();
    classCount = classCount.toNumber();

    for (let teacherId of teacherIds) {
        let teacher = await contract.teachers(teacherId);
        totalWeight = totalWeight + teacher.suitabilityWeight.toNumber();
    }
    for (let teacherId of teacherIds) {
        let teacher = await contract.teachers(teacherId);
        let assignedCourse = await contract.getTeacherAssignedCourses(teacherId);
        if(assignedCourse.length < 2){
            let teacherWeight = totalWeight - teacher.suitabilityWeight.toNumber();
            let courseSuitability = await contract.getTeacherSuitability(teacherId, courseId);
            let coursePreference = await contract.getPreference(teacherId, courseId);
            let teacherScore = teacherWeight * courseSuitability + (10 * (teacherCount + classCount -1) - teacherWeight) * coursePreference;
            teachersScores.push(teacherScore);
        }
    }
    return {
        code: 0,
        message: 'get teacher scores successfully',
        data: teachersScores
    }
}

// 获取课程少于2的老师 (allreadfinished, To test functional)
async function getCandidateTeachers() {
    let candidateTeachers = [];
    let teacherIds = await contract.getTeacherIds();
    teacherIds = teacherIds.map(id => id.toNumber());

    for(let teacherId of teacherIds){
        let courses = await contract.getTeacherAssignedCourses(teacherId);
        if(courses.length < 2){
            candidateTeachers.push(teacherId);
        }
    }

    return {
        code: 0,
        message: 'get candidate teachers successfully',
        data: candidateTeachers
    }
}

// 学生评分 (allreadfinished, To test functional)
async function changeSuitabilitybyStudent(courseAverageScore) {
    let courses = await contract.getCourseIds();
    courses = courses.map(id => id.toNumber());
    let Index = 0;
    for(let courseId of courses){
        let assignedTeacher = await contract.getCoursesAssignedTeacher(courseId);
        let assignedAgent = await contract.getCoursesAssignedAgent(courseId);
        if(assignedTeacher.length + assignedAgent.length != 1){
            return{
                code: -1,
                message: `course ${courseId} must be assigned to one teacher`
            }
        }
        if(assignedTeacher.length != 0){
            let teacherId = assignedTeacher[0];
            await contract.setTeacherCourseSuitability(teacherId, courseId, courseAverageScore[Index]);
        }else{
            let agentId = assignedAgent[0];
            await contract.setAgentCourseSuitability(agentId, courseId, courseAverageScore[Index]);
        }
        Index++;
    }
    return{
        code: 0,
        message: `All teacher/agent suitability have been changed by student average score successfully`
    }
}

// 把智能体课程分给老师 (allreadfinished, To test functional)
async function assignCourseToTeacherWithoutCourse(courseId, teacherId) {
    let assignedTeacher = await contract.getCoursesAssignedTeacher(courseId);
    let assignedAgent = await contract.getCoursesAssignedAgent(courseId);
    if(assignedTeacher.length + assignedAgent.length != 1){
        return{
            code: -1,
            message: `course ${courseId} must be assigned to one teacher`
        }
    }
    if(assignedTeacher.length == 1){
        await removeTeacherCourse(teacherId, courseId);
    }else{
        await removeAgentCourse(teacherId, courseId);
    }
    await AssignedTeacherCourse(teacherId, courseId);
    
    return{
        code: 0,
        message: `Course ${courseId} has been assigned to teacher ${teacherId} successfully`
    }
    
}

// 结束投票并分配课程
async function endProposalAndAssignCourseforWithoutteacher(proposalId) {
    let [teacherId, courseId] = await voteContract.endVoteChooseCourse(proposalId);
    await assignCourseToTeacherWithoutCourse(courseId, teacherId);
    return {
        code: 0,
        message: `proposal ${proposalId} has been finished and course has been assigned successfully`
    }
}

// 把智能体课程分给老师 (allreadfinished, To test functional)
async function assignCourseToTeacher(courseId, teacherId) {
    let assignedTeacherIds = await contract.getCoursesAssignedTeacher(courseId);
    if(assignedTeacherIds.length > 0){
    return {
        code: -1,
        message: "课程 " + courseId + " 已经被分配"
    }
    }
    await contract.addCourseAssignedTeacherId(courseId, teacherId);
    await contract.addTeacherAssignedCourses(teacherId, courseId);
    return {
        code: 0,
        message: "课程 " + courseId + " 分配给教师 " + teacherId
    }
}

// 结束投票并分配课程
async function endProposalAndAssignCourse(proposalId) {
    let [teacherId, courseId] = await voteContract.endVoteChooseTeacher(proposalId);
    teacherId = teacherId.toNumber();
    courseId = courseId.toNumber();
    await assignCourseToTeacher(courseId, teacherId);
    return {
        code: 0,
        message: `proposal ${proposalId} has been finished and course ${courseId} has been assigned to teacher ${teacherId} successfully`
    }
}

// 创建课程
async function initializeCourse(name, Importance, IsAgentSuitable) {
    let courseCount = await contract.courseCount();
    courseCount = courseCount.toNumber();
    courseCount = courseCount + 1;
    // console.log(courseCount);
    await contract.setCourseCount(courseCount);
    await contract.setCourseId(courseCount);
    await contract.setCourseName(courseCount, name);
    await contract.setCourseImportance(courseCount, Importance);
    await contract.setCourseIsAgentSuitable(courseCount, IsAgentSuitable);

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

// 注册班级
async function registerClass(name, addr) {
    let isregister = await contract.addressToClassId(addr);
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
    await classContract.addClass(name);
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

// 为老师分配课程
async function AssignedTeacherCourse(teacherId, courseId){
    // 获取教师已分配的课程
    let courses = await contract.getTeacherAssignedCourses(teacherId);
    courses = courses.map(id => id.toNumber());

    // 判断 courseId 是否在 courses 数组中
    if (courses.includes(courseId)) {
        // console.log(`Course ${courseId} is assigned to teacher ${teacherId}`);
        return {
            code: -1,
            message: `Course ${courseId} Already Assigned to teacher ${teacherId}`,
        };
    }
    await contract.addTeacherAssignedCourses(teacherId, courseId);
    await contract.addCourseAssignedTeacherId(courseId, teacherId);
    return {
        code: 0,
        message: `Course ${courseId} Assigned to teacher ${teacherId} successfully`,
    };
}

// 给智能体分配课程
async function AssignedAgentCourse(agentId, courseId){
    // 获取教师已分配的课程
    let courses = await contract.getAgentAssignedCourses(agentId);
    courses = courses.map(id => id.toNumber());

    // 判断 courseId 是否在 courses 数组中
    if (courses.includes(courseId)) {
        // console.log(`Course ${courseId} is assigned to agent ${agentId}`);
        return {
            code: -1,
            message: `Course ${courseId} Already Assigned to agent ${agentId}`,
        };
    }
    await contract.addAgentAssignedCourses(agentId, courseId);
    await contract.addCourseAssignedAgentId(courseId, agentId);

    return {
        code: 0,
        message: `Course ${courseId} Assigned to agent ${agentId} successfully`,
    };
}

// 为老师移除课程
async function removeTeacherCourse(teacherId, courseId){
    // 获取教师已分配的课程
    let courses = await contract.getTeacherAssignedCourses(teacherId);
    courses = courses.map(id => id.toNumber());

    // 判断 courseId 是否在 courses 数组中
    if (!courses.includes(courseId)) {
        // console.log(`Course ${courseId} is not assigned to teacher ${teacherId}`);
        return {
            code: -1,
            message: `Course ${courseId} not Assigned to teacher ${teacherId}`,
        };
    }
    await contract.removeTeacherAssignedCourses(teacherId, courseId);
    await contract.removeCourseAssignedTeacherId(courseId, teacherId);

    return {
        code: 0,
        message: `Course ${courseId} removed from teacher ${teacherId} successfully`,
    };
}

// 为智能体移除课程
async function removeAgentCourse(agentId, courseId){    // 获取教师已分配的课程
    let courses = await contract.getAgentAssignedCourses(agentId);
    courses = courses.map(id => id.toNumber());

    // 判断 courseId 是否在 courses 数组中
    if (!courses.includes(courseId)) {
        // console.log(`Course ${courseId} is not assigned to agent ${agentId}`);
        return {
            code: -1,
            message: `Course ${courseId} not Assigned to agent ${agentId}`,
        };
    }
    await contract.removeAgentAssignedCourses(agentId, courseId);
    await contract.removeCourseAssignedAgentId(courseId, agentId);

    return {
        code: 0,
        message: `Course ${courseId} removed from agent ${agentId} successfully`,
    };
}

async function switchAcount(Index){
    currentSigner = provider.getSigner(Index);
    contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
}

// 创建冲突提案
async function createConflictProposal() {
    let courseIds = await contract.getCourseIds();
    let courses = [];
    let candidateId = [];
    let selectedCourseId = 0;
    for (let courseIndex = 0; courseIndex < courseIds.length; courseIndex++) {
        let course = await contract.courses(courseIds[courseIndex]);
        // 将 importance 属性转换为数字
        course.importance = course.importance.toNumber();
        courses.push(course);
    }
    // 按照 importance 属性对课程进行排序（降序）
    courses.sort((a, b) => b.importance - a.importance);
    for (let courseIndex = 0; courseIndex < courses.length; courseIndex++){
        let courseId = courses[courseIndex].id;
        courseId = courseId.toNumber();
        
        let teachers = await contract.getCoursesAssignedTeacher(courseId);
        teachers = teachers.map(id => id.toNumber());

        if (teachers.length > 1){
            selectedCourseId = courseId;

            let candidateTeachers = [];

            for(let teacherIndex = 0; teacherIndex < teachers.length; teacherIndex++){
                let teacherId = teachers[teacherIndex];
                let reallyTeacher = await contract.getTeacherReallyAssignedCourses(teacherId);
                if(reallyTeacher.length < 2)
                    candidateTeachers.push(teacherId);
            }
            candidateId = candidateTeachers;
            break;
        }
    }

    let tx = await voteContract.createChooseTeacherProposal("create Conflict Proposal", selectedCourseId, candidateId, 9);//7老师+2班级
    let receipt = await tx.wait();
    const event = receipt.events.find(event => event.event === "ProposalCreated");
    let { proposalId, description } = event.args;

    return {
        code: 0,
        message: `Create Conflict Proposal successfully, Proposal Id: ${proposalId}`,
        proposalId: proposalId,
        selectedCourseId : selectedCourseId,
        candidateTeacherId : candidateId
    };
}

// 教师投票
async function teacherVote(teacherAddress, proposalId, voteForId){
    voteContract.voteChooseTeacher(teacherAddress, proposalId, voteForId);
    let teacherId = await contract.addressToTeacherId(teacherAddress);
    return {
        code: 0,
        message: `teacher ${teacherId} Vote for teacher ${voteForId} successfully`,
    }
}

// 智能体投票
async function agentVote(agentAddress, proposalId){
    // 计算每个老师的性价比
    let [voteIds, voteForId] = await voteContract.getVotedIds(proposalId);
    voteIds = voteIds.map(id => id.toNumber());

    let max_Cost_effectiveness = 0;
    let chooseId = 0;
    for(let candidateIndex = 0; candidateIndex < voteIds.length; candidateIndex++){
        let candidateId = voteIds[candidateIndex];
        let candidate = await contract.teachers(candidateId);
        let value = candidate.value;
        value = value.toNumber();

        let suitability = await contract.getTeacherSuitability(candidateId, voteForId);
        let Cost_effectiveness = suitability/value;

        if(Cost_effectiveness > max_Cost_effectiveness){
            max_Cost_effectiveness = Cost_effectiveness;
            chooseId = candidateId;
        }
    }

    voteContract.voteChooseTeacher(agentAddress, proposalId, chooseId);
    let agentId = await contract.addressToAgentId(agentAddress);
    return {
        code: 0,
        message: `agent ${agentId} Vote for teacher ${chooseId} successfully`,
    }
}

// 结束冲突投票
async function endConfictProposal(proposalId){
    let [winningTeacherId, courseId] = await voteContract.endVoteChooseCourse(proposalId);
    winningTeacherId = winningTeacherId.toNumber();
    courseId = courseId.toNumber();

    let allTeacher = await contract.getCoursesAssignedTeacher(courseId);
    allTeacher = allTeacher.map(id => id.toNumber());
    for(let teacherId of allTeacher){
        if(teacherId != winningTeacherId){
            let remove_result = await removeTeacherCourse(teacherId, courseId);
            console.log(remove_result);
        }
    }
    await contract.addTeacherReallyAssignedCourses(winningTeacherId, courseId);
    return {
        code: 0,
        message: `End Conflict Proposal successfully, Winning Teacher Id: ${winningTeacherId}, Course Id: ${courseId}`,
    }
}

async function initializeData() {
    const accounts = await web3.eth.getAccounts();
    // 初始化课程
    console.log("Initializing courses...");
    await initializeCourse("c1", 3, true);
    await initializeCourse("c2", 7, true);
    await initializeCourse("c3", 1, true);
    await initializeCourse("c4", 9, false);
    await initializeCourse("c5", 5, false);
    await initializeCourse("c6", 2, false);
    await initializeCourse("c7", 8, false);
    await initializeCourse("c8", 4, false);
    await initializeCourse("c9", 6, false);
    await initializeCourse("c10", 10, false);

    // 注册教师
    console.log("Registering teachers...");
    await switchAcount(1);
    await registerTeacher("teacher_1", accounts[1]);
    await contract.setTeacherValue(1, 800);
    await contract.setTeacherSuitabilityWeight(1,1);
    await contract.setAllTeacherCourseSuitability(1, [26,44,65,88,40,37,79,92,14,87]);
    await contract.setAllTeacherCoursePreferences(1, [35,54,76,27,93,48,64,17,86,70]);

    await switchAcount(2);
    await registerTeacher("teacher_2", accounts[2]);
    await contract.setTeacherValue(2, 1000);
    await contract.setTeacherSuitabilityWeight(2,2);
    await contract.setAllTeacherCourseSuitability(2, [51,32,53,74,85,26,67,48,55,43]);
    await contract.setAllTeacherCoursePreferences(2, [35,74,17,95,57,23,88,46,64,60]);

    await switchAcount(3);
    await registerTeacher("teacher_3", accounts[3]);
    await contract.setTeacherSuitabilityWeight(3,3);
    await contract.setTeacherValue(3, 1500);
    await contract.setAllTeacherCourseSuitability(3, [32,31,54,43,68,27,74,72,58,90]);
    await contract.setAllTeacherCoursePreferences(3, [51,32,83,14,95,76,27,70,45,67]);

    await switchAcount(4);
    await registerTeacher("teacher_4", accounts[4]);
    await contract.setTeacherValue(4, 1200);
    await contract.setTeacherSuitabilityWeight(4,4);
    await contract.setAllTeacherCourseSuitability(4, [43,24,35,56,67,18,79,80,61,33]);
    await contract.setAllTeacherCoursePreferences(4, [22,63,44,85,66,87,38,79,57,60]);

    await switchAcount(5);
    await registerTeacher("teacher_5", accounts[5]);
    await contract.setTeacherSuitabilityWeight(5,5);
    await contract.setTeacherValue(5, 1100);
    await contract.setAllTeacherCourseSuitability(5, [22,43,44,35,66,57,58,79,55,83]);
    await contract.setAllTeacherCoursePreferences(5, [43,14,75,35,56,67,28,59,59,79]);

    // 注册智能体
    console.log("Registering agents...");
    await switchAcount(6);
    await registerAgent("Agent_1", accounts[6]);
    await contract.setAllAgentCourseSuitability(1, [85,94,68,27,48,34,37,42,46,14]);
    await contract.setAgentValue(1,1000);

    await switchAcount(7);
    await registerAgent("Agent_2", accounts[7]);
    await contract.setAllAgentCourseSuitability(2, [43,86,90,47,24,36,32,45,16,34]);
    await contract.setAgentValue(2,1200);

    // 注册班级
    console.log("Registering classes...");
    await switchAcount(8);
    await registerClass("Class_1", accounts[8]);
    for (let i = 1; i <= 25; i++) {
        const studentName = `Student_${i}`; // 学生姓名
        await classContract.addStudentToClass(studentName);
    }
    console.log("班级1学生注册完毕");


    await switchAcount(9);
    await registerClass("Class_2", accounts[9]);
    for (let i = 26; i <= 50; i++) {
        const studentName = `Student_${i}`; // 学生姓名
        await classContract.addStudentToClass(studentName);
    }
    console.log("班级2学生注册完毕");

}




async function testConfictProposal(){
    const accounts = await web3.eth.getAccounts();
    for (let teacherId = 1; teacherId <=5; teacherId++){
        let result = await AssignedTeacherCourse(teacherId, 10);
        console.log(result);
    }
    let proposal = await createConflictProposal();
    console.log(proposal)
    for(let teacherId = 1; teacherId <=5; teacherId++){
        let teacher_vote = await teacherVote(accounts[teacherId], 1, 1);
    }
    let agent_1_vote = await agentVote(accounts[6], 1);
    console.log(agent_1_vote);
    let agent_2_vote = await agentVote(accounts[7], 1);
    console.log(agent_2_vote);

    let proposal_1_result = await endConfictProposal(1);
    console.log(proposal_1_result);
    for(let teacherId =1; teacherId<=5; teacherId++) {
        await switchAcount(teacherId);
        let courses = await contract.getTeacherAssignedCourses(teacherId);
        console.log(`Teacher ${teacherId} assigned courses: ${courses}`);
    }

}

async function runTestsForFirstFiveFunctions() {
    await allocateAgentCourses();
    let proposal1 = await createProposalForCourse();
    console.log(proposal1)

    for(let teacherId =1; teacherId<=5; ++teacherId) {
        await switchAcount(teacherId);
        const accounts = await web3.eth.getAccounts();
        teacherAddress = accounts[teacherId];
        await teacherVote(teacherAddress, 1, 3);
    }
    let proposal1_result = await endProposalAndAssignCourse(1);
    console.log(proposal1_result)
    for(let i = 2; i <= 7; i++) {
        let machineVote_result = await machineVoting();
        console.log(machineVote_result);
    }

    for(let teacherId =1; teacherId<=5; teacherId++) {
        await switchAcount(teacherId);
        let courses = await contract.getTeacherAssignedCourses(teacherId);
        console.log(`Teacher ${teacherId} assigned courses: ${courses}`);
    }
    let proposalWithoutCourse = await checkAndCreateProposalForTeacher();
    console.log(proposalWithoutCourse);
    return 0;
}

/**
 * 转移课程给性价比更高的目标
 * @param {number} courseId - 要转移的课程ID
 * @param {number} targetId - 目标老师/智能体ID
 * @param {string} targetType - 目标类型 ("teacher" 或 "agent")
 * @returns {Promise<{code: number, message: string}>}
 */
async function transferCourse(courseId, targetId, targetType) {
    try {
        // 参数校验
        if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(courseId)) {
            throw new Error("课程ID必须为1-10的整数");
        }
        if (!["teacher", "agent"].includes(targetType)) {
            throw new Error("目标类型必须是teacher或agent");
        }

        // 获取当前分配者信息
        const currentTeachers = await contract.getCoursesAssignedTeacher(courseId);
        const currentAgents = await contract.getCoursesAssignedAgent(courseId);
        const currentAssigned = [...currentTeachers, ...currentAgents].map(id => id.toNumber());
        
        const currentAddress = await currentSigner.getAddress();

        // 验证调用者是当前分配者
        const senderTeacherId = (await contract.addressToTeacherId(currentAddress)).toNumber();
        const senderAgentId = (await contract.addressToAgentId(currentAddress)).toNumber();
        const isCurrentHolder = currentAssigned.includes(senderTeacherId) || currentAssigned.includes(senderAgentId);
        if (!isCurrentHolder) {
            throw new Error("只有当前课程分配者可以转移");
        }

        // 获取当前分配者性价比
        let currentPerf;
        if (senderTeacherId !== 0) {
            const suitability = await contract.getTeacherSuitability(senderTeacherId, courseId);
            const salary = (await contract.teachers(senderTeacherId)).value;
            currentPerf = suitability.toNumber() / salary.toNumber();
        } else {
            const suitability = await contract.getAgentSuitability(senderAgentId, courseId);
            const salary = (await contract.agents(senderAgentId)).value;
            currentPerf = suitability.toNumber() / salary.toNumber();
        }

        // 获取目标性价比
        let targetPerf;
        if (targetType === "teacher") {
            const suitability = await contract.getTeacherSuitability(targetId, courseId);
            const salary = (await contract.teachers(targetId)).value;
            targetPerf = suitability.toNumber() / salary.toNumber();
        } else {
            const suitability = await contract.getAgentSuitability(targetId, courseId);
            const salary = (await contract.agents(targetId)).value;
            targetPerf = suitability.toNumber() / salary.toNumber();
        }

        // 验证性价比提升
        if (targetPerf <= currentPerf) {
            throw new Error(`目标性价比需大于当前值（当前: ${currentPerf.toFixed(2)}, 目标: ${targetPerf.toFixed(2)}）`);
        }

        // 执行转移
        if (senderTeacherId !== 0) {
            await removeTeacherCourse(senderTeacherId, courseId);
        } else {
            await removeAgentCourse(senderAgentId, courseId);
        }

        if (targetType === "teacher") {
            await AssignedTeacherCourse(targetId, courseId);
        } else {
            await AssignedAgentCourse(targetId, courseId);
        }

        return { 
            code: 0, 
            message: `课程 ${courseId} 已从 ${senderTeacherId || senderAgentId} 转移至 ${targetType} ${targetId}`,
            performanceImprovement: (targetPerf - currentPerf).toFixed(2) 
        };

    } catch (error) {
        console.error("转移失败:", error.message);
        return { 
            code: -1, 
            message: error.message,
            errorDetails: error.stack 
        };
    }
}
async function preprocessConflictCourses() {
    try {
        const courseIds = (await contract.getCourseIds()).map(id => id.toNumber());
        let successCount = 0;
        let skippedCourses = 0;

        // 并行处理所有课程
        await Promise.all(courseIds.map(async courseId => {
            const [teachers, agents] = await Promise.all([
                contract.getCoursesAssignedTeacher(courseId),
                contract.getCoursesAssignedAgent(courseId)
            ]);

            // 检查无冲突条件
            if (teachers.length === 1 && agents.length === 0) {
                const teacherId = teachers[0].toNumber();
                const existingCourses = await contract.getTeacherReallyAssignedCourses(teacherId);
                
                // 检查课程数量限制
                if (existingCourses.length < 2) {
                    const tx = await contract.addTeacherReallyAssignedCourses(teacherId, courseId);
                    await tx.wait();
                    successCount++;
                } else {
                    skippedCourses++;
                }
            }
        }));

        console.log(`预处理完成，成功分配 ${successCount} 个课程`);
        return { code: 0, message: "预处理完成" };
    } catch (error) {
        console.error("处理失败:", error);
        return { code: -1, message: error.message };
    }
}
async function checkCourseConflicts() {
    const courseIds = await contract.getCourseIds();
    let conflictCourses = [];
    
    for (const courseId of courseIds) {
        // 同时获取教师和智能体分配情况
        const [teachers, agents] = await Promise.all([
            contract.getCoursesAssignedTeacher(courseId),
            contract.getCoursesAssignedAgent(courseId)
        ]);

        // 冲突条件：教师或智能体被分配超过1人
        const hasTeacherConflict = teachers.length > 1;
        const hasAgentConflict = agents.length > 1;
        const hasMixedConflict = teachers.length > 0 && agents.length > 0;
        if (hasTeacherConflict || hasAgentConflict || hasMixedConflict) {
            conflictCourses.push({
                courseId,
                teacherCount: teachers.length,
                agentCount: agents.length
            });
        }
    }

    if (conflictCourses.length === 0) return '无课程冲突';

    // 生成详细冲突报告
    return conflictCourses.map(conflict => 
        `课程 ${conflict.courseId} 冲突：${conflict.teacherCount}位教师 + ${conflict.agentCount}位智能体`
    ).join('\n');
}


async function main() {
    // 运行初始化
    await initializeData();
  
    await init_TeacherCourses();
    await init_AgentCourses();
    // await getTeacherCostPerformance(1); //教师的性价比
    // await getTeacherCostPerformance(2);
    // await getTeacherCostPerformance(3);
    // await getTeacherCostPerformance(4);
    // await getTeacherCostPerformance(5);
    // await getAgentCostPerformance(1);//智能体的性价比
    // await getAgentCostPerformance(2);
    await printAssignments();//查看初始化后 教师的课程分配情况

    await switchAcount(3);
    console.log(await transferCourse(10, 1, "teacher"));//转移课程id 目标老师id 目标老师类型
    await printAssignments()

    await switchAcount(3);
    console.log(await transferCourse(5, 2, "teacher"));
    await printAssignments()

    await switchAcount(6);
    console.log(await transferCourse(3, 2, "agent"));
    await switchAcount(7);
    console.log(await transferCourse(2, 1, "agent"));
    await printAssignments()
    
    console.log(await checkCourseConflicts());


    const accounts = await web3.eth.getAccounts();


    console.log(await preprocessConflictCourses());
    //冲突提案1
    console.log(await createConflictProposal());        
    for(let teacherId = 1; teacherId <=5; teacherId++) {
        await switchAcount(teacherId);
        const x = teacherId <= 3 ? 1 : 5; 
        const teacher_vote = await teacherVote(accounts[teacherId], 1, x);
    }
    let agent_1_vote = await agentVote(accounts[6], 1);//自动投票投给性价比最高的老师
    console.log(agent_1_vote);
    let agent_2_vote = await agentVote(accounts[7], 1);
    console.log(agent_2_vote);
    console.log(await endConfictProposal(1));
    await printAssignments();
    console.log(await checkCourseConflicts());

  
    //冲突提案2
    console.log(await createConflictProposal());   
    for(let teacherId = 1; teacherId <=5; teacherId++) {
        await switchAcount(teacherId);
        const x = teacherId <= 3 ? 2 : 4; 
        const teacher_vote = await teacherVote(accounts[teacherId], 2, x);
    }
    console.log(await agentVote(accounts[6], 2));
    console.log(await agentVote(accounts[7], 2));
    console.log(await endConfictProposal(2));
    await printAssignments();
    console.log(await checkCourseConflicts());

    //冲突提案3
    console.log(await createConflictProposal());   
    for(let teacherId = 1; teacherId <=5; teacherId++) {
        await switchAcount(teacherId);
        const teacher_vote = await teacherVote(accounts[teacherId], 3, 1);
    }
    console.log(await agentVote(accounts[6], 3));
    console.log(await agentVote(accounts[7], 3));
    console.log(await endConfictProposal(3));
    await printAssignments();
    console.log(await checkCourseConflicts());

    //冲突提案4
    console.log(await createConflictProposal());   
    for(let teacherId = 1; teacherId <=5; teacherId++) {
        await switchAcount(teacherId);
        const teacher_vote = await teacherVote(accounts[teacherId], 4,4);
    }
    console.log(await agentVote(accounts[6], 4));
    console.log(await agentVote(accounts[7], 4));
    console.log(await endConfictProposal(4));
    await printAssignments();
    console.log(await checkCourseConflicts());

    //冲突提案5
    console.log(await createConflictProposal());   
    for(let teacherId = 1; teacherId <=5; teacherId++) {
        await switchAcount(teacherId);
        const x = teacherId <= 3 ? 3 : 4; 
        const teacher_vote = await teacherVote(accounts[teacherId], 5, x);
    }
    console.log(await agentVote(accounts[6], 5));
    console.log(await agentVote(accounts[7], 5));
    console.log(await endConfictProposal(5));
    await printAssignments();
    console.log(await checkCourseConflicts());

    console.log(await checkAndCreateProposalForTeacher());
    const id = (await getLeastSuitableAgentCourse()).data;

}

main();