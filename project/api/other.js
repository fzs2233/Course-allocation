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
