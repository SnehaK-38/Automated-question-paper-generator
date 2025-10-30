import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import {
  GraduationCap,
  Upload,
  FileText,
  Download,
  History,
  Settings,
  LogOut,
  Moon,
  Sun,
  User,
  Plus,
  Shuffle,
  Hash,
  Award,
  Calendar,
  ChevronRight,
  Trash2,
} from "lucide-react";
import FileUpload from "./FileUpload.jsx";
import QuestionGenerator from "./QuestionGenerator.jsx";

const Dashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("generate");
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const tabs = [
    { id: "generate", label: "Generate Questions", icon: FileText },
    { id: "history", label: "History", icon: History },
    // { id: "downloads", label: "Downloads", icon: Download },
  ];

  const handleLogout = () => {
    logout();
  };

  const handleFileUploaded = (file, extractedText) => {
    setSyllabusFile({ file, extractedText });
  };

  const handleQuestionsGenerated = (questions, config) => {
    const newHistory = {
      id: Date.now(),
      date: new Date().toISOString(),
      config,
      questions,
      fileName: syllabusFile?.file?.name || "Unknown",
    };

    updateUser({
      testHistory: [newHistory, ...(user.testHistory || [])],
      downloadedPapers: [...(user.downloadedPapers || []), newHistory],
    });

    setGeneratedQuestions(questions);
  };

  const deleteHistoryItem = (id) => {
    const updatedHistory = user.testHistory.filter((item) => item.id !== id);
    const updatedDownloads = user.downloadedPapers.filter(
      (item) => item.id !== id
    );
    updateUser({
      testHistory: updatedHistory,
      downloadedPapers: updatedDownloads,
    });
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div
      className={`p-6 rounded-2xl transition-transform duration-300 transform hover:-translate-y-3 hover:scale-105 hover:shadow-2xl ${
        isDark
          ? "bg-gray-800 border border-gray-700"
          : "bg-white border border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`text-sm font-medium ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {title}
          </p>
          <p
            className={`text-3xl font-bold mt-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-screen transition-all duration-300 ${
        isDark
          ? "bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900"
          : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
      }`}
    >
      {/* Header */}
      <header
        className={`border-b transition-all duration-300 ${
          isDark
            ? "bg-gray-800/80 border-gray-700"
            : "bg-white/80 border-gray-200"
        } backdrop-blur-xl sticky top-0 z-40`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="flex justify-center mb-4">
                <img
                  src="/logo.png"
                  alt="EduGen Logo"
                  className="w-20 h-20 object-contain drop-shadow-lg"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  EduGen
                </h1>
                <p
                  className={`text-sm ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Welcome back, {user?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  isDark
                    ? "bg-gray-700 hover:bg-gray-600 text-yellow-400"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                }`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setShowProfileModal(true)}
                className={`flex items-center space-x-2 p-2 rounded-lg transition-all duration-300 ${
                  isDark
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                }`}
              >
                <User className="w-5 h-5" />
                <span className="hidden sm:block">{user?.name}</span>
              </button>

              <button
                onClick={handleLogout}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  isDark
                    ? "bg-red-900/20 hover:bg-red-900/30 text-red-400"
                    : "bg-red-50 hover:bg-red-100 text-red-600"
                }`}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Tests"
            value={user?.testHistory?.length || 0}
            icon={FileText}
            color="bg-gradient-to-r from-blue-500 to-blue-600"
          />
          <StatCard
            title="Downloaded Papers"
            value={user?.downloadedPapers?.length || 0}
            icon={Download}
            color="bg-gradient-to-r from-green-500 to-green-600"
          />
          {/* <StatCard
            title="Total Questions"
            value={
              user?.testHistory?.reduce(
                (sum, test) => sum + (test.questions?.length || 0),
                0
              ) || 0
            }
            icon={Hash}
            color="bg-gradient-to-r from-purple-500 to-purple-600"
          /> */}
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  : isDark
                  ? "bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
                  : "bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div
          className={`rounded-2xl transition-all duration-300 ${
            isDark
              ? "bg-gray-800/50 border border-gray-700"
              : "bg-white/70 border border-gray-200"
          } backdrop-blur-xl shadow-xl overflow-hidden`}
        >
          {activeTab === "generate" && (
            <div className="p-8 space-y-10">
              {/* Upload UI */}
              {/* Generator UI */}
              <QuestionGenerator
                onFileUploaded={handleFileUploaded}
                onQuestionsGenerated={handleQuestionsGenerated}
              />
            </div>
          )}

          {activeTab === "history" && (
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Test History
                </h2>
                <p
                  className={`text-lg ${
                    isDark ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  View your previously generated question papers
                </p>
              </div>

              {user?.testHistory?.length > 0 ? (
                <div className="space-y-4">
                  {user.testHistory.map((test) => (
                    <div
                      key={test.id}
                      className={`p-6 rounded-xl border transition-transform duration-300 transform hover:-translate-y-3 hover:scale-105 hover:shadow-2xl ${
                        isDark
                          ? "bg-gray-700/50 border-gray-600 hover:bg-gray-700"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <FileText
                              className={`w-5 h-5 ${
                                isDark ? "text-blue-400" : "text-blue-600"
                              }`}
                            />
                            <h3
                              className={`font-semibold ${
                                isDark ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {test.fileName}
                            </h3>
                          </div>
                          <div className="flex items-center space-x-6 text-sm">
                            <div className="flex items-center space-x-1">
                              <Calendar
                                className={`w-4 h-4 ${
                                  isDark ? "text-gray-400" : "text-gray-500"
                                }`}
                              />
                              <span
                                className={
                                  isDark ? "text-gray-300" : "text-gray-600"
                                }
                              >
                                {new Date(test.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Hash
                                className={`w-4 h-4 ${
                                  isDark ? "text-gray-400" : "text-gray-500"
                                }`}
                              />
                              <span
                                className={
                                  isDark ? "text-gray-300" : "text-gray-600"
                                }
                              >
                                {test.questions?.length || 0} questions
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Award
                                className={`w-4 h-4 ${
                                  isDark ? "text-gray-400" : "text-gray-500"
                                }`}
                              />
                              <span
                                className={
                                  isDark ? "text-gray-300" : "text-gray-600"
                                }
                              >
                                {test.config?.totalMarks || 0} marks
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => deleteHistoryItem(test.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? "text-red-400 hover:bg-red-900/20"
                                : "text-red-600 hover:bg-red-50"
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight
                            className={`w-5 h-5 ${
                              isDark ? "text-gray-400" : "text-gray-500"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History
                    className={`w-16 h-16 mx-auto mb-4 ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  />
                  <h3 className="text-xl font-semibold mb-2">
                    No History Available
                  </h3>
                  <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                    Generate your first question paper to see it here
                  </p>
                </div>
              )}
            </div>
          )}

          {/* {activeTab === "downloads" && (
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Downloaded Papers
                </h2>
                <p
                  className={`text-lg ${
                    isDark ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Access your downloaded question papers
                </p>
              </div>

              {user?.downloadedPapers?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {user.downloadedPapers.map((paper) => (
                    <div
                      key={paper.id}
                      className={`p-6 rounded-xl border transition-transform duration-300 transform hover:-translate-y-3 hover:scale-105 hover:shadow-2xl ${
                        isDark
                          ? "bg-gray-700/50 border-gray-600 hover:bg-gray-700"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`p-2 rounded-lg ${
                            isDark ? "bg-blue-900/30" : "bg-blue-100"
                          }`}
                        >
                          <FileText
                            className={`w-6 h-6 ${
                              isDark ? "text-blue-400" : "text-blue-600"
                            }`}
                          />
                        </div>
                        <Download
                          className={`w-5 h-5 ${
                            isDark ? "text-gray-400" : "text-gray-500"
                          }`}
                        />
                      </div>

                      <h3
                        className={`font-semibold mb-2 ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {paper.fileName}
                      </h3>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span
                            className={
                              isDark ? "text-gray-400" : "text-gray-600"
                            }
                          >
                            Questions:
                          </span>
                          <span
                            className={
                              isDark ? "text-gray-300" : "text-gray-700"
                            }
                          >
                            {paper.questions?.length || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span
                            className={
                              isDark ? "text-gray-400" : "text-gray-600"
                            }
                          >
                            Total Marks:
                          </span>
                          <span
                            className={
                              isDark ? "text-gray-300" : "text-gray-700"
                            }
                          >
                            {paper.config?.totalMarks || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span
                            className={
                              isDark ? "text-gray-400" : "text-gray-600"
                            }
                          >
                            Date:
                          </span>
                          <span
                            className={
                              isDark ? "text-gray-300" : "text-gray-700"
                            }
                          >
                            {new Date(paper.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Download
                    className={`w-16 h-16 mx-auto mb-4 ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  />
                  <h3 className="text-xl font-semibold mb-2">
                    No Downloads Yet
                  </h3>
                  <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                    Downloaded question papers will appear here
                  </p>
                </div>
              )}
            </div>
          )} */}
        </div>
      </div>

            {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};

export default Dashboard;
