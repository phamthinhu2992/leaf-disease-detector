-- Schema cho database lưu trữ lịch sử dự đoán bệnh cây
-- File: database_schema.sql

-- Bảng người dùng (users)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    phone TEXT,
    location TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bảng hồ sơ cây trồng (crops) - NEW
CREATE TABLE IF NOT EXISTS crops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    crop_name TEXT NOT NULL,           -- Tên cây (Cà chua, Tiêu, Khoai, v.v.)
    crop_type TEXT NOT NULL,           -- Loại cây (tomato, pepper, potato, ...)
    location TEXT,                     -- Vị trí trồng
    latitude REAL,
    longitude REAL,
    area_hectare REAL,                 -- Diện tích (ha)
    planting_date DATE,                -- Ngày trồng
    variety TEXT,                      -- Giống/nhân giống
    soil_type TEXT,                    -- Loại đất
    irrigation_type TEXT,              -- Kiểu tưới
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Bảng lịch sử bệnh cho cây trồng (disease_history) - NEW
CREATE TABLE IF NOT EXISTS disease_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop_id INTEGER NOT NULL,
    disease_name TEXT NOT NULL,
    disease_severity TEXT,             -- 'mild', 'moderate', 'severe', 'critical'
    confidence_score REAL,
    detected_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    image_path TEXT,
    description TEXT,
    treatment_given TEXT,              -- Biện pháp xử lý đã dùng
    treatment_date TIMESTAMP,
    treatment_effectiveness TEXT,      -- 'poor', 'fair', 'good', 'excellent'
    notes TEXT,                        -- Ghi chú thêm
    resolved BOOLEAN DEFAULT 0,        -- Đã khỏi chưa
    resolved_date TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (crop_id) REFERENCES crops (id)
);

-- Bảng lịch sử dự đoán (predictions) - UPDATED
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    crop_id INTEGER,                   -- Link tới crop (NEW)
    image_filename TEXT NOT NULL,
    image_path TEXT,
    image_size INTEGER,
    content_type TEXT,
    
    -- Kết quả dự đoán
    prediction_result TEXT NOT NULL,
    confidence_score REAL NOT NULL,
    original_prediction TEXT,
    source TEXT DEFAULT 'huggingface',
    
    -- Thông tin model
    model_name TEXT,
    model_version TEXT,
    models_used INTEGER DEFAULT 1,
    total_models INTEGER DEFAULT 1,
    processing_time_ms REAL,
    
    -- Metadata
    ip_address TEXT,
    user_agent TEXT,
    latitude REAL,
    longitude REAL,
    weather_condition TEXT,
    
    -- Thời gian
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (crop_id) REFERENCES crops (id)
);

-- Bảng lịch sử chat với bot (chat_history)
CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    prediction_id INTEGER,
    
    -- Nội dung chat
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    message_type TEXT DEFAULT 'disease_consultation',
    
    -- Metadata
    response_source TEXT DEFAULT 'openai',
    response_time_ms REAL,
    tokens_used INTEGER,
    
    -- Thời gian
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (prediction_id) REFERENCES predictions (id)
);

-- Bảng feedback từ người dùng (feedback)
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    prediction_id INTEGER,
    
    -- Feedback content
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
    usefulness_rating INTEGER CHECK (usefulness_rating >= 1 AND usefulness_rating <= 5),
    comment TEXT,
    actual_disease TEXT,
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (prediction_id) REFERENCES predictions (id)
);

-- Bảng thống kê hệ thống (system_stats)
CREATE TABLE IF NOT EXISTS system_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    
    -- Thống kê sử dụng
    total_predictions INTEGER DEFAULT 0,
    total_users INTEGER DEFAULT 0,
    total_chat_messages INTEGER DEFAULT 0,
    
    -- Thống kê AI model
    successful_predictions INTEGER DEFAULT 0,
    failed_predictions INTEGER DEFAULT 0,
    average_confidence REAL DEFAULT 0,
    average_processing_time REAL DEFAULT 0,
    
    -- Thống kê bệnh phổ biến
    most_common_disease TEXT,
    disease_count INTEGER DEFAULT 0,
    
    -- Thống kê chatbot
    openai_requests INTEGER DEFAULT 0,
    fallback_responses INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date)
);

-- Bảng logs hệ thống (system_logs)
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_level TEXT NOT NULL,
    component TEXT NOT NULL,
    message TEXT NOT NULL,
    error_details TEXT,
    user_id INTEGER,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Tạo indexes để tăng tốc độ truy vấn
CREATE INDEX IF NOT EXISTS idx_crops_user_id ON crops(user_id);
CREATE INDEX IF NOT EXISTS idx_crops_created_at ON crops(created_at);
CREATE INDEX IF NOT EXISTS idx_disease_history_crop_id ON disease_history(crop_id);
CREATE INDEX IF NOT EXISTS idx_disease_history_detected_date ON disease_history(detected_date);
CREATE INDEX IF NOT EXISTS idx_disease_history_disease_name ON disease_history(disease_name);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_crop_id ON predictions(crop_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_predictions_result ON predictions(prediction_result);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_prediction_id ON chat_history(prediction_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_prediction_id ON feedback(prediction_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_log_level ON system_logs(log_level);

-- Thêm dữ liệu mẫu (sample data)
INSERT OR IGNORE INTO users (id, email, name, location) VALUES 
(1, 'admin@example.com', 'Quản trị viên', 'Hà Nội'),
(2, 'user1@example.com', 'Nguyễn Văn A', 'TP.HCM'),
(3, 'user2@example.com', 'Trần Thị B', 'Đà Nẵng');

-- Thêm sample crops (hồ sơ cây trồng)
INSERT OR IGNORE INTO crops (id, user_id, crop_name, crop_type, location, latitude, longitude, area_hectare, planting_date, variety) VALUES
(1, 2, 'Cà chua - Vườn chính', 'tomato', 'Ba Vì, Hà Nội', 21.1234, 105.5678, 3.0, '2025-09-01', 'T16'),
(2, 2, 'Tiêu - Đất cao', 'pepper', 'Ba Vì, Hà Nội', 21.1245, 105.5690, 1.5, '2024-03-15', 'Hàng Hóa'),
(3, 3, 'Khoai tây', 'potato', 'Lâm Đồng', 11.9404, 107.7845, 2.0, '2025-06-01', 'Jelly');

-- Thêm lịch sử bệnh mẫu
INSERT OR IGNORE INTO disease_history (crop_id, disease_name, disease_severity, confidence_score, detected_date, treatment_given, treatment_effectiveness, resolved) VALUES
(1, 'Early Blight', 'moderate', 0.87, datetime('2025-10-25 10:30:00'), 'Mancozeb 1%', 'good', 1),
(1, 'Powdery Mildew', 'mild', 0.72, datetime('2025-10-10 14:15:00'), 'Sulfur spray', 'excellent', 1),
(2, 'Bacterial Spot', 'severe', 0.91, datetime('2025-10-22 09:45:00'), 'Copper sulfate + Streptomycin', 'fair', 0);

-- Thêm sample prediction
INSERT OR IGNORE INTO predictions (
    user_id, image_filename, prediction_result, confidence_score, 
    model_name, processing_time_ms
) VALUES 
(1, 'sample_leaf.jpg', 'Bệnh đạo ôn lúa', 0.92, 'Ensemble AI Models', 150.5);

-- Thêm sample chat
INSERT OR IGNORE INTO chat_history (
    user_id, prediction_id, user_message, bot_response
) VALUES 
(1, 1, 'Cây lúa bị bệnh này có nguy hiểm không?', 
'Bệnh đạo ôn lúa là một trong những bệnh nguy hiểm nhất của lúa. Bạn cần xử lý ngay bằng cách...');