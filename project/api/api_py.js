const fs = require('fs');


// 封装的 HTTP 请求函数
async function httpRequest(url, method, data = null) {
    try {
        
        const headers = {
            'Content-Type': 'application/json',
        };

        const config = {
            method: method,
            headers: headers,
        };

        if (data !== null) {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(url, config);
        // console.log(response)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
}

// 调用外部算法，获取教师的专业能力
async function getTeacherProfessionalCompetence(courses, researchDirections, paperCounts) {
    try {
        const url = 'http://127.0.0.1:1088/api/process';
        const data = {
            course: courses.join('/'), // 用斜杠分割课程名称
            ResearchDirection: researchDirections.join('/'), // 用斜杠分割研究方向
            paperCount: paperCounts.join('/') // 用斜杠分割论文数量
        };

        const result = await httpRequest(url, 'POST', data);
        // console.log(result.data);
        return result.data
    } catch (error) {
        console.error('Error:', error);
    }
}

// 调用外部算法，获取机器评分
async function getMachineRatingPython(courseScore, courseDifficulty) {
    try {
        courseScore = courseScore.join('/');
        const data = {
            courseScore: courseScore,
            courseDifficulty: courseDifficulty
        };

        url = 'http://127.0.0.1:1088/api/machineRating'
        const result = await httpRequest(url, 'POST', data);
        // console.log(result.data);
        return result.data
    } catch (error) {
        console.error('Error:', error);
    }
}

// 调用发送请求的函数
module.exports = {
    getTeacherProfessionalCompetence,
    getMachineRatingPython
};