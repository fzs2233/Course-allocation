// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface StudentVote {
    function createProposal(string memory _description, uint256 _voteforID, uint256[] memory _votedIds) external returns (uint256);
    function vote(uint256 studentId, uint256 proposalId, uint256 optionId) external;
    function getProposalResults(address classAddress, uint256 proposalId) external view returns (uint256, uint256);
    function getAverageSuitability() external view returns (uint256[] memory);
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

    function getClassNum() public view override returns(uint256) {
        return classCount;
    }

    function getClassWeight() public view override returns(uint256) {
        uint256 classWeights;
        for(uint256 i = 0; i < classCount; i++){
            classWeights += classes[i].weightForAutoVote;
        }
        return classWeights;
    }

    function getStudentofClass() public view returns(uint256[] memory) {
        uint256 classId = addressToClassId[msg.sender];
        return classes[classId].studentsId;
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

    // 添加学生到班级
    function addStudentToClass(string memory _name) public {
        uint256 classId = addressToClassId[msg.sender];
        require(classes[classId].id != 0, "Class does not exist");
        studentCount++;
        students[studentCount].id = studentCount;
        students[studentCount].name = _name;
        students[studentCount].classId = classId;
        students[studentCount].isSetSuitability = false;
        classes[classId].studentsId.push(studentCount);
        studentIds.push(studentCount);
    }

    // 注册学生
    function registerStudent(uint256 classId, string memory _name, address studentAddress) public{
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

    // 创建提案
    function createProposal(string memory _description, uint256 _voteforID, uint256[] memory _votedIds) public override returns (uint256) {
        uint256 newProposalID = 0;
        for (uint256 i = 1; i <= classCount; i++) {
            Class storage cls = classes[i];
            cls.proposalCount++;
            uint256 proposalId = cls.proposalCount;

            cls.proposals[proposalId].id = proposalId;
            cls.proposals[proposalId].description = _description;

            for (uint256 j = 0; j < _votedIds.length; j++) {
                if(_votedIds[j] != 0){
                    cls.proposals[proposalId].votedIds.push(_votedIds[j]);
                }
            }

            cls.proposals[proposalId].voteforID = _voteforID;
            newProposalID = proposalId;
        }
        return newProposalID;
    }

    // 投票
    function vote(uint256 studentId, uint256 proposalId, uint256 optionId) public override {
        uint256 classId = addressToClassId[msg.sender];
        require(classes[classId].id != 0, "Class does not exist");
        require(classes[classId].proposals[proposalId].id != 0, "Proposal does not exist");
        require(classes[classId].proposals[proposalId].votedIds.length > 0, "Proposal has no options");
        require(!classes[classId].proposals[proposalId].ifVote[studentId], "You have already voted");

        bool optionExists = false;
        for (uint256 i = 0; i < classes[classId].proposals[proposalId].votedIds.length; i++) {
            if (classes[classId].proposals[proposalId].votedIds[i] == optionId) {
                optionExists = true;
                break;
            }
        }
        require(optionExists, "Invalid option ID");

        classes[classId].proposals[proposalId].voteIdToCount[optionId]++;
        classes[classId].proposals[proposalId].ifVote[studentId] = true;
        classes[classId].proposals[proposalId].voteCount++;
    }

    function studentVote(uint256 studentId, uint256 proposalId, uint256 optionId) public {
        uint256 classId = students[studentId].classId;
        require(classes[classId].id != 0, "Class does not exist");
        require(classes[classId].proposals[proposalId].id != 0, "Proposal does not exist");
        require(classes[classId].proposals[proposalId].votedIds.length > 0, "Proposal has no options");
        require(!classes[classId].proposals[proposalId].ifVote[studentId], "You have already voted");

        bool optionExists = false;
        for (uint256 i = 0; i < classes[classId].proposals[proposalId].votedIds.length; i++) {
            if (classes[classId].proposals[proposalId].votedIds[i] == optionId) {
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
    function getProposalResults(address classAddress, uint256 proposalId) public view override returns (uint256 winningOptionId, uint256 voteforID) {
        uint256 classId = addressToClassId[classAddress];
        require(classes[classId].id != 0, "Class does not exist");
        require(classes[classId].proposals[proposalId].id != 0, "Proposal does not exist");

        Proposal storage proposal = classes[classId].proposals[proposalId];
        voteforID = proposal.voteforID;

        uint256 maxVoteCount = 0;
        for (uint256 i = 0; i < proposal.votedIds.length; i++) {
            uint256 optionId = proposal.votedIds[i];
            uint256 voteCount = proposal.voteIdToCount[optionId];
            if (voteCount > maxVoteCount) {
                maxVoteCount = voteCount;
                winningOptionId = optionId;
            }
        }
    }

    function getStudent() public view returns(uint256[] memory) {
        uint classId = addressToClassId[msg.sender];
        return classes[classId].studentsId;
    }

    // 学生评分
    function setCourseSuitability(uint256 studentId, uint256[] memory _suitabilities) public {
        require(studentId <= studentCount, "Student does not exist");
         // 检查评分数组长度是否匹配
        require(_suitabilities.length == courseCount, "Suitability array length mismatch");
        Student storage student = students[studentId];
        student.isSetSuitability = true;
        for(uint256 i = 0; i < _suitabilities.length; i++){
            student.courseSuitability[i] =  _suitabilities[i] ;
        }
    }

    function studentSetCourseSuitability(uint256[] memory _suitabilities) public {
        uint256 studentId = addressToStudentId[msg.sender]; 
        require(studentId <= studentCount, "Student does not exist");
         // 检查评分数组长度是否匹配
        require(_suitabilities.length == courseCount, "Suitability array length mismatch");
        Student storage student = students[studentId];
        student.isSetSuitability = true;
        for(uint256 i = 0; i < _suitabilities.length; i++){
            student.courseSuitability[i] =  _suitabilities[i] ;
        }
    }

    // 查看学生对课程的评分
    function getCourseSuitability(uint256 studentId) public view returns(uint256[] memory) {
        uint256[] memory _suitabilities = new uint256[](courseCount);
        for(uint256 i = 0; i < courseCount; i++){
            _suitabilities[i] = students[studentId].courseSuitability[i];
        }
        return _suitabilities;
    }

    // 查看学生评分的平均分
    function getAverageSuitability() public view override returns(uint256[] memory) {
        uint256[] memory totalCourseScore = new uint256[](courseCount);
        for(uint256 i = 1; i <= studentCount; i++){
            Student storage student = students[i];
            for(uint256 j = 0; j < courseCount; j++){
                totalCourseScore[j] += student.courseSuitability[j];
            }
        }
        for(uint256 j = 0; j < courseCount; j++){
                totalCourseScore[j] = totalCourseScore[j] / studentCount;
        }
        return totalCourseScore;
    }

    function getClassIds() public view returns(uint256[] memory) {
        return classIds;
    }

    function getStudentIds() public view returns(uint256[] memory) {
        return studentIds;
    }

    function getProposalInfo(uint256 classId, uint256 proposalId) public view returns(uint256[] memory, uint256) {
        return (classes[classId].proposals[proposalId].votedIds, classes[classId].proposals[proposalId].voteforID);
    } 
}