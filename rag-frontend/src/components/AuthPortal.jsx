import React, { useState } from 'react';
import { loginUser, registerUser, getUserProfile } from '../api';

const AuthPortal = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [school, setSchool] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        if (!email || !password) throw new Error('Please fill in all credential inputs.');
        const tokenData = await loginUser(email, password);
        localStorage.setItem('token', tokenData.access_token);
        const profileData = await getUserProfile();
        onAuthSuccess(tokenData.role, profileData);
      } else {
        if (!name || !email || !password) throw new Error('Name, email, and password fields are strictly required.');
        await registerUser({
          name,
          email,
          password,
          role,
          grade: grade || null,
          subject: subject || null,
          school: school || null,
          preferred_language: 'English'
        });
        setSuccess('Account created successfully! You can now sign in.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          {isLogin ? '🔑 Secure Portal Login' : '📝 Create Your Account'}
        </h2>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded border border-red-200">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 text-sm rounded border border-green-200">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded focus:outline-blue-500" placeholder="John Doe" />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded focus:outline-blue-500" placeholder="user@school.com" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded focus:outline-blue-500" placeholder="••••••••" />
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select System Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 border rounded focus:outline-blue-500">
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Assigned Grade Level (Optional)</label>
                <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full p-2 border rounded focus:outline-blue-500">
                  <option value="">None</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Primary Subject (Optional)</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-2 border rounded focus:outline-blue-500" placeholder="e.g., Science" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">School Name (Optional)</label>
                <input type="text" value={school} onChange={(e) => setSchool(e.target.value)} className="w-full p-2 border rounded focus:outline-blue-500" placeholder="Mahanama College" />
              </div>
            </>
          )}

          <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }} className="text-blue-600 font-semibold hover:underline bg-transparent border-0 cursor-pointer">
            {isLogin ? 'Register now' : 'Log in here'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPortal;