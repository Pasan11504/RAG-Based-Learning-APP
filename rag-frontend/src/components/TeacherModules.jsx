import React, { useState } from 'react';
import { autoMarkAnswer, generateLessonPlan, generateTextbookQuizApi } from '../api';

const TeacherModules = ({ documents, model }) => {
  const [activeSubTab, setActiveSubTab] = useState('lessonPlan');
  const [selectedFileId, setSelectedFileId] = useState('');
  const [loading, setLoading] = useState(false);

  // Lesson Plan States
  const [lessonTopic, setLessonTopic] = useState('');
  const [lessonDuration, setLessonDuration] = useState(40);
  const [lessonOutput, setLessonOutput] = useState('');

  // Quiz Generation States
  const [quizQuestionType, setQuizQuestionType] = useState('MCQ');
  const [quizNumQuestions, setQuizNumQuestions] = useState(3);
  const [quizOutput, setQuizOutput] = useState('');

  // Auto Marking States
  const [questText, setQuestText] = useState('');
  const [modAns, setModAns] = useState('');
  const [studAns, setStudAns] = useState('');
  const [maxMarks, setMaxMarks] = useState(5);
  const [evalResult, setEvalResult] = useState(null);

  const handleLessonGeneration = async () => {
    if (!selectedFileId) return alert('Please select a textbook reference.');
    if (!lessonTopic.trim()) return alert('Please enter a lesson topic.');
    setLoading(true);
    setLessonOutput('');
    try {
      const data = await generateLessonPlan(selectedFileId, lessonTopic, lessonDuration, model);
      setLessonOutput(data.lesson_plan);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizGeneration = async () => {
    if (!selectedFileId) return alert('Please select a textbook reference.');
    setLoading(true);
    setQuizOutput('');
    try {
      const data = await generateTextbookQuizApi(selectedFileId, quizQuestionType, quizNumQuestions, model);
      setQuizOutput(data.quiz);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMarking = async () => {
    if (!questText.trim() || !modAns.trim() || !studAns.trim()) return alert('Please input all evaluation fields.');
    setLoading(true);
    setEvalResult(null);
    try {
      const data = await autoMarkAnswer({ 
        questionText: questText, 
        modelAnswer: modAns, 
        studentAnswer: studAns, 
        maxMarks, 
        model 
      });
      setEvalResult(data.evaluation);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-white p-6 overflow-y-auto font-sans">
      {/* Dynamic Sub-Tab Management Layout */}
      <div className="flex border-b mb-6 gap-4 text-sm">
        <button 
          onClick={() => setActiveSubTab('lessonPlan')} 
          className={`pb-2 font-semibold border-b-2 ${activeSubTab === 'lessonPlan' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
        >
          📝 Lesson Plan Generator
        </button>
        <button 
          onClick={() => setActiveSubTab('quizGen')} 
          className={`pb-2 font-semibold border-b-2 ${activeSubTab === 'quizGen' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
        >
          🛠️ Question Bank Generator
        </button>
        <button 
          onClick={() => setActiveSubTab('autoMark')} 
          className={`pb-2 font-semibold border-b-2 ${activeSubTab === 'autoMark' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
        >
          💯 Evaluation Center
        </button>
      </div>

      {/* 1. LESSON PLAN VIEW WORKSPACE */}
      {activeSubTab === 'lessonPlan' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-gray-50 p-4 rounded-lg border space-y-4">
            <h3 className="text-md font-bold text-gray-800">🤖 AI Lesson Plan Generator</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">Select Textbook Source Reference</label>
                <select value={selectedFileId} onChange={(e) => setSelectedFileId(e.target.value)} className="w-full p-2 border rounded bg-white text-sm">
                  <option value="">Choose file...</option>
                  {documents.map(doc => <option key={doc.id} value={doc.id}>{doc.filename}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">Target Topic / Chapter Name</label>
                <input type="text" value={lessonTopic} onChange={(e) => setLessonTopic(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="e.g., Photosynthesis" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600">Class Duration ({lessonDuration} Minutes)</label>
              <input type="range" min="10" max="120" step="5" value={lessonDuration} onChange={(e) => setLessonDuration(e.target.value)} className="w-full" />
            </div>
            <button onClick={handleLessonGeneration} disabled={loading} className="w-full bg-blue-600 text-white p-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400">
              {loading ? 'Analyzing Textbook Slices...' : 'Generate Structured Lesson Plan'}
            </button>
          </div>

          {lessonOutput && (
            <div className="p-6 border rounded-lg bg-white shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-gray-800 border-b pb-2">📋 Compiled Instructional Guide</h4>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 bg-gray-50 p-4 rounded border font-mono">
                {lessonOutput}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. QUIZ GENERATION VIEW WORKSPACE */}
      {activeSubTab === 'quizGen' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-gray-50 p-4 rounded-lg border space-y-4">
            <h3 className="text-md font-bold text-gray-800">📋 Automatic Test & Quiz Bank Generator</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">Select Textbook Source Reference</label>
                <select value={selectedFileId} onChange={(e) => setSelectedFileId(e.target.value)} className="w-full p-2 border rounded bg-white text-sm">
                  <option value="">Choose file...</option>
                  {documents.map(doc => <option key={doc.id} value={doc.id}>{doc.filename}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">Question Format</label>
                <select value={quizQuestionType} onChange={(e) => setQuizQuestionType(e.target.value)} className="w-full p-2 border rounded bg-white text-sm">
                  <option value="MCQ">Multiple Choice Questions (MCQs)</option>
                  <option value="Short Answer">Short Answer Prompts</option>
                  <option value="Essay">Long Essay Questions</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600">Target Item Count ({quizNumQuestions})</label>
              <input type="range" min="1" max="10" value={quizNumQuestions} onChange={(e) => setQuizNumQuestions(e.target.value)} className="w-full" />
            </div>
            <button onClick={handleQuizGeneration} disabled={loading} className="w-full bg-blue-600 text-white p-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400">
              {loading ? 'Compiling Test Array Elements...' : 'Generate New Quiz Assessment'}
            </button>
          </div>

          {quizOutput && (
            <div className="p-6 border rounded-lg bg-white shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-gray-800 border-b pb-2">📋 Assessment Sheet & Benchmark Answers</h4>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 bg-gray-50 p-4 rounded border font-mono">
                {quizOutput}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. AUTOMATED GRADING WORKSPACE */}
      {activeSubTab === 'autoMark' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-gray-50 p-4 rounded-lg border space-y-4">
            <h3 className="text-md font-bold text-gray-800">💯 Rubric Automated Script Evaluator</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">Target Assessment Question</label>
                <input type="text" value={questText} onChange={(e) => setQuestText(e.target.value)} className="w-full p-2 border rounded text-sm bg-white" placeholder="e.g., What is Newton's First Law?" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">Benchmark Model Answer Setup</label>
                <textarea value={modAns} onChange={(e) => setModAns(e.target.value)} className="w-full p-2 border rounded text-sm bg-white h-20 shadow-sm" placeholder="Paste target correct answer text points..." />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">Student Script Submission</label>
                <textarea value={studAns} onChange={(e) => setStudAns(e.target.value)} className="w-full p-2 border rounded text-sm bg-white h-20 shadow-sm" placeholder="Paste the student's typed answer text here..." />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">Maximum Allocated Marks</label>
                <input type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} className="w-full p-2 border rounded text-sm bg-white" />
              </div>
            </div>
            <button onClick={handleAutoMarking} disabled={loading} className="w-full bg-green-600 text-white p-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:bg-gray-400">
              {loading ? 'Analyzing Script Content...' : 'Execute Automated Marking Evaluation'}
            </button>
          </div>

          {evalResult && (
            <div className="p-6 border rounded-lg bg-white shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-gray-800 border-b pb-2">📋 Compiled Evaluator Report Card</h4>
              {/* Renders the complete, detailed markdown analysis text emitted from our backend function */}
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 bg-gray-50 p-4 rounded border font-mono">
                {evalResult.score}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherModules;