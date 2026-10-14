import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Assistant from "./pages/Assistant.jsx";
import Materials from "./pages/Materials.jsx";
import Quiz from "./pages/Quiz.jsx";
import Flashcards from "./pages/Flashcards.jsx";
import Progress from "./pages/Progress.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/flashcards" element={<Flashcards />} />
        <Route path="/progress" element={<Progress />} />
      </Route>
    </Routes>
  );
}
