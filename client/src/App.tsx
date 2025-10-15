import React from 'react';
import ImageUploader from './components/ImageUploader';
import PredictionView from './components/PredictionView';
import ResultsChart from './components/ResultsChart';
import './styles/main.css';

const App: React.FC = () => {
  return (
    <div className="App">
      <h1>Leaf Disease Detector</h1>
      <ImageUploader />
      <PredictionView />
      <ResultsChart />
    </div>
  );
};

export default App;