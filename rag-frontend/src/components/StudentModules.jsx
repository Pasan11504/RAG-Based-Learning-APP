import React, { useState } from "react";
import { 
  generateStudentSummary, 
  generateStudentPractice, 
  checkStudentAnswers 
} from "../api";

const StudentModules = ({ documents, model }) => {
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedFileId, setSelectedFileId] = useState("");

  // Summary
  const [summaryOutput, setSummaryOutput] = useState("");
  const [loading, setLoading] = useState(false);

  // Practice Questions
  const [numQuestions, setNumQuestions] = useState(5);
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  const [studentAnswers, setStudentAnswers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [showPopup, setShowPopup] = useState(false);


  const handleSummary = async () => {
    if (!selectedFileId) return alert("Select a resource first.");
    setLoading(true);
    try {
      const data = await generateStudentSummary(selectedFileId, model);
      setSummaryOutput(data.summary);
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  };

  const handlePractice = async () => {
  if (!selectedFileId) return alert("Select a resource first.");

  setLoading(true);
  try {
    const data = await generateStudentPractice(selectedFileId, numQuestions, model);

    console.log("PRACTICE RESPONSE:", data); // ✅ NOW data exists

    if (!data || !Array.isArray(data.questions)) {
      alert("Invalid response from server.");
      return;
    }

    setPracticeQuestions(data.questions);
    setStudentAnswers(Array(data.questions.length).fill(""));
    setFeedback([]);
  } catch (err) {
    alert(err.message);
  }
  setLoading(false);
};

  const handleCheckAnswers = async () => {
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 2000); // auto-hide after 2 seconds
    const correct = practiceQuestions.map(q => q.correct_answer);
    const explanations = practiceQuestions.map(q => q.explanation);
    const questions = practiceQuestions.map(q => q.question);

    const data = await checkStudentAnswers(
      questions,
      studentAnswers,
      correct,
      explanations
    );

    setFeedback(data.results);
  };

  return (
    <div className="flex-1 p-6 bg-white overflow-y-auto">
      {/* Tabs */}
      <div className="flex gap-4 border-b mb-6">
        <button 
          onClick={() => setActiveTab("summary")}
          className={`pb-2 font-semibold border-b-2 ${
            activeTab === "summary" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          📘 Summary Generator
        </button>

        <button 
          onClick={() => setActiveTab("practice")}
          className={`pb-2 font-semibold border-b-2 ${
            activeTab === "practice" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          📝 Practice Questions
        </button>

        <button 
          onClick={() => setActiveTab("feedback")}
          className={`pb-2 font-semibold border-b-2 ${
            activeTab === "feedback" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          💯 Feedback
        </button>
      </div>

     {/* Summary Tab */}
{activeTab === "summary" && (
  <div className="max-w-xl mx-auto space-y-6">

    {/* Card Container */}
    <div className="bg-white shadow-md border rounded-lg p-6 space-y-6">

      {/* Vertical Controls */}
      <div className="flex flex-col space-y-4 w-full">

        {/* Resource Selector */}
        <select 
          value={selectedFileId}
          onChange={(e) => setSelectedFileId(e.target.value)}
          className="p-2 border rounded w-full"
        >
          <option value="">Choose resource...</option>
          {documents.map(doc => (
            <option key={doc.id} value={doc.id}>{doc.filename}</option>
          ))}
        </select>

        {/* Generate Summary Button */}
        <button 
          onClick={handleSummary}
          className="bg-blue-600 text-white p-2 rounded cursor-pointer hover:bg-blue-700 transition w-full"
        >
          {loading ? "Generating..." : "Generate Summary"}
        </button>

      </div>

      {/* Summary Output */}
      {summaryOutput && (
        <div className="p-4 bg-gray-50 border rounded whitespace-pre-wrap">
          {summaryOutput}
        </div>
      )}

    </div>

  </div>
)}

      {/* Practice Tab */}
{activeTab === "practice" && (
  <div className="max-w-xl mx-auto space-y-6">

    {/* Card Container */}
    <div className="bg-white shadow-md border rounded-lg p-6 space-y-6">

      {/* Vertical Controls */}
      <div className="flex flex-col space-y-4 w-full">

        {/* Resource Selector */}
        <select 
          value={selectedFileId}
          onChange={(e) => setSelectedFileId(e.target.value)}
          className="p-2 border rounded w-full"
        >
          <option value="">Choose resource...</option>
          {documents.map(doc => (
            <option key={doc.id} value={doc.id}>{doc.filename}</option>
          ))}
        </select>

        {/* Slider */}
        <div className="flex flex-col">
          <label className="font-medium">
            Number of Questions: {numQuestions}
          </label>
          <input 
            type="range"
            min="1"
            max="10"
            value={numQuestions}
            onChange={(e) => setNumQuestions(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Generate Button */}
        <button 
          onClick={handlePractice}
          className="bg-blue-600 text-white p-2 rounded cursor-pointer hover:bg-blue-700 transition w-full"
        >
          {loading ? "Generating..." : "Generate Practice Questions"}
        </button>

      </div>

      {/* Practice Questions */}
      {Array.isArray(practiceQuestions) && practiceQuestions.length > 0 && (
        <div className="space-y-4">
          {practiceQuestions.map((q, idx) => (
            <div key={idx} className="p-4 border rounded bg-gray-50">
              <p className="font-semibold">{q.question}</p>
              <input 
                type="text"
                value={studentAnswers[idx]}
                onChange={(e) => {
                  const updated = [...studentAnswers];
                  updated[idx] = e.target.value;
                  setStudentAnswers(updated);
                }}
                className="mt-2 p-2 border rounded w-full"
                placeholder="Your answer..."
              />
            </div>
          ))}

          {/* Submit Button */}
          <button 
            onClick={handleCheckAnswers}
            className="bg-green-600 text-white p-2 rounded cursor-pointer hover:bg-green-700 transition w-full"
          >
            Submit Answers
          </button>
        </div>
      )}

    </div>

    {/* Popup Notification */}
    {showPopup && (
      <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded shadow-lg">
        Check feedbacks
      </div>
    )}

  </div>
)}


      {/* Feedback Tab */}
      {activeTab === "feedback" && (
        <div className="space-y-4 max-w-3xl">
          {feedback.length === 0 && (
            <p className="text-gray-500">No feedback yet. Generate practice questions first.</p>
          )}

          {feedback.map((item, idx) => (
            <div key={idx} className="p-4 border rounded bg-gray-50">
              <p className="font-semibold">{item.question}</p>
              <p>Your Answer: {item.student_answer}</p>
              <p>Correct Answer: {item.correct_answer}</p>
              <p className={item.is_correct ? "text-green-600" : "text-red-600"}>
                {item.is_correct ? "Correct" : "Incorrect"}
              </p>
              <p className="text-sm text-gray-600 mt-2">{item.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentModules;
