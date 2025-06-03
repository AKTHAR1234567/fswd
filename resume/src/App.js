import React, { useState } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('');

  const handleDownload = () => {
    setMessage('Downloading your resume... 🚀');
    window.location.href = 'https://fswd-ouad.onrender.com/resume';
  };

  return (
    <div className="container">
      <h2><i className="fas fa-file-download"></i> Download Resume</h2>
      <button onClick={handleDownload}>
        <i className="fas fa-cloud-download-alt"></i> Download
      </button>
      {message && <div className="message">{message}</div>}
    </div>
  );
}

export default App;
