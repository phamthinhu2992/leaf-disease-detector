/**
 * Chatbot Routes - API endpoints for AI expert Q&A
 * Lộ trình API hỏi-đáp chuyên gia
 */

import express, { Request, Response } from 'express';
import chatbotService from '../services/chatbotService';

const router = express.Router();

/**
 * POST /api/chatbot/ask - Gửi câu hỏi cho AI
 * Body: { question: string, cropType?: string, diseaseDetected?: string, confidence?: number }
 */
router.post('/ask', (req: Request, res: Response) => {
    try {
        const { question, cropType, diseaseDetected, confidence } = req.body;

        if (!question) {
            return res.status(400).json({ error: 'Missing question' });
        }

        const response = chatbotService.handleUserMessage(question, {
            cropType,
            diseaseDetected,
            confidence
        });

        res.json({
            success: true,
            data: response
        });
    } catch (error: any) {
        console.error('❌ Error in chatbot route:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/chatbot/suggestions?crop=tomato - Gợi ý câu hỏi
 */
router.get('/suggestions', (req: Request, res: Response) => {
    try {
        const { crop } = req.query;
        const cropType = (crop as string)?.toLowerCase() || 'tomato';

        const suggestions = {
            tomato: [
                'Cách chăm sóc cây cà chua',
                'Bệnh đốm lá cà chua là gì',
                'Làm thế nào để phòng chống bệnh',
                'Thời tiết ảnh hưởng như thế nào đến cây',
                'Nên tưới nước mấy lần một ngày'
            ],
            pepper: [
                'Cách trồng tiêu hiệu quả',
                'Bệnh Anthracnose trên tiêu',
                'Khoảng cách giữa các cây tiêu',
                'Phòng chống bệnh cho tiêu',
                'Thời tiết lý tưởng cho tiêu'
            ],
            potato: [
                'Cách trồng khoai tây',
                'Bệnh Late Blight là gì',
                'Xoay vụ khoai tây',
                'Phòng chống bệnh khoai tây',
                'Thu hoạch khoai tây khi nào'
            ]
        };

        res.json({
            success: true,
            data: suggestions[cropType as keyof typeof suggestions] || suggestions.tomato
        });
    } catch (error: any) {
        console.error('❌ Error fetching suggestions:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/chatbot/disease-info - Lấy thông tin bệnh
 * Body: { diseaseName: string, cropType: string }
 */
router.post('/disease-info', (req: Request, res: Response) => {
    try {
        const { diseaseName, cropType } = req.body;

        if (!diseaseName || !cropType) {
            return res.status(400).json({ error: 'Missing diseaseName or cropType' });
        }

        const response = chatbotService.handleUserMessage(
            `Cho tôi biết chi tiết về bệnh ${diseaseName}`,
            {
                cropType,
                diseaseDetected: diseaseName
            }
        );

        res.json({
            success: true,
            data: response
        });
    } catch (error: any) {
        console.error('❌ Error fetching disease info:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/chatbot/health - Health check
 */
router.get('/health', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: '🤖 Chatbot service is running',
        version: '1.0.0'
    });
});

export default router;
