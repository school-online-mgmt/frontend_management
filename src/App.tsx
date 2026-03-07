import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SubjectPage from './Pages/Subject';
import LoginPage from './Pages/Login';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-main-viewport">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/subject" element={<SubjectPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;