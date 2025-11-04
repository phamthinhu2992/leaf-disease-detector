// Advanced Analysis Service - Chi tiết phân tích bệnh với các yếu tố liên quan
// Cung cấp phân tích toàn diện về tình trạng, nguy hiểm, và hướng xử lí

export interface DetailedAnalysisReport {
    summaryAnalysis: {
        healthStatus: string;           // Trạng thái sức khỏe toàn thể
        diseaseUrgency: string;        // Mức độ khẩn cấp
        treatmentPriority: string;     // Ưu tiên xử lí
        recoveryOutlook: string;       // Triển vọng hồi phục
    };

    environmentalFactors: {
        currentCondition: string;      // Điều kiện môi trường hiện tại
        riskContribution: number;      // % đóng góp vào bệnh (0-100)
        recommendations: string[];     // Khuyến nghị điều chỉnh
    };

    diseaseProgression: {
        currentStage: string;          // Giai đoạn hiện tại
        progressionSpeed: string;      // Tốc độ phát triển
        timeToSevere: string;          // Thời gian đến trạng thái nặng nếu không xử lí
        transmissionRisk: string;      // Nguy hiểm lây lan
    };

    treatmentStrategy: {
        immediateSteps: string[];      // Bước xử lí ngay
        weeklyPlan: Array<{
            week: number;
            focus: string;
            actions: string[];
            expectedResult: string;
        }>;
        monthlyOutcome: string;        // Kỳ vọng sau 1 tháng
    };

    economicImpact: {
        potentialLoss: string;         // % mất mùa có thể
        treatmentCost: string;         // Ước tính chi phí xử lí
        returnOnInvestment: string;    // ROI của xử lí
        comparisonWithoutTreatment: string;
    };

    riskAssessment: {
        spreadRisk: number;            // % nguy hiểm lây lan (0-100)
        deathRisk: number;             // % nguy hiểm chết cây (0-100)
        resistanceCapacity: string;    // Khả năng chống cự của cây
        vulnerabilityFactors: string[]; // Các yếu tố làm yếu cây
    };

    historicalContext: {
        seasonalTrend: string;         // Xu hướng theo mùa
        regionalPrevalence: string;    // Tần suất ở khu vực
        treatmentSuccessRate: string;  // Tỷ lệ thành công xử lí
    };

    expertRecommendation: string;      // Lời khuyên từ chuyên gia
}

export const generateDetailedAnalysis = (
    prediction: any,
    environmentalCondition: string,
    diseaseHistory: string,
    treatmentAttempted: string,
    urgencyLevel: string,
    region: string
): DetailedAnalysisReport => {

    const confidence = prediction.confidence || 0;
    const severity = prediction.severity || 'TRUNG BÌNH';
    const riskLevel = prediction.riskLevel || 3;
    const cropType = prediction.crop || 'Chưa xác định';
    const diseaseType = prediction.prediction || 'Không xác định';

    // Tính toán trạng thái sức khỏe
    const healthStatus = confidence >= 0.9 ? '❌ Rất tệ' :
        confidence >= 0.75 ? '⚠️ Xấu' :
            confidence >= 0.6 ? '🟡 Trung bình' : '✅ Khá tốt';

    // Mức độ khẩn cấp dựa vào confidence và severity
    let diseaseUrgency = '🟢 Bình thường';
    if (urgencyLevel === 'critical' || (confidence >= 0.9 && severity === 'RẤT CAO')) {
        diseaseUrgency = '🔴 RẤT KHẨN CẤP - Xử lí ngay hôm nay';
    } else if (urgencyLevel === 'urgent' || (confidence >= 0.75 && severity === 'CAO')) {
        diseaseUrgency = '🟠 KHẨN CẤP - Xử lí trong 1-2 ngày';
    } else if (confidence >= 0.6 && severity === 'TRUNG BÌNH') {
        diseaseUrgency = '🟡 CHÚ Ý - Xử lí trong 3-5 ngày';
    }

    // Ưu tiên xử lí
    const treatmentPriority = urgencyLevel === 'critical' ? 'P0 - Cao nhất' :
        urgencyLevel === 'urgent' ? 'P1 - Cao' :
            urgencyLevel === 'normal' ? 'P2 - Trung bình' : 'P3 - Thấp';

    // Triển vọng hồi phục
    const treatmentSuccess = diseaseHistory === 'none' ? 'Tốt (60-80%)' :
        diseaseHistory === 'past' ? 'Trung bình (50-70%)' :
            diseaseHistory === 'recurring' ? 'Thấp (30-50%)' : 'Không rõ';

    // Phân tích yếu tố môi trường
    const environmentalRiskMap = {
        humid: '💧 Ẩm cao tạo điều kiện thuận cho bệnh',
        dry: '🏜️ Khô hạn làm yếu cây',
        hot: '🔥 Nóng tăng tốc độ phát triển bệnh',
        cold: '❄️ Lạnh giảm sức đề kháng',
        normal: '✅ Điều kiện thích hợp'
    };

    const environmentalRiskContribution = environmentalCondition === 'humid' ? 35 :
        environmentalCondition === 'dry' ? 20 :
            environmentalCondition === 'hot' ? 30 :
                environmentalCondition === 'cold' ? 15 : 10;

    // Tốc độ phát triển
    const progressionSpeed = confidence >= 0.8 ? '⚡ Rất nhanh (5-7 ngày để tệ hơn)' :
        confidence >= 0.6 ? '📈 Nhanh (7-14 ngày)' :
            '🐢 Chậm (14+ ngày)';

    // Thời gian đến trạng thái nặng
    const timeToSevere = confidence >= 0.8 ? '⚠️ 3-5 ngày nếu không xử lí' :
        confidence >= 0.6 ? '⚠️ 7-10 ngày nếu không xử lí' :
            '⚠️ 14+ ngày nếu không xử lí';

    // Nguy hiểm lây lan
    const transmissionRisk = riskLevel >= 4 ? '🚨 Cao - Lây nhanh sang cây khác' :
        riskLevel >= 3 ? '⚠️ Trung bình - Có thể lây lan' :
            '✅ Thấp - Ít lây lan';

    // Chiến lược xử lí
    const immediateSteps = [
        '1️⃣ ' + (diseaseHistory === 'recurring' ? 'Cách ly ngay cây bệnh' : 'Kiểm tra kỹ toàn bộ cây'),
        '2️⃣ ' + (environmentalCondition === 'humid' ? 'Giảm độ ẩm (tưới gốc, hạn chế phun)' : 'Điều chỉnh điều kiện môi trường'),
        '3️⃣ ' + (treatmentAttempted === 'none' ? 'Bắt đầu phun thuốc đặc hiệu' : 'Thay đổi loại thuốc'),
        '4️⃣ Loại bỏ phần bệnh nặng',
        '5️⃣ Bổ sung dinh dưỡng tăng sức đề kháng',
        '6️⃣ Tăng ánh sáng mặt trời',
        '7️⃣ Ghi chép và theo dõi'
    ];

    // Kế hoạch tuần
    const weeklyPlan = [
        {
            week: 1,
            focus: 'Kiểm soát bệnh',
            actions: [
                'Phun thuốc đặc hiệu ' + (treatmentAttempted === 'none' ? '1-2 lần/ngày' : '2-3 lần/ngày'),
                'Loại bỏ phần bệnh nặng',
                'Cách ly cây bệnh'
            ],
            expectedResult: 'Ngừng lây lan, cây không tệ hơn'
        },
        {
            week: 2,
            focus: 'Ổn định',
            actions: [
                'Tiếp tục phun thuốc 1 lần/ngày',
                'Bổ sung dinh dưỡng (kali, phốt pho)',
                'Tăng ánh sáng'
            ],
            expectedResult: 'Cây bắt đầu hồi phục, triệu chứng giảm'
        },
        {
            week: 3,
            focus: 'Hồi phục',
            actions: [
                'Giảm tần suất phun (1 lần/2 ngày)',
                'Theo dõi triệu chứng mới',
                'Chuẩn bị phòng chống lần sau'
            ],
            expectedResult: 'Cây phục hồi, triệu chứng hầu như biến mất'
        }
    ];

    // Kỳ vọng sau 1 tháng
    const monthlyOutcome = confidence >= 0.8 ?
        '📊 Nếu xử lí đúng: 50-70% cây phục hồi, 20-30% bộ phận phục hồi, 10-20% mất mùa' :
        '📊 Nếu xử lí đúng: 70-85% cây phục hồi, 10-20% bộ phận phục hồi, 5-10% mất mùa';

    // Ảnh hưởng kinh tế
    const potentialLoss = riskLevel >= 4 ? '40-80% năng suất' :
        riskLevel >= 3 ? '20-40% năng suất' : '5-15% năng suất';

    const treatmentCost = 'Tham khảo bác sĩ thực vật địa phương';

    const roi = treatmentAttempted === 'none' ?
        '✅ Cao (ROI 300-500%) - Xử lí từ sớm hiệu quả' :
        treatmentAttempted === 'attempted' ?
            '⚠️ Trung bình (ROI 150-300%) - Cần thay đổi chiến lược' :
            '❌ Thấp (ROI < 100%) - Cần liên hệ chuyên gia';

    const comparison = `Nếu không xử lí: mất ${potentialLoss}\nNếu xử lí đúng: mất 5-10% hoặc không mất`;

    // Đánh giá rủi ro
    const spreadRisk = Math.min(100, Math.round(riskLevel * 20 + environmentalRiskContribution));
    const deathRisk = severity === 'RẤT CAO' ? Math.round(riskLevel * 15) :
        severity === 'CAO' ? Math.round(riskLevel * 10) :
            Math.round(riskLevel * 5);

    const resistanceCapacity = diseaseHistory === 'none' ? 'Tốt (80-90%)' :
        diseaseHistory === 'past' ? 'Khá (60-75%)' :
            diseaseHistory === 'recurring' ? 'Yếu (40-60%)' : 'Không rõ';

    const vulnerabilityFactors = [
        environmentalCondition === 'humid' ? '💧 Độ ẩm cao' : 'Không phải yếu tố ẩm',
        treatmentAttempted === 'none' ? '⚠️ Chưa xử lí' : '📋 Đã xử lí nhưng chưa hiệu quả',
        diseaseHistory === 'recurring' ? '🔄 Bệnh tái phát' : 'Không tái phát trước'
    ];

    // Ngữ cảnh lịch sử
    const seasonalTrend = `Bệnh này ${riskLevel >= 4 ? 'rất phổ biến' : 'có thể gặp'} ở ${region || 'khu vực bạn'}`;
    const regionalPrevalence = region ? `Tần suất ở ${region}: Cao` : 'Không xác định khu vực';
    const treatmentSuccessRate = diseaseHistory === 'recurring' ? '30-50%' :
        diseaseHistory === 'past' ? '60-80%' : '80-95%';

    // Lời khuyên từ chuyên gia
    const expertRecommendation = urgencyLevel === 'critical' ?
        '🆘 LIÊN HỆ CHUYÊN GIA NGAY - Tình trạng rất nghiêm trọng, cần hỗ trợ chuyên môn' :
        urgencyLevel === 'urgent' ?
            '📞 Liên hệ chuyên gia trong 1-2 ngày nếu không thấy cải thiện' :
            urgencyLevel === 'normal' ?
                '📞 Liên hệ chuyên gia nếu bệnh không khỏi sau 2 tuần xử lí' :
                '✅ Theo dõi tình trạng, liên hệ nếu cần';

    return {
        summaryAnalysis: {
            healthStatus,
            diseaseUrgency,
            treatmentPriority,
            recoveryOutlook: `${treatmentSuccess} khả năng hồi phục`
        },

        environmentalFactors: {
            currentCondition: environmentalRiskMap[environmentalCondition as keyof typeof environmentalRiskMap] || '✅ Không rõ',
            riskContribution: environmentalRiskContribution,
            recommendations: [
                environmentalCondition === 'humid' ? '🌬️ Tăng thông gió, giảm phun nước' : 'Điều chỉnh tưới nước',
                '☀️ Tăng ánh sáng mặt trời',
                '🌡️ Duy trì nhiệt độ 18-25°C',
                '💨 Giảm độ ẩm xuống 60-70%'
            ]
        },

        diseaseProgression: {
            currentStage: `Giai đoạn ${riskLevel}/5`,
            progressionSpeed,
            timeToSevere,
            transmissionRisk
        },

        treatmentStrategy: {
            immediateSteps,
            weeklyPlan,
            monthlyOutcome
        },

        economicImpact: {
            potentialLoss,
            treatmentCost,
            returnOnInvestment: roi,
            comparisonWithoutTreatment: comparison
        },

        riskAssessment: {
            spreadRisk: Math.min(100, spreadRisk),
            deathRisk: Math.min(100, deathRisk),
            resistanceCapacity,
            vulnerabilityFactors
        },

        historicalContext: {
            seasonalTrend,
            regionalPrevalence,
            treatmentSuccessRate
        },

        expertRecommendation
    };
};

export const formatAnalysisReport = (report: DetailedAnalysisReport): string => {
    return `
📊 PHÂN TÍCH CHI TIẾT VỀ TÌNH TRẠNG BỆNH

════════════════════════════════════════════════════════════════════

🔍 ĐÁNH GIÁ TOÀN THỂ
- Trạng thái sức khỏe: ${report.summaryAnalysis.healthStatus}
- Mức độ khẩn cấp: ${report.summaryAnalysis.diseaseUrgency}
- Ưu tiên xử lí: ${report.summaryAnalysis.treatmentPriority}
- Triển vọng hồi phục: ${report.summaryAnalysis.recoveryOutlook}

════════════════════════════════════════════════════════════════════

🌍 YẾU TỐ MÔI TRƯỜNG
- Điều kiện hiện tại: ${report.environmentalFactors.currentCondition}
- % đóng góp vào bệnh: ${report.environmentalFactors.riskContribution}%
- Khuyến nghị:
${report.environmentalFactors.recommendations.map(r => `  • ${r}`).join('\n')}

════════════════════════════════════════════════════════════════════

📈 TIẾN TriỂN BỆNH
- Giai đoạn hiện tại: ${report.diseaseProgression.currentStage}
- Tốc độ phát triển: ${report.diseaseProgression.progressionSpeed}
- Thời gian nguy hiểm: ${report.diseaseProgression.timeToSevere}
- Nguy hiểm lây lan: ${report.diseaseProgression.transmissionRisk}

════════════════════════════════════════════════════════════════════

💊 CHIẾN LƯỢC XỬ LÍ

Bước ngay hôm nay:
${report.treatmentStrategy.immediateSteps.map(s => `  ${s}`).join('\n')}

Kế hoạch tuần:
${report.treatmentStrategy.weeklyPlan.map(w => `
  TUẦN ${w.week}: ${w.focus}
  Hành động: ${w.actions.join(' | ')}
  Kỳ vọng: ${w.expectedResult}
`).join('')}

Kỳ vọng sau 1 tháng: ${report.treatmentStrategy.monthlyOutcome}

════════════════════════════════════════════════════════════════════

💰 PHÂN TÍCH KINH TẾ
- Mất mùa có thể: ${report.economicImpact.potentialLoss}
- Chi phí xử lí: ${report.economicImpact.treatmentCost}
- ROI: ${report.economicImpact.returnOnInvestment}
- Tương đối: ${report.economicImpact.comparisonWithoutTreatment}

════════════════════════════════════════════════════════════════════

⚠️ ĐÁNH GIÁ RỦI RO
- Nguy hiểm lây lan: ${report.riskAssessment.spreadRisk}%
- Nguy hiểm chết cây: ${report.riskAssessment.deathRisk}%
- Khả năng chống cự: ${report.riskAssessment.resistanceCapacity}
- Yếu tố làm yếu:
${report.riskAssessment.vulnerabilityFactors.map(v => `  • ${v}`).join('\n')}

════════════════════════════════════════════════════════════════════

📚 NGỮ CẢNH LỊCH SỬ
- Xu hướng mùa: ${report.historicalContext.seasonalTrend}
- Phổ biến theo khu vực: ${report.historicalContext.regionalPrevalence}
- Tỷ lệ thành công xử lí: ${report.historicalContext.treatmentSuccessRate}

════════════════════════════════════════════════════════════════════

💬 LỜI KHUYÊN TỪ CHUYÊN GIA
${report.expertRecommendation}

════════════════════════════════════════════════════════════════════
    `;
};
