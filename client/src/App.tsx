import React, { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import CropManagement from './components/CropManagement';
import Chatbot from './components/Chatbot';
import './styles/main.css';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'prediction' | 'crops'>('prediction');

  return (
    <div className="App">
      <header className="app-header">
        <h1>🌿 Máy Dò Bệnh Lá Cây Thông Minh</h1>
        <p>Sử dụng AI để phát hiện bệnh cây trồng từ hình ảnh</p>
      </header>

      <nav className="app-nav">
        <button
          className={`tab-btn ${activeTab === 'prediction' ? 'active' : ''}`}
          onClick={() => setActiveTab('prediction')}
        >
          📷 Phân tích ảnh
        </button>
        <button
          className={`tab-btn ${activeTab === 'crops' ? 'active' : ''}`}
          onClick={() => setActiveTab('crops')}
        >
          🌱 Quản lý cây
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'prediction' && (
          <div className="tab-content">
            <ImageUploader />
          </div>
        )}
        {activeTab === 'crops' && (
          <div className="tab-content">
            <CropManagement />
          </div>
        )}
      </main>

      {/* Chatbot Widget */}
      <Chatbot cropType="tomato" />
    </div>
  );
};

export default App;