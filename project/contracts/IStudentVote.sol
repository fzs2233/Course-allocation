// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface StudentVote {
    function createProposal(
        string memory _description,
        uint256 _voteforID,
        uint256[] memory _votedIds,
        uint256 _teacherProposalId
    ) external returns (uint256);

    function vote(
        uint256 studentId,
        uint256 proposalId,
        uint256 optionId
    ) external;

    function getProposalResults(
        address classAddress,
        uint256 proposalId
    )
        external
        view
        returns (uint256, uint256, uint256[] memory, uint256[] memory);

    function getAverageSuitability(
        uint256[] memory courseIds
    ) external view returns (uint256[] memory);

    function getClassNum() external view returns (uint256);

    function getClassWeight() external view returns (uint256);
}

contract IStudentVote is StudentVote {
    struct Student {
        address addr;
        uint256 id;
        string name;
        uint256 classId;
        bool isSetSuitability;
        mapping(uint256 => uint256) courseSuitability;
        mapping(uint256 => uint256) courseScores;
    }

    struct Class {
        address addr;
        uint256 id;
        string name;
        mapping(uint256 => Proposal) proposals;
        uint256 proposalCount;
        uint256[] studentsId;
        uint256 studentCount;
        uint256 weightForAutoVote;
    }

    struct Proposal {
        uint256 id;
        uint256 teacherProposalId;
        string description;
        uint256 voteforID; // 为哪个ID进行投票
        uint256[] votedIds;
        mapping(uint256 => uint256) voteIdToCount;
        mapping(uint256 => bool) ifVote;
        uint256 voteCount;
    }

    mapping(uint256 => Class) public classes;
    mapping(uint256 => Student) public students;
    mapping(address => uint256) public addressToClassId;
    mapping(address => uint256) public addressToStudentId;
    uint256[] public classIds;
    uint256[] public studentIds;
    uint256 public classCount;
    uint256 public studentCount;
    uint256 courseCount = 10;

    function getClassNum() public view override returns (uint256) {
        return classCount;
    }

    function getClassWeight() public view override returns (uint256) {
        uint256 classWeights;
        for (uint256 i = 0; i < classCount; i++) {
            classWeights += classes[i].weightForAutoVote;
        }
        return classWeights;
    }

    // 添加班级
    function addClass(string memory className, address classAddress) public {
        classCount++;
        require(classes[classCount].id == 0, "Class already exists");
        addressToClassId[classAddress] = classCount;
        classes[classCount].addr = classAddress;
        classes[classCount].id = classCount;
        classes[classCount].name = className;
        classes[classCount].weightForAutoVote = 10;
        classIds.push(classCount);
    }

    // 注册学生
    function registerStudent(
        uint256 classId,
        string memory _name,
        address studentAddress
    ) public {
        require(classes[classId].id != 0, "Class does not exist");
        studentCount++;
        addressToStudentId[studentAddress] = studentCount;
        students[studentCount].addr = studentAddress;
        students[studentCount].id = studentCount;
        students[studentCount].name = _name;
        students[studentCount].classId = classId;
        students[studentCount].isSetSuitability = false;
        classes[classId].studentsId.push(studentCount);
        studentIds.push(studentCount);
    }

    // 事件：当有新提案创建时触发
    event ProposalCreated(uint256 classProposalId, string description);

    // 创建提案
    function createProposal(
        string memory _description,
        uint256 _voteforID,
        uint256[] memory _votedIds,
        uint256 _teacherProposalId
    ) public override returns (uint256) {
        uint256 newProposalID = 0;
        for (uint256 i = 1; i <= classCount; i++) {
            Class storage cls = classes[i];
            cls.proposalCount++;
            uint256 proposalId = cls.proposalCount;

            cls.proposals[proposalId].id = proposalId;
            cls.proposals[proposalId].description = _description;
            cls.proposals[proposalId].teacherProposalId = _teacherProposalId;
            for (uint256 j = 0; j < _votedIds.length; j++) {
                if (_votedIds[j] != 0) {
                    cls.proposals[proposalId].votedIds.push(_votedIds[j]);
                }
            }

            cls.proposals[proposalId].voteforID = _voteforID;
            newProposalID = proposalId;
        }
        emit ProposalCreated(newProposalID, _description);
        return newProposalID;
    }

    // 投票
    function vote(
        uint256 studentId,
        uint256 proposalId,
        uint256 optionId
    ) public override {
        uint256 classId = addressToClassId[msg.sender];
        require(classes[classId].id != 0, "Class does not exist");
        require(
            classes[classId].proposals[proposalId].id != 0,
            "Proposal does not exist"
        );
        require(
            classes[classId].proposals[proposalId].votedIds.length > 0,
            "Proposal has no options"
        );
        require(
            !classes[classId].proposals[proposalId].ifVote[studentId],
            "You have already voted"
        );

        bool optionExists = false;
        for (
            uint256 i = 0;
            i < classes[classId].proposals[proposalId].votedIds.length;
            i++
        ) {
            if (
                classes[classId].proposals[proposalId].votedIds[i] == optionId
            ) {
                optionExists = true;
                break;
            }
        }
        require(optionExists, "Invalid option ID");

        classes[classId].proposals[proposalId].voteIdToCount[optionId]++;
        classes[classId].proposals[proposalId].ifVote[studentId] = true;
        classes[classId].proposals[proposalId].voteCount++;
    }

    function studentVote(
        uint256 studentId,
        uint256 proposalId,
        uint256 optionId
    ) public {
        uint256 classId = students[studentId].classId;
        require(classes[classId].id != 0, "Class does not exist");
        require(
            classes[classId].proposals[proposalId].id != 0,
            "Proposal does not exist"
        );
        require(
            classes[classId].proposals[proposalId].votedIds.length > 0,
            "Proposal has no options"
        );
        require(
            !classes[classId].proposals[proposalId].ifVote[studentId],
            "You have already voted"
        );

        bool optionExists = false;
        for (
            uint256 i = 0;
            i < classes[classId].proposals[proposalId].votedIds.length;
            i++
        ) {
            if (
                classes[classId].proposals[proposalId].votedIds[i] == optionId
            ) {
                optionExists = true;
                break;
            }
        }
        require(optionExists, "Invalid option ID");

        classes[classId].proposals[proposalId].voteIdToCount[optionId]++;
        classes[classId].proposals[proposalId].ifVote[studentId] = true;
        classes[classId].proposals[proposalId].voteCount++;
    }

    // 获取提案结果
    function getProposalResults(
        address classAddress,
        uint256 proposalId
    )
        public
        view
        override
        returns (uint256, uint256, uint256[] memory, uint256[] memory)
    {
        uint256 classId = addressToClassId[classAddress];
        require(classes[classId].id != 0, "Class does not exist");
        require(
            classes[classId].proposals[proposalId].id != 0,
            "Proposal does not exist"
        );
        uint256 winningOptionId;
        uint256 voteforID;

        Proposal storage proposal = classes[classId].proposals[proposalId];
        uint256[] memory teacherVoteCounts = new uint256[](
            proposal.votedIds.length
        );
        voteforID = proposal.voteforID;
        uint256 maxVoteCount = 0;
        for (uint256 i = 0; i < proposal.votedIds.length; i++) {
            uint256 optionId = proposal.votedIds[i];
            uint256 voteCount = proposal.voteIdToCount[optionId];
            teacherVoteCounts[i] = voteCount;
            if (voteCount > maxVoteCount) {
                maxVoteCount = voteCount;
                winningOptionId = optionId;
            }
        }
        return (
            winningOptionId,
            voteforID,
            proposal.votedIds,
            teacherVoteCounts
        );
    }

    function getStudents() public view returns (uint256[] memory) {
        uint classId = addressToClassId[msg.sender];
        require(classes[classId].id != 0, unicode"当前账户不是班级");
        return classes[classId].studentsId;
    }

    // 学生评分
    function setCourseSuitability(
        uint256 studentId,
        uint256[] memory _suitabilities,
        uint256[] memory courseIds
    ) public {
        require(studentId <= studentCount, "Student does not exist");
        // 检查评分数组长度是否匹配
        require(
            _suitabilities.length == courseCount,
            "Suitability array length mismatch"
        );
        Student storage student = students[studentId];
        student.isSetSuitability = true;
        for (uint256 i = 0; i < _suitabilities.length; i++) {
            student.courseSuitability[courseIds[i]] = _suitabilities[i];
        }
    }

    function studentSetCourseSuitability(
        uint256[] memory _suitabilities,
        uint256[] memory courseIds
    ) public {
        uint256 studentId = addressToStudentId[msg.sender];
        require(studentId <= studentCount, "Student does not exist");
        require(studentId != 0, "Student does not exist");
        // 检查评分数组长度是否匹配
        require(
            _suitabilities.length == courseCount,
            "Suitability array length mismatch"
        );
        Student storage student = students[studentId];
        student.isSetSuitability = true;
        for (uint256 i = 0; i < _suitabilities.length; i++) {
            student.courseSuitability[courseIds[i]] = _suitabilities[i];
        }
    }

    // 查看学生对某一个课程的评分
    function getStudentCourseSuitability(
        uint256 studentId,
        uint256 courseId
    ) public view returns (uint256) {
        Student storage student = students[studentId];
        return student.courseSuitability[courseId];
    }

    // 获取学生考试分数
    function getStudentCourseScore(
        uint256 studentId,
        uint256 courseId
    ) public view returns (uint256) {
        return students[studentId].courseScores[courseId];
    }

    // 设置学生考试分数
    function setStudentCourseScore(
        uint256 studentId,
        uint256 courseId,
        uint256 score
    ) public {
        students[studentId].courseScores[courseId] = score;
    }

    // 查看学生评分的平均分
    function getAverageSuitability(
        uint256[] memory courseIds
    ) public view override returns (uint256[] memory) {
        uint256[] memory totalCourseScore = new uint256[](courseCount);
        for (uint256 i = 1; i <= studentCount; i++) {
            Student storage student = students[i];
            for (uint256 j = 0; j < courseCount; j++) {
                totalCourseScore[j] += student.courseSuitability[courseIds[j]];
            }
        }
        for (uint256 j = 0; j < courseCount; j++) {
            totalCourseScore[j] = totalCourseScore[j] / studentCount;
        }
        return totalCourseScore;
    }

    function getClassIds() public view returns (uint256[] memory) {
        return classIds;
    }

    function getStudentIds() public view returns (uint256[] memory) {
        return studentIds;
    }

    function getProposalInfo(
        uint256 classId,
        uint256 proposalId
    ) public view returns (uint256[] memory, uint256) {
        return (
            classes[classId].proposals[proposalId].votedIds,
            classes[classId].proposals[proposalId].voteforID
        );
    }

    function getTeacherProposalId(        
        uint256 classId,
        uint256 proposalId
    ) public view returns (uint256){
        return classes[classId].proposals[proposalId].teacherProposalId;
    }
}
