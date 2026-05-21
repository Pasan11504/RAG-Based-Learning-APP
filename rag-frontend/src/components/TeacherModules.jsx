import React, { useState } from 'react';
import { generateQuiz, autoMarkAnswer } from '../api';

const TeacherModules = ({ documents, model }) => {
  const [activeSubTab, setActiveSubTab] = useState('quizGen');
  const [selectedFileId, setSelectedFileId] = useState('');
  const [questionType, setQuestionType] = useState('MCQ');
  const [numQuestions, setNumQuestions] = useState(3);
  const [quizOutput, setQuizOutput] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auto Marking States
  const [questText, setQuestText] = useState('');
  const [modAns, setModAns] = useState('');
  const [studAns, setStudAns] = useState('');
  const [maxMarks, setMaxMarks] = useState(5);
  const [evalResult, setEvalResult] = useState(null);

  const handleQuizGeneration = async () => {
    if (!selectedFileId) return alert('Please select a textbook reference.');
    setLoading(true);
    setQuizOutput(null);
    try {
      const data = await generateQuiz(selectedFileId, questionType, numQuestions, model);
      setQuizOutput(data.quiz.questions);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMarking = async () => {
    if (!questText || !modAns || !studAns) return alert('Please input all evaluation fields.');
    setLoading(true);
    setEvalResult(null);
    try {
      const data = await autoMarkAnswer({ questionText: questText, modelAnswer: modAns, studentAnswer: studAns, maxMarks, model });
      setEvalResult(data.evaluation);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-white p-6 overflow-y-auto">
      <div className="flex border-b mb-6 gap-4">
        <button onClick={() => setActiveSubTab('quizGen')} className={`pb-2 font-semibold border-b-2 ${activeSubTab === 'quizGen' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
          🛠️ Lesson Aid Tool
        </button>
        <button onClick={() => setActiveSubTab('autoMark')} className={`pb-2 font-semibold border-b-2 ${activeSubTab === 'autoMark' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
          📝 Evaluation Center
        </button>
      </div>

      {activeSubTab === 'quizGen' ? (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-gray-50 p-4 rounded-lg border space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Generate Assessment from Knowledge Base</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Select Textbook Source Reference</label>
                <select value={selectedFileId} onChange={(e) => setSelectedFileId(e.target.value)} className="w-full p-2 border rounded bg-white">
                  <option value="">Choose file...</option>
                  {documents.map(doc => <option key={doc.id} value={doc.id}>{doc.filename}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Question Type Context</label>
                <select value={questionType} onChange={(e) => setQuestionType(e.target.value)} className="w-full p-2 border rounded bg-white">
                  <option value="MCQ">Multiple Choice (MCQ)</option>
                  <option value="Short Answer">Short Answer</option>
                  <option value="Essay">Essay Question</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Number of Questions ({numQuestions})</label>
              <input type="range" min="1" max="10" value={numQuestions} onChange={(e) => setNumQuestions(e.target.value)} className="w-full" />
            </div>
            <button onClick={handleQuizGeneration} disabled={loading} className="w-full bg-blue-600 text-white p-2.xl rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400">
              {loading ? 'Processing Curriculum Extraction...' : 'Generate Quiz Sheet'}
            </button>
          </div>

          {quizOutput && (
            <div className="space-y-4 border p-4 rounded-lg bg-white shadow-sm">
              <h4 className="text-md font-bold text-gray-800 border-b pb-2">📋 Generated Assessment Questions</h4>
              {quizOutput.map((q, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded border space-y-2">
                  <p><strong>Q{idx + 1}:</strong> {q.question_text} <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded ml-2">{q.marks} Marks</span></p>
                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 text-sm pl-4">
                      {q.options.map((opt, oIdx) => <p key={oIdx} className="bg-white p-2 border rounded"> {opt}</p>)}
                    </div>
                  )}
                  <p className="text-sm text-green-700 pt-1"><strong>✓ Benchmark Model Answer:</strong> {q.model_answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-gray-50 p-4 rounded-lg border space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Rubric Automated Examination Evaluator</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Target Assessment Question</label>
                <input type="text" value={questText} onChange={(e) => setQuestText(e.target.value)} className="w-full p-2 border rounded" placeholder="Paste the question text here..." />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Benchmark Model Answer Setup</label>
                <textarea value={modAns} onChange={(e) => setModAns(e.target.value)} className="w-full p-2 border rounded h-20" placeholder="The correct answer key concepts..." />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Student Script Submission</label>
                <textarea value={studAns} onChange={(e) => setStudAns(e.target.value)} className="w-full p-2 border rounded h-20" placeholder="Paste student handwritten script response text here..." />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Max Marks Allocations</label>
                <input type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} className="w-full p-2 border rounded" />
              </div>
            </div>
            <button onClick={handleAutoMarking} disabled={loading} className="w-full bg-green-600 text-white p-2.xl rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400">
              {loading ? 'Evaluating Parameters...' : 'Execute Automated Marking'}
            </button>
          </div>

          {evalResult && (
            <div className="p-4 border rounded-lg bg-white shadow-sm space-y-3">
              <h4 className="text-md font-bold text-gray-800 border-b pb-2">💯 Evaluator Output Sheet</h4>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded border">
                <p className="text-lg">Score: <strong className="text-blue-600">{evalResult.score}</strong> / {maxMarks}</p>
                <p className="text-xs text-gray-400">AI Certainty: {(evalResult.confidence_score * 100).toFixed(1)}%</p>
              </div>
              <p className="text-sm"><strong>Constructive Feedback:</strong> {evalResult.feedback}</p>
              {evalResult.missing_points && evalResult.missing_points.length > 0 && (
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-red-600">⚠️ Omitted Conceptual Variables:</p>
                  <ul className="list-disc pl-5 text-gray-600">
                    {evalResult.missing_points.map((pt, pIdx) => <li key={pIdx}>{pt}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherModules;