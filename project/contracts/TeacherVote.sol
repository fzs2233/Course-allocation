// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./Vote.sol";
import "./CourseAllocation.sol";

contract TeacherVote is Vote {
    CourseAllocation public courseAllocation;

    constructor(address _courseAllocationAddress) {
        courseAllocation = CourseAllocation(_courseAllocationAddress);
    }

    // 课程评分提案结构
    struct CourseRatingProposal {
        uint256 courseId;
        uint256 totalRating;
        uint256 raterCount;
        uint256 suitabilityProposalId; // 关键修改：存储关联的投票提案ID
        bool executed;
        mapping(uint256 => uint256) teacherRatings;
        bool finalSuitability;
    }

    mapping(uint256 => CourseRatingProposal) public proposals;
    uint256 public proposalCount;

    event NewRatingProposal(
        uint256 indexed proposalId,
        uint256 indexed courseId
    );
    event ProposalExecuted(
        uint256 indexed proposalId,
        uint256 avgImportance,
        bool isAgentSuitable
    );

    modifier onlyTeacher() {
        require(
            courseAllocation.addressToTeacherId(msg.sender) != 0,
            "Only teachers can call this"
        );
        _;
    }

    // 创建新课程评分提案
    function createRatingProposal(
        uint256 courseId
    ) external onlyTeacher returns (uint256) {
        require(
            courseAllocation.addressToTeacherId(msg.sender) != 0,
            "Invalid teacher"
        );

        // 创建二元选择投票提案
        uint256[] memory options = new uint256[](2);
        options[0] = 1; // 反对
        options[1] = 2; // 赞成

        uint256 suitabilityProposalId = createChooseTeacherProposal(
            string(abi.encodePacked("Agent Suitability for Course ", courseId)),
            courseId,
            options,
            type(uint256).max // 需要全体教师投票
        );

        proposalCount++;
        CourseRatingProposal storage p = proposals[proposalCount];
        p.courseId = courseId;
        p.suitabilityProposalId = suitabilityProposalId; // 存储关联的投票提案ID

        emit NewRatingProposal(proposalCount, courseId);
        return proposalCount;
    }

    // 新增：教师投票接口
    function voteForSuitability(
        uint256 suitabilityProposalId,
        uint256 optionId
    ) external onlyTeacher {
        require(optionId == 1 || optionId == 2, "Invalid option");
        super.voteChooseTeacher(msg.sender, suitabilityProposalId, optionId);
    }

    // 提交评分
    function submitRating(
        uint256 proposalId,
        uint256 rating
    ) external onlyTeacher {
        CourseRatingProposal storage p = proposals[proposalId];
        require(p.courseId != 0, "Invalid proposal");
        require(rating >= 1 && rating <= 10, "Rating 1-10 only");

        uint256 teacherId = courseAllocation.addressToTeacherId(msg.sender);
        require(p.teacherRatings[teacherId] == 0, "Already rated");

        p.teacherRatings[teacherId] = rating;
        p.totalRating += rating;
        p.raterCount++;
    }

    // 执行提案
    function executeProposal(uint256 ratingProposalId) external {
        CourseRatingProposal storage p = proposals[ratingProposalId];
        require(!p.executed, "Already executed");
        require(p.raterCount > 0, "No ratings submitted");

        // 获取投票结果
        (uint256 voteResult, ) = endVoteChooseTeacher(p.suitabilityProposalId);
        p.finalSuitability = (voteResult == 2);

        // 更新课程属性
        courseAllocation.setCourseProperties(
            p.courseId,
            p.totalRating / p.raterCount,
            p.finalSuitability
        );

        p.executed = true;
        emit ProposalExecuted(
            ratingProposalId,
            p.totalRating / p.raterCount,
            p.finalSuitability
        );
    }

    // 获取评分
    function getTeacherRating(
        uint256 proposalId,
        uint256 teacherId
    ) public view returns (uint256) {
        return proposals[proposalId].teacherRatings[teacherId];
    }
}
