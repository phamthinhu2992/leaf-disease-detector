// Crop Detection and Classification Service
// Automatically detects crop type from image filename

export interface CropInfo {
    name: string;
    keywords: string[];
    vietnamese_name: string;
    common_names: string[];
}

export const CROP_DETECTION = {
    'Lúa': {
        name: 'Lúa',
        keywords: ['lúa', 'rice', 'lua', 'lúc', 'paddy', 'gạo'],
        vietnamese_name: 'Lúa',
        common_names: ['Lúa nước', 'Lúa tấm', 'Lúa mùa', 'Lúa hè thu']
    },
    'Cà phê': {
        name: 'Cà phê',
        keywords: ['cà phê', 'coffee', 'ca phe', 'cà phê robusta', 'cà phê arabica', 'coffea'],
        vietnamese_name: 'Cà phê',
        common_names: ['Cà phê robusta', 'Cà phê arabica', 'Cà phê']
    },
    'Sầu riêng': {
        name: 'Sầu riêng',
        keywords: ['sầu riêng', 'durian', 'sao rieng', 'vua trái cây'],
        vietnamese_name: 'Sầu riêng',
        common_names: ['Sầu riêng', 'Vua trái cây', 'Durian', 'Sầu riêng Monthong']
    },
    'Tiêu': {
        name: 'Tiêu',
        keywords: ['tiêu', 'pepper', 'hạt tiêu', 'black pepper'],
        vietnamese_name: 'Tiêu',
        common_names: ['Tiêu đen', 'Tiêu trắng', 'Hạt tiêu']
    },
    'Đậu phộng': {
        name: 'Đậu phộng',
        keywords: ['đậu phộng', 'peanut', 'dậu phộng', 'lạc'],
        vietnamese_name: 'Đậu phộng',
        common_names: ['Lạc', 'Đậu phộng']
    },
    'Khoai mì': {
        name: 'Khoai mì',
        keywords: ['khoai mì', 'cassava', 'sắn', 'khoai sắn'],
        vietnamese_name: 'Khoai mì',
        common_names: ['Sắn', 'Khoai sắn', 'Cassava']
    },
    'Khoai lang': {
        name: 'Khoai lang',
        keywords: ['khoai lang', 'sweet potato', 'khoai lang vàng', 'khoai lang tím'],
        vietnamese_name: 'Khoai lang',
        common_names: ['Khoai lang tím', 'Khoai lang vàng', 'Khoai lang trắng']
    },
    'Cà chua': {
        name: 'Cà chua',
        keywords: ['cà chua', 'tomato', 'ca chua', 'cà chua cây'],
        vietnamese_name: 'Cà chua',
        common_names: ['Cà chua tươi', 'Cà chua chè', 'Cà chua']
    },
    'Rau cải': {
        name: 'Rau cải',
        keywords: ['rau cải', 'vegetable', 'rau', 'cải', 'cải xanh', 'cải bắp', 'rau ăn lá'],
        vietnamese_name: 'Rau cải',
        common_names: ['Cải xanh', 'Cải bắp', 'Cải thảo', 'Rau muống']
    }
};

// Detect crop from filename
export const detectCrop = (filename: string): string => {
    const lowerFilename = filename.toLowerCase();

    for (const [cropName, cropInfo] of Object.entries(CROP_DETECTION)) {
        for (const keyword of cropInfo.keywords) {
            const regex = new RegExp(keyword, 'i');
            if (regex.test(lowerFilename)) {
                return cropName;
            }
        }
    }

    // Default to "Lúa" if no specific crop detected
    return 'Lúa';
};

// Get crop info
export const getCropInfo = (cropName: string): CropInfo => {
    return CROP_DETECTION[cropName as keyof typeof CROP_DETECTION] || CROP_DETECTION['Lúa'];
};

// Get all crops
export const getAllCrops = () => {
    return Object.keys(CROP_DETECTION);
};

export default {
    detectCrop,
    getCropInfo,
    getAllCrops,
    CROP_DETECTION
};
