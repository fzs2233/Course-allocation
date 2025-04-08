// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {IVote} from "./VoteInterface.sol";

contract Vote is IVote{
    struct Voter {
        uint256 id;
        address voter;
        uint256 weight;
    }

    struct ProposalMultiple {
        uint256 id;
        string description;
        uint256 voteforID; // 为哪个ID进行投票
        uint256[] votedIds;// 选项id,看投票的id是否在里面
        mapping (uint256 => uint256) voteIdToCount; // 每个选项的票数
        mapping (address => bool) ifVote; // 是否已经投票
        uint256 voteCount;  // 已经投票人数
        uint256 totalVote; // 投票总数
    }
    mapping(address => Voter) public voters; // 投票者地址到投票者结构体的映射
    address[] public votersAddress; // 投票者地址列表
    mapping (uint256 => ProposalMultiple) public proposalMultiples; // 投票id到投票内容
    uint256[] public proposalMultipleIds; // 投票id列表

    // 事件：当有新提案创建时触发
    event ProposalCreated(uint256 proposalId, string description);
    
    constructor(){
        
    }
    // 地址注册为投票者
    function registerVoter(address _voter) public override(IVote) {
        // 检查地址是否已注册
        require(voters[_voter].voter == address(0), unicode"账户已注册"); 
        // 注册新的投票者
        voters[_voter] = Voter(votersAddress.length+1, _voter, 1);
        votersAddress.push(_voter);
    }
    
    // 添加提案
    function createProposalMultiple(string memory _description, uint256 _voteforID, uint256[] memory _votedIds, uint256 _totalVote) public returns (uint256){
        uint256 newProposalId = proposalMultipleIds.length + 1;

        proposalMultiples[newProposalId].id = newProposalId;
        proposalMultiples[newProposalId].description = _description;
        for (uint256 i = 0; i < _votedIds.length; i++) {
            if(_votedIds[i] != 0){
                proposalMultiples[newProposalId].votedIds.push(_votedIds[i]);
            }
        }
        proposalMultiples[newProposalId].totalVote = _totalVote;
        proposalMultiples[newProposalId].voteforID = _voteforID;

        proposalMultipleIds.push(newProposalId);

        emit ProposalCreated(newProposalId, _description);

        return newProposalId;
    }

    // 添加提案
    function createMachineProposal(string memory _description, uint256 _voteforID, uint256[] memory _votedIds, uint256[] memory _votedCounts, uint256 _totalVote) public returns (uint256){
        uint256 newProposalId = proposalMultipleIds.length + 1;

        proposalMultiples[newProposalId].id = newProposalId;
        proposalMultiples[newProposalId].description = _description;
        for (uint256 i = 0; i < _votedIds.length; i++) {
            if(_votedIds[i] != 0){
                proposalMultiples[newProposalId].votedIds.push(_votedIds[i]);
                proposalMultiples[newProposalId].voteIdToCount[_votedIds[i]] = _votedCounts[i];
            }
        }
        proposalMultiples[newProposalId].totalVote = _totalVote;
        proposalMultiples[newProposalId].voteforID = _voteforID;

        proposalMultipleIds.push(newProposalId);

        emit ProposalCreated(newProposalId, _description);

        return newProposalId;
    }
    // 查看某个提案被投票的选项的ids
    function getVotedIds(uint256 _proposalId) public override(IVote) view returns (uint256[] memory, uint256) {
        return (proposalMultiples[_proposalId].votedIds, proposalMultiples[_proposalId].voteforID);
    }

    // 查看某个提案某个选项的票数
    function getVoteIdToCount(uint256 _proposalId, uint256 _voteId) public override(IVote) view returns (uint256) {
        return proposalMultiples[_proposalId].voteIdToCount[_voteId]; 
    }

    // 投票
    function voteMultiple(address voter, uint256 _proposalId, uint256 _voteId) public {
        require(voters[voter].voter != address(0), unicode"账户未注册"); 
        require(proposalMultiples[_proposalId].ifVote[voter] == false, unicode"您已投票");
        require(proposalMultiples[_proposalId].voteCount < proposalMultiples[_proposalId].totalVote, unicode"投票人数已满"); 
        // 看投票的_voteId是否在votedIds里面
        bool ifIn = false;
        for(uint256 i=0;i<proposalMultiples[_proposalId].votedIds.length;i++){
            if(proposalMultiples[_proposalId].votedIds[i] == _voteId){
                proposalMultiples[_proposalId].voteIdToCount[_voteId] += 1;
                proposalMultiples[_proposalId].voteCount += 1; 
                proposalMultiples[_proposalId].ifVote[voter] = true;
                ifIn = true;
                break;
            }
        }
        require(ifIn == true, unicode"投票的选项不存在");
    }

    // 结束投票并返回结果
    function endVoteMultiple(uint256 _proposalId) public view returns (uint256, uint256, uint256[] memory, uint256[] memory) {
        uint256 maxVoteCount = 0;
        uint256 result = 0;
        uint256[] memory temp = proposalMultiples[_proposalId].votedIds;
        uint256 _voteforID = proposalMultiples[_proposalId].voteforID;
        uint256[] memory tempCount = new uint256[](temp.length);
        for (uint256 i = 0; i < temp.length; i++) {
            if(proposalMultiples[_proposalId].voteIdToCount[temp[i]]>maxVoteCount){
                maxVoteCount = proposalMultiples[_proposalId].voteIdToCount[temp[i]];
                result = temp[i];
            }
            tempCount[i] = proposalMultiples[_proposalId].voteIdToCount[temp[i]];
        }

        return (result, _voteforID,temp,tempCount);
    }

    // 创建选老师提案
    function createChooseTeacherProposal(string memory _description, uint256 _voteforID, uint256[] memory _votedIds,uint256 _totalVote) public override(IVote) returns(uint256){
        return createProposalMultiple(_description, _voteforID, _votedIds, _totalVote);
    }
    // 创机器投票提案
    function createMachineVoteProposal(string memory _description, uint256 _voteforID, uint256[] memory _votedIds, uint256[] memory _votedCounts) public override(IVote) returns(uint256){
        return createMachineProposal(_description, _voteforID, _votedIds, _votedCounts, 7);
    }
    // 创建选课程提案
    function createChooseCourseProposal(string memory _description, uint256 _voteforID, uint256[] memory _votedIds,uint256 _totalVote) public override(IVote) returns(uint256){
        return createProposalMultiple(_description, _voteforID, _votedIds, _totalVote);
    }

    // 通过接口投票
    // 选老师投票
    function voteChooseTeacher(address voterAddress, uint256 _proposalId, uint256 _voteId) public override(IVote) {
        voteMultiple(voterAddress, _proposalId, _voteId); 
    }
    // 选课程投票
    function voteChooseCourse(address voterAddress, uint256 _proposalId, uint256 _voteId) public override(IVote) {
        voteMultiple(voterAddress, _proposalId, _voteId); 
    }

    // 通过接口结束投票
    // 选老师结束投票
    function endVoteChooseTeacher(uint256 _proposalId) public override(IVote) view returns (uint256, uint256, uint256[] memory, uint256[] memory) {
        return endVoteMultiple(_proposalId); 
    }

    // 选课程结束投票
    function endVoteChooseCourse(uint256 _proposalId) public override(IVote) view returns (uint256, uint256, uint256[] memory, uint256[] memory) {
        return endVoteMultiple(_proposalId); 
    }

}