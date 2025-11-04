/**
 * AI Chatbot Service - Hệ thống hỏi-đáp chuyên gia nông nghiệp
 * Ngôn ngữ tự nhiên + Cơ sở dữ liệu kiến thức
 */

interface ChatResponse {
    success: boolean;
    message: string;
    sources?: string[];
    confidence?: number;
}

/**
 * Knowledge base for Vietnamese agricultural diseases
 * Cơ sở dữ liệu kiến thức về bệnh cây trồng Việt Nam
 */
const diseaseKnowledgeBase = {
    tomato: {
        'Early Blight': {
            symptoms: 'Đốm tròn màu nâu trên lá cũ, có vòng đồng tâm, lá vàng dần và rụng',
            causes: 'Nấm Alternaria, phát triển ở điều kiện ẩm ướt (RH > 80%), nhiệt độ 15-25°C',
            treatment: 'Phun thiram, mancozeb, hay chlorothalonil 2-3 lần mỗi tuần. Loại bỏ lá dưới cây.',
            prevention: 'Thoát nước tốt, tránh tưới nước lên lá, cách quãng giữa các cây',
            severity: 'Trung bình - Có thể kiểm soát với thuốc'
        },
        'Late Blight': {
            symptoms: 'Đốm nước màu xám trên lá, quả, thân. Lá vàng, héo và rụng nhanh',
            causes: 'Nấm Phytophthora infestans, thích hợp ở điều kiện lạnh ẩm (10-20°C, RH > 85%)',
            treatment: 'Phun metalaxyl + mancozeb ngay khi phát hiện. Phun liên tục 5-7 ngày một lần',
            prevention: 'Xoay vụ, loại bỏ dư thừa cây, thoát nước tốt, cách quãng giữa các cây',
            severity: 'Cao - Có thể làm hại nghiêm trọng toàn bộ vụ'
        },
        'Leaf Spot': {
            symptoms: 'Đốm nhỏ màu nâu đen trên lá, có viền vàng, lá vàng và rụng từ từ',
            causes: 'Nấm Septoria lycopersici, phát triển ở điều kiện ẩm ướt',
            treatment: 'Phun mancozeb, chlorothalonil 2-3 lần mỗi tuần',
            prevention: 'Tránh tưới nước lên lá, cải thiện thông gió, loại bỏ lá bệnh',
            severity: 'Trung bình'
        },
        'Powdery Mildew': {
            symptoms: 'Lớp bột trắng trên lá, thân, quả. Lá cuộn lại và khô',
            causes: 'Nấm Oidiopsis, phát triển ở điều kiện khô ráp và ấm (20-25°C, RH < 60%)',
            treatment: 'Phun lưu huỳnh, hay sulfur-based fungicide. Sử dụng PGR để kiểm soát sinh trưởng',
            prevention: 'Tránh tưới nước quá nhiều, cải thiện thông gió, tránh tác động yếu ớt',
            severity: 'Nhẹ - Dễ kiểm soát'
        }
    },
    pepper: {
        'Anthracnose': {
            symptoms: 'Đốm tròn màu đen trên lá, thân, quả. Lá rụng, quả héo',
            causes: 'Nấm Colletotrichum, phát triển ở điều kiện ấm ẩm (25°C+, RH > 80%)',
            treatment: 'Phun carbendazim, benomyl, hay azoxystrobin. Phun 3-4 lần mỗi tuần',
            prevention: 'Xoay vụ, loại bỏ dư thừa cây, cách quãng giữa các cây, tránh tưới nước lên lá',
            severity: 'Cao - Có thể làm hại quả'
        },
        'Phytophthora Blight': {
            symptoms: 'Đốm nước trên quả, thân; gốc thân héo, lá vàng nhanh',
            causes: 'Phytophthora capsici, phát triển ở đất ẩm ướt và điều kiện lạnh hơn',
            treatment: 'Phun metalaxyl, chăm sóc drenage, loại bỏ cây bệnh nặng',
            prevention: 'Xoay vụ dài hạn (3-4 năm), thoát nước tốt, sử dụng giống kháng',
            severity: 'Rất cao - Có thể phá hủy toàn vụ'
        }
    },
    potato: {
        'Late Blight': {
            symptoms: 'Đốm nước xám trên lá, gốc lá, thân; quả bị mục rót',
            causes: 'Phytophthora infestans, thích hợp ở điều kiện lạnh ẩm (10-20°C, RH > 85%)',
            treatment: 'Phun metalaxyl + mancozeb 5-7 ngày một lần. Loại bỏ lá dưới',
            prevention: 'Xoay vụ, loại bỏ dư thừa cây, thoát nước tốt, sử dụng giống kháng',
            severity: 'Rất cao - Bệnh chủ yếu của khoai tây'
        },
        'Early Blight': {
            symptoms: 'Đốm tròn nâu trên lá cũ, có vòng đồng tâm, lá vàng từ từ',
            causes: 'Alternaria solani, phát triển ở điều kiện ấm ẩm',
            treatment: 'Phun thiram, mancozeb hoặc chlorothalonil',
            prevention: 'Loại bỏ lá dưới, cải thiện thông gió, tỉa cành chết',
            severity: 'Trung bình'
        }
    }
};

class ChatbotService {
    private readonly conversationHistory: any[] = [];

    /**
     * Xử lý tin nhắn từ người dùng
     */
    handleUserMessage(userMessage: string, context?: any): ChatResponse {
        try {
            // Tìm kiếm kiến thức phù hợp
            const response = this.generateResponse(userMessage, context);
            return response;
        } catch (error: any) {
            console.error('❌ Error in chatbot:', error);
            return {
                success: false,
                message: 'Xin lỗi, tôi đang gặp vấn đề. Vui lòng thử lại sau.'
            };
        }
    }

    /**
     * Tạo phản hồi dựa trên kiến thức cơ sở
     */
    private generateResponse(userMessage: string, context?: any): ChatResponse {
        const message = userMessage.toLowerCase();
        const cropType = context?.cropType?.toLowerCase() || '';
        const diseaseDetected = context?.diseaseDetected?.toLowerCase() || '';

        // Xử lý các câu hỏi về bệnh cụ thể
        if (diseaseDetected && diseaseKnowledgeBase[cropType as keyof typeof diseaseKnowledgeBase]) {
            const cropDb = diseaseKnowledgeBase[cropType as keyof typeof diseaseKnowledgeBase];
            const diseaseKey = Object.keys(cropDb).find(key =>
                key.toLowerCase().includes(diseaseDetected) ||
                diseaseDetected.includes(key.toLowerCase())
            );

            if (diseaseKey) {
                const diseaseInfo = cropDb[diseaseKey as keyof typeof cropDb];
                return {
                    success: true,
                    message: this.formatDiseaseAdvice(diseaseKey, diseaseInfo, cropType),
                    confidence: 0.95
                };
            }
        }

        // Xử lý câu hỏi về cách chăm sóc cây
        if (message.includes('cách') || message.includes('làm sao') || message.includes('nên') || message.includes('hay')) {
            return this.handleGeneralAdviceQuestion(message, cropType);
        }

        // Xử lý câu hỏi về phòng chống bệnh
        if (message.includes('phòng') || message.includes('chống') || message.includes('bệnh')) {
            return this.handleDiseasePrevention(message, cropType);
        }

        // Xử lý câu hỏi về thời tiết
        if (message.includes('thời tiết') || message.includes('mưa') || message.includes('nắng')) {
            return this.handleWeatherQuestion(message);
        }

        // Câu hỏi mặc định
        return {
            success: true,
            message: this.getDefaultResponse(cropType),
            confidence: 0.5
        };
    }

    /**
     * Định dạng lời khuyên về bệnh
     */
    private formatDiseaseAdvice(diseaseName: string, info: any, cropType: string): string {
        return `
🔍 **${diseaseName}** trên cây ${cropType}

**Triệu chứng:**
${info.symptoms}

**Nguyên nhân:**
${info.causes}

**Cách điều trị:**
✅ ${info.treatment}

**Cách phòng chống:**
🛡️ ${info.prevention}

**Mức độ nguy hiểm:** ${info.severity}

**Lời khuyên:**
1. Kiểm tra cây thường xuyên, phát hiện sớm
2. Loại bỏ lá/cây bệnh nặng ngay
3. Phun thuốc theo hướng dẫn, không quên bề mặt dưới lá
4. Cải thiện thông gió và thoát nước
5. Tránh tưới nước vào lá khi có bệnh
        `.trim();
    }

    /**
     * Xử lý câu hỏi lời khuyên chung
     */
    private handleGeneralAdviceQuestion(question: string, cropType: string): ChatResponse {
        const advice: { [key: string]: string } = {
            'tưới': 'Tưới nước thường xuyên, sáng sớm hoặc chiều tối. Đất nên ẩm nhưng không ngập nước.',
            'phân bón': 'Bón phân cân bằng N:P:K = 2:1:2. Bón lần đầu sau 2 tuần trồng, sau đó 2-3 lần/tuần.',
            'tỉa cành': 'Tỉa cành yếu, cành bệnh, cách quãng để cây thông gió tốt.',
            'trồng': `Khoảng cách giữa các cây ${cropType}: tối thiểu 40-50cm. Chuẩn bị đất, bón phân gốc trước.`,
            'hạn hán': 'Khi hạn hán, tưới nước sáng sớm, che nắng 30-40%, bón phân lá liên tục.',
            'mưa nhiều': 'Mưa nhiều, đảm bảo thoát nước tốt, tỉa cành để giảm độ ẩm, phun thuốc phòng bệnh.'
        };

        for (const [key, value] of Object.entries(advice)) {
            if (question.includes(key)) {
                return {
                    success: true,
                    message: `💡 Lời khuyên về ${key}:\n\n${value}`,
                    confidence: 0.85
                };
            }
        }

        return {
            success: true,
            message: '💡 Lời khuyên chung:\n\n1. Chọn giống phù hợp với địa phương\n2. Chuẩn bị đất kỹ lưỡng\n3. Tưới nước đều đặn\n4. Bón phân cân bằng\n5. Phòng chống sâu bệnh sớm',
            confidence: 0.7
        };
    }

    /**
     * Xử lý câu hỏi về phòng chống bệnh
     */
    private handleDiseasePrevention(question: string, cropType: string): ChatResponse {
        return {
            success: true,
            message: `🛡️ **Biện pháp phòng chống bệnh cho ${cropType}:**

1. **Chọn giống kháng bệnh** - Ưu tiên giống kháng được chứng minh
2. **Xoay vụ** - Không trồng cùng loại cây liên tiếp 2-3 năm
3. **Chuẩn bị đất** - Tiêu độc đất hoặc dùng phân cơ học
4. **Cách quãng hợp lý** - Tăng thông gió, giảm độ ẩm
5. **Tưới nước hợp lý** - Tránh tưới nước lên lá
6. **Vệ sinh cây trồng** - Loại bỏ lá/cành bệnh kịp thời
7. **Giám sát thường xuyên** - Phát hiện sớm, xử lý kịp thời
8. **Phun thuốc dự phòng** - Khi điều kiện thời tiết thuận lợi cho bệnh`,
            confidence: 0.9
        };
    }

    /**
     * Xử lý câu hỏi về thời tiết
     */
    private handleWeatherQuestion(question: string): ChatResponse {
        return {
            success: true,
            message: `☀️ **Tác động thời tiết đến cây trồng:**

**Thời tiết nắng:**
- Tăng cường tưới nước
- Che nắng 30-40% cho cây trẻ
- Tránh tưới nước giữa ngày

**Thời tiết mưa:**
- Đảm bảo thoát nước tốt
- Phun thuốc phòng bệnh
- Tỉa cành để giảm độ ẩm

**Thời tiết lạnh:**
- Giảm tưới nước
- Bón phân lá để tăng kháng lạnh
- Trồng cây giống kháng lạnh

**Thời tiết khô:**
- Tăng tần suất tưới nước
- Phủ sương giữ ẩm đất
- Bón phân cân bằng`,
            confidence: 0.85
        };
    }

    /**
     * Phản hồi mặc định
     */
    private getDefaultResponse(cropType: string): string {
        return `👋 Xin chào! Tôi là trợ lý nông nghiệp AI. Tôi có thể giúp bạn với:

1. **Cách chăm sóc cây ${cropType}** - Tưới nước, phân bón, tỉa cành
2. **Chẩn đoán bệnh** - Mô tả triệu chứng, tôi sẽ giúp xác định bệnh
3. **Lời khuyên phòng chống bệnh** - Biện pháp dự phòng hiệu quả
4. **Tác động thời tiết** - Làm thế nào để ứng phó với thời tiết cực đoan
5. **Kỹ thuật canh tác** - Thu hoạch, bảo quản, và các vấn đề khác

Vui lòng nêu rõ vấn đề bạn đang gặp phải, tôi sẽ cung cấp lời khuyên chi tiết và thực tế! 🌾`;
    }
}

export default new ChatbotService();
