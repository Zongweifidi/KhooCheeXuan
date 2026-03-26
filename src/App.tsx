import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Rescue from './pages/Rescue';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/rescue" element={<Rescue />} />
      </Routes>
    </Router>
  );
}
