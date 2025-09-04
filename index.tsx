import React from 'react';
import ReactDOM from 'react-dom/client';

const TestApp = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>🚀 React is Working!</h1>
      <p>If you can see this, React is properly loaded.</p>
      <p>Next step: Fix the Gemini API connection.</p>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<TestApp />);
}
