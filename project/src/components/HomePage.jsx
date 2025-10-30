import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  BookOpen,
  Users,
  Award,
  ArrowRight,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";

const HomePage = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const features = [
    {
      icon: BookOpen,
      title: "AI-Powered Question Generation",
      description:
        "Upload your syllabus and let AI generate customized question papers tailored to your curriculum.",
    },
    {
      icon: GraduationCap,
      title: " Customizable Papers",
      description:
        "Create multiple versions with adjustable difficulty levels and shuffled questions.",
    },
    {
      icon: Award,
      title: "Time-Saving Automation",
      description:
        "Save hours of manual work with AI-generated papers ready in seconds.",
    },
    {
      icon: Users,
      title: "Easy Export & Sharing",
      description:
        "Download question papers in clean, exam-ready formats and share them effortlessly.",
    },
  ];

  return (
    <div
      className={`min-h-screen transition-all duration-300 ${
        isDark
          ? "bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white"
          : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800"
      }`}
    >
      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div>
              <div className="w-24 h-24 bg-white p-2 rounded-full flex items-center justify-center shadow">
                <img
                  src="/logo.png"
                  alt="EduGen Logo"
                  className="w-20 h-20 object-contain"
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"></h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all duration-300 ${
                isDark
                  ? "bg-gray-800 hover:bg-gray-700 text-yellow-400"
                  : "bg-white hover:bg-gray-50 text-gray-600 shadow-md"
              }`}
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => navigate("/login")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${
                isDark
                  ? "bg-white text-gray-900 hover:bg-gray-100"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              } shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`}
            >
              Login
            </button>
          </div>
        </div>
      </header>
      <hr />

      {/* Hero Section */}
      <section className="relative z-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            {/* Wrapper with staggered animations */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.3 } },
              }}
            >
              {/* Heading */}
              <motion.h2
                variants={{
                  hidden: { opacity: 0, y: 50 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-6xl md:text-8xl font-bold mb-8 leading-tight"
              >
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-gradient-x">
                  AI-Powered
                </span>
                <br />
                <span className={isDark ? "text-white" : "text-gray-800"}>
                  Question Paper Generator
                </span>
              </motion.h2>

              {/* Subtext */}
              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed ${
                  isDark ? "text-gray-300" : "text-gray-600"
                }`}
              >
                AI that creates tailored question papers from your syllabus:
                fast, accurate, and effortless.
              </motion.p>

              {/* Button */}
              <motion.button
                variants={{
                  hidden: { opacity: 0, scale: 0.9 },
                  visible: { opacity: 1, scale: 1 },
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                onClick={() => navigate("/login")}
                className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-12 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
              >
                Get Started
                <ArrowRight className="inline-block ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="text-center mb-16">
          <h3 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Powerful Features
            </span>
          </h3>
          <p
            className={`text-lg ${
              isDark ? "text-gray-300" : "text-gray-600"
            } max-w-2xl mx-auto`}
          >
            Everything you need to create, manage, and evaluate educational
            content with the power of AI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group p-8 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                isDark
                  ? "bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700"
                  : "bg-white/70 hover:bg-white border border-gray-200"
              } backdrop-blur-lg`}
            >
              <div
                className={`p-3 rounded-xl mb-6 inline-block ${
                  isDark ? "bg-blue-600/20" : "bg-blue-100"
                } group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon
                  className={`w-6 h-6 ${
                    isDark ? "text-blue-400" : "text-blue-600"
                  }`}
                />
              </div>
              <h4 className="text-xl font-bold mb-4 group-hover:text-blue-600 transition-colors">
                {feature.title}
              </h4>
              <p
                className={`${
                  isDark ? "text-gray-300" : "text-gray-600"
                } leading-relaxed`}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 120, scale: 0.9 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          viewport={{ once: true }}
          className={`p-12 rounded-3xl ${
            isDark
              ? "bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-gray-700"
              : "bg-gradient-to-r from-blue-50 to-purple-50 border border-gray-200"
          } backdrop-blur-lg`}
        >
          <h3 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Simplify Question Paper Creation?
          </h3>
          <p
            className={`text-lg mb-8 ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Join educators already saving hours with AI-powered question paper
            generation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/signup")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Generate Now
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/login")}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 transform ${
                isDark
                  ? "border-2 border-white text-white hover:bg-white hover:text-gray-900"
                  : "border-2 border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white"
              }`}
            >
              Login
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float-delayed"></div>
      </div>
    </div>
  );
};

export default HomePage;
