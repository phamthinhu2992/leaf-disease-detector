// Deep Diagnosis Service - Provides detailed analysis and solutions
// Cung cấp chẩn đoán sâu với lý lẽ và giải pháp chi tiết

export interface DetailedDiagnosis {
    overview: string;
    whyItHappens: string[];
    riskFactors: string[];
    stageOfDisease: string;
    immediateActions: string[];
    shortTermTreatment: {
        week: string;
        actions: string[];
    }[];
    longTermPrevention: string[];
    farmingPractices: string[];
    professionalRecommendations: string;
}

export const generateDeepDiagnosis = (
    diseaseName: string,
    cause: string,
    conditions: string[],
    symptoms: string[],
    treatment: string[],
    prevention: string[],
    severity: string
): DetailedDiagnosis => {
    let diagnosis: DetailedDiagnosis = {
        overview: '',
        whyItHappens: [],
        riskFactors: [],
        stageOfDisease: '',
        immediateActions: [],
        shortTermTreatment: [],
        longTermPrevention: [],
        farmingPractices: [],
        professionalRecommendations: ''
    };

    // Build overview
    diagnosis.overview = `
🔬 **CHẨN ĐOÁN CHI TIẾT: ${diseaseName}**

Cây của bạn đang bị nhiễm **${diseaseName}**. Đây là một bệnh ${severity === 'RẤT CAO' ? 'RẤT NGUY HIỂM' :
            severity === 'CAO' ? 'NGUY HIỂM' : 'CẦN THEO DÕI'
        } nếu không được kiểm soát kịp thời. Tuy nhiên, với các biện pháp phòng chống đúng cách, 
bệnh này là hoàn toàn có thể kiểm soát được.
  `;

    // Why it happens
    diagnosis.whyItHappens = [
        `**Nguyên nhân chính**: ${cause}`,
        ...conditions.map(c => `• Điều kiện thuận lợi: ${c}`),
        `• Bệnh tấn công: Lá bệnh xuất hiện từ những dấu hiệu đầu tiên: ${symptoms[0]}`
    ];

    // Risk factors based on severity
    diagnosis.riskFactors = [
        `⚠️ Mức độ nguy hiểm: ${severity}`,
        severity === 'RẤT CAO' ?
            '🔴 CẢNH BÁO: Có thể mất 50-100% năng suất nếu không xử lý ngay' :
            severity === 'CAO' ?
                '🟠 CẢNH BÁO: Có thể mất 30-70% năng suất' :
                '🟡 CẢNH BÁO: Cần theo dõi sát',
        '• Thời gian tới hạn để can thiệp: Trong 7-10 ngày',
        '• Tốc độ lây lan: Rất nhanh, đặc biệt khi thời tiết thuận lợi'
    ];

    // Stage of disease
    diagnosis.stageOfDisease = `
**GIAI ĐOẠN BỆNH HIỆN TẠI:**

Dựa trên triệu chứng được phát hiện, cây của bạn đang ở giai đoạn **TRUNG BÌNH ĐẾN NẶNG**:
- ✓ Bệnh đã xuất hiện trên nhiều lá
- ✓ Cây bắt đầu suy yếu
- ✓ Cần can thiệp ngay để tránh bệnh lan rộng

**NẾU KHÔNG KIỂM SOÁT NGAY:**
- 3-5 ngày: Bệnh sẽ lan sang toàn bộ cây
- 1-2 tuần: Cây bắt đầu chết
- 1 tháng: Có thể toàn bộ ruộng bị ảnh hưởng
  `;

    // Immediate actions
    diagnosis.immediateActions = [
        '⚡ **HÔMMAY PHẢI LÀM:**',
        '1️⃣ Cách ly cây bệnh - Tách cây bệnh ra khỏi cây khỏe mạnh ngay',
        '2️⃣ Cắt lá bệnh - Loại bỏ toàn bộ lá bị bệnh, đặc biệt lá dưới',
        '3️⃣ Mua thuốc - Đến hiệu nông dược mua các loại thuốc phòng trừ',
        `4️⃣ Chuẩn bị xịt - Chuẩn bị nước, bình phun, khẩu trang`,
        '5️⃣ Xịt thuốc - Phun thuốc ngay trong buổi chiều (tránh nắng trưa)',
        '6️⃣ Kiểm tra hàng ngày - Theo dõi từng ngày xem bệnh có cải thiện không'
    ];

    // Short term treatment by week
    diagnosis.shortTermTreatment = [
        {
            week: '**TUẦN 1: Kiểm Soát Bệnh**',
            actions: [
                `🔴 Ngày 1-2: Phun ${treatment[0] || 'thuốc nấm'}`,
                `🟠 Ngày 3-4: Phun ${treatment[1] || 'thuốc nấm khác'}`,
                '🟡 Ngày 5-7: Kiểm tra, phun lại nếu cần',
                '⚠️ Cắt bỏ lá bệnh hàng ngày',
                '💧 Không tưới lên lá, tưới gốc vào sáng sớm'
            ]
        },
        {
            week: '**TUẦN 2: Ổn Định**',
            actions: [
                '✅ Kiểm tra bệnh có giảm không',
                `📋 Phun ${treatment[1] || 'thuốc'} mỗi 3-4 ngày`,
                '🌱 Bắt đầu bón phân để tăng sức đề kháng',
                '🔍 Theo dõi triệu chứng mới'
            ]
        },
        {
            week: '**TUẦN 3-4: Phục Hồi**',
            actions: [
                '✅ Phun phòng ngừa 2 lần/tuần',
                '🌿 Tăng ánh sáng, thông gió',
                '💪 Bón phân khoáng để cây khỏe',
                '🎯 Chuẩn bị phòng chống dài hạn'
            ]
        }
    ];

    // Long term prevention
    diagnosis.longTermPrevention = [
        '🛡️ **PHÒNG NGỪA DÀI HẠN (SAU KHI HỒI PHỤC):**',
        '1. **Mỗi tuần 1 lần**: Kiểm tra kỹ từng cây, phát hiện bệnh sớm',
        '2. **Mỗi 2 tuần**: Phun phòng ngừa (Sulfur hoặc thuốc nấm khác)',
        '3. **Mỗi 1 tháng**: Bón phân khoáng để tăng sức đề kháng',
        '4. **Liên tục**: Tỉa cây, cắt lá dưới, tăng thông gió',
        '5. **Tránh**: Tưới lên lá buổi tối, tưới quá nhiều',
        '6. **Chọn**: Giống kháng bệnh nếu có',
        '7. **Xây dựng**: Khoảng cách cây hợp lý để thông gió'
    ];

    // Farming practices
    diagnosis.farmingPractices = [
        '🌾 **THAY ĐỔI CÁCH CANH TÁC:**',
        '✓ Tường tận: Không trồng loại cây này liên tiếp',
        '✓ Đất: Lựa chọn đất thoát nước tốt',
        '✓ Nước: Tưới gốc vào sáng sớm, không tưới buổi tối',
        '✓ Phân: Bón phân cân đối (N:P:K = 1:1:1)',
        '✓ Công cụ: Tiệt trùng dụng cụ trước khi dùng',
        '✓ Lựa chọn: Trồng cây khác xen kẽ để tránh dư địa bệnh'
    ];

    // Professional recommendations
    diagnosis.professionalRecommendations = `
**📞 KHI NÀO NÊN GỌI CHUYÊN GIA:**

✅ Nếu sau 1 tuần xử lý, bệnh vẫn không cải thiện
✅ Nếu bệnh lan sang nhiều cây khác
✅ Nếu cây bắt đầu héo xanh (dấu hiệu bệnh thứ cấp)
✅ Nếu không biết chắc nên dùng thuốc nào

**🏥 Địa chỉ liên hệ:**
- Trung tâm Bảo vệ thực vật địa phương
- Hiệu nông dược uy tín
- Kỹ sư nông lâm trạm nông nghiệp
- Hotline hỗ trợ nông dân (nếu có)
  `;

    return diagnosis;
};

// Format diagnosis for display
export const formatDeepDiagnosis = (diagnosis: DetailedDiagnosis): string => {
    let output = diagnosis.overview + '\n\n';

    output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    output += '**❓ TẠI SAO LẠI CÓ BỆNH NÀY?**\n';
    for (const reason of diagnosis.whyItHappens) {
        output += reason + '\n';
    }
    output += '\n';

    output += '**⚠️ ĐÁNH GIÁ RỦI RO:**\n';
    for (const factor of diagnosis.riskFactors) {
        output += factor + '\n';
    }
    output += '\n';

    output += diagnosis.stageOfDisease + '\n\n';

    output += '**🚨 HÀNH ĐỘNG NGAY LẬP TỨC:**\n';
    for (const action of diagnosis.immediateActions) {
        output += action + '\n';
    }
    output += '\n';

    output += '**📅 KỲ HOẠCH ĐIỀU TRỊ CHI TIẾT:**\n';
    for (const period of diagnosis.shortTermTreatment) {
        output += '\n' + period.week + '\n';
        for (const action of period.actions) {
            output += '  ' + action + '\n';
        }
    }
    output += '\n';

    output += diagnosis.longTermPrevention.join('\n') + '\n\n';

    output += diagnosis.farmingPractices.join('\n') + '\n\n';

    output += diagnosis.professionalRecommendations;

    return output;
};

export default {
    generateDeepDiagnosis,
    formatDeepDiagnosis
};
