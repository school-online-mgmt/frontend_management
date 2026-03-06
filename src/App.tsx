import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SubjectPage from './Pages/Subject';
import LoginPage from './Pages/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/subject"element={<SubjectPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;