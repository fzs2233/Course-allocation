from flask import Flask, request, jsonify
from flask_cors import CORS
app = Flask(__name__)
CORS(app)

import numpy as np
import pandas as pd
from scipy import stats

# 设置随机种子以确保结果可复现
np.random.seed(75)

# === 模拟数据生成 ===
def generate_data(grades, course_difficulty):

    return pd.DataFrame({
        'course': 0,
        'grade': grades
    }), course_difficulty

# === 数据统计分析 ===
def calculate_teacher_statistics(data, course_difficulty):
    """计算每位教师的成绩统计信息"""
    # 计算每位教师的成绩均值和方差
    teacher_stats = data.groupby('course')['grade'].agg(['mean', 'var']).reset_index()
    teacher_stats['course_difficulty'] = course_difficulty  # 添加课程难度
   
    return teacher_stats

# === 课程质量分类 ===
def classify_course_quality(teacher_stats):
    """根据KL散度将课程质量分类"""
    # 定义不同质量等级的概率分布参数
    quality_distributions = {
        '95': stats.norm(95, 5),   # 优秀课程分布
        '85': stats.norm(85, 10),  # 良好课程分布
        '75': stats.norm(75, 15),  # 中等课程分布
        '65': stats.norm(65, 20),   # 及格课程分布
        '35': stats.norm(35, 35)   # 不及格课程分布
    }

    # KL散度计算函数
    def kl_divergence(p, q):
        return np.sum(np.where(p != 0, p * np.log(p / q), 0))

    # 计算每位教师课程与各质量等级的KL散度并分类
    teacher_stats['quality_category'] = ''
    x = np.linspace(0, 100, 1000)  # 定义成绩范围

    for i in range(len(teacher_stats)):
        teacher_mean = teacher_stats.loc[i, 'mean'] * np.exp((teacher_stats.loc[i, 'course_difficulty'] - 5)/10)
        teacher_std = np.sqrt(teacher_stats.loc[i, 'var'])
        teacher_dist = stats.norm(teacher_mean, teacher_std)

        # 计算教师分布与各质量分布的KL散度
        kl_values = []
        for category, dist in quality_distributions.items():
            p_teacher = teacher_dist.pdf(x)
            p_quality = dist.pdf(x)
            kl_values.append(kl_divergence(p_teacher, p_quality))

        # 找出KL散度最小的质量等级
        min_kl_index = np.argmin(kl_values)
        categories = list(quality_distributions.keys())
        teacher_stats.loc[i, 'quality_category'] = categories[min_kl_index]

    return teacher_stats

@app.route('/api/machineRating', methods=['POST'])
def process_data():
    try:
        # 获取 POST 请求中的 JSON 数据
        data = request.json

        # 提取课程和研究方向
        courseScores = data.get('courseScore', '').split('/')
        courseScores = list(map(int, courseScores))
        courseDifficulty = data.get('courseDifficulty', '')

        data, course_difficulty = generate_data(courseScores, courseDifficulty)
        teacher_stats = calculate_teacher_statistics(data, course_difficulty)
        teacher_stats = classify_course_quality(teacher_stats)
        print(teacher_stats)
        courseScore = teacher_stats['quality_category'][0]
        print(courseScore)
        # 返回结果
        return jsonify({
            "status": "success",
            "data": courseScore
        })
    
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=1088)