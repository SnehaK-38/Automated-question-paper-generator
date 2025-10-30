import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { 
  FileText, 
  Download, 
  Settings, 
  Shuffle, 
  Hash, 
  Award, 
  Loader2, 
  BookOpen,
  GraduationCap,
  Eye,
  FileDown,
  ChevronDown,
  ChevronUp,
  Upload,
  File,
  CheckCircle,
  AlertCircle,
  X,
  Clock,
  Target,
  Edit3,
  Save,
  XCircle,
  Copy,
  Trash2,
  RotateCcw,
  Wand2,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { generateQuestions as generateQuestionsAPI } from '../services/questionApi.js';
import FileUpload from './FileUpload.jsx';

const QuestionGenerator = ({ onFileUploaded, onQuestionsGenerated }) => {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null); // { paperId, questionIndex }
  const [editedQuestionData, setEditedQuestionData] = useState({});
  const [questionHistory, setQuestionHistory] = useState({});
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [questionBank, setQuestionBank] = useState([]);
  const [draggedQuestion, setDraggedQuestion] = useState(null);

  const [config, setConfig] = useState({
    examType: '',
    numberOfVariants: 1,
    syllabusText: '',
    topicsText: '',
    // General exam specific fields
    engineeringBranch: '',
    subject: '',
    totalMarks: '',
    numberOfQuestions: '',
    applyWeightage: true
  });
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [showConfig, setShowConfig] = useState(true);
  const [expandedPaper, setExpandedPaper] = useState(null);

  const examTypes = [
    { 
      value: 'text', 
      label: 'Text based', 
      marks: 20,
      description: 'Upload syllabus in text format ',
      icon: Clock
    },
    { 
      value: 'pdf', 
      label: 'Pdf based', 
      marks: 60,
      description: 'Upload syllabus as PDF - all modules considered',
      icon: GraduationCap
    },
  ];


  const handleFileUploaded = (file, extractedText) => {
    setSyllabusFile({ file, extractedText });
    onFileUploaded(file, extractedText);
  };

  const getQuestionCount = (examType, customCount = null) => {
    if (customCount) return parseInt(customCount);
    switch (examType) {
      case 'text': return 8;
      case 'pdf': return 15;
      default: return 10;
    }
  };

  const getTotalMarks = (examType, customMarks = null) => {
    if (customMarks) return parseInt(customMarks);
    switch (examType) {
      case 'text': return 20;
      case 'pdf': return 60;
      default: return 50;
    }
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Save question to history before editing
  const saveQuestionHistory = (questionId, questionData) => {
    setQuestionHistory(prev => ({
      ...prev,
      [questionId]: [...(prev[questionId] || []), questionData]
    }));
  };

  // Restore question from history
  const restoreQuestionFromHistory = (questionId, historyIndex) => {
    const history = questionHistory[questionId];
    if (history && history[historyIndex]) {
      const restoredQuestion = history[historyIndex];
      setGeneratedQuestions(prev => 
        prev.map(q => q.id === questionId ? { ...restoredQuestion } : q)
      );
    }
  };

  const generateQuestions = async () => {
    setLoading(true);
    setError('');

    try {
      if (!config.examType) {
        setError('Please select an exam type');
        setLoading(false);
        return;
      }

      let syllabusContent = '';
      let questionCount = getQuestionCount(config.examType, config.numberOfQuestions);
      let totalMarks = getTotalMarks(config.examType, config.totalMarks);
      
      if (config.examType === 'pdf') {
        if (!syllabusFile?.extractedText) {
          setError('Please upload a syllabus PDF file for exam');
          setLoading(false);
          return;
        }
        syllabusContent = syllabusFile.extractedText;
      } else if (config.examType === 'text') {
        if (!config.syllabusText.trim()) {
          setError('Please enter the syllabus content');
          setLoading(false);
          return;
        }
        syllabusContent = config.syllabusText;
      } 


      const apiConfig = {
        subject: config.examType === 'General' ? config.subject : 'Engineering Subject',
        difficulty: 'balanced',
        questionCount: questionCount,
        engineeringBranch: config.examType === 'General' ? config.engineeringBranch : 'Engineering',
        university: 'Mumbai University',
        syllabusText: syllabusContent,
        examType: config.examType,
        totalMarks: totalMarks,
        applyWeightage: config.applyWeightage
      };

      const numVariants = Number(config.numberOfVariants) || 1;
      const papers = [];

      if (numVariants === 1) {
        // Single variant - generate normally
        const questions = await generateQuestionsAPI(apiConfig);
        papers.push({
          paperId: 1,
          questions: questions,
          totalMarks: totalMarks,
          examType: config.examType,
          generatedAt: new Date().toISOString(),
          subject: config.examType === 'General' ? config.subject : 'Engineering Subject',
          branch: config.examType === 'General' ? config.engineeringBranch : 'Engineering'
        });
      } else {
        // Multiple variants - generate larger pool and create unique variants
        const poolMultiplier = Math.max(2.5, numVariants * 1.5); // Generate more questions for better variety
        const poolSize = Math.ceil(questionCount * poolMultiplier);
        
        console.log(`Generating ${poolSize} questions for ${numVariants} variants`);
        
        const questionPool = await generateQuestionsAPI({
          ...apiConfig,
          questionCount: poolSize
        });

        if (questionPool.length < questionCount) {
          throw new Error('Not enough questions generated for creating variants');
        }

        // Create unique variants by selecting different subsets
        const usedQuestions = new Set();
        
        for (let i = 0; i < numVariants; i++) {
          let availableQuestions = questionPool.filter(q => 
            !usedQuestions.has(normalizeQuestion(q.question))
          );
          
          // If we don't have enough unused questions, generate additional ones
          if (availableQuestions.length < questionCount) {
            console.log(`Generating additional questions for variant ${i + 1}`);
            const additionalQuestions = await generateQuestionsAPI({
              ...apiConfig,
              questionCount: questionCount * 2,
              excludeQuestions: Array.from(usedQuestions)
            });
            
            const newQuestions = additionalQuestions.filter(q => 
              !usedQuestions.has(normalizeQuestion(q.question))
            );
            availableQuestions.push(...newQuestions);
          }

          // Shuffle and select questions for this variant
          const shuffledQuestions = shuffleArray(availableQuestions);
          let variantQuestions = shuffledQuestions.slice(0, questionCount);

          // Ensure proper question distribution for the exam type
          variantQuestions = ensureQuestionDistribution(variantQuestions, config.examType, questionCount);

          // Mark these questions as used (normalize for comparison)
          variantQuestions.forEach(q => {
            usedQuestions.add(normalizeQuestion(q.question));
          });

          papers.push({
            paperId: i + 1,
            questions: variantQuestions,
            totalMarks: totalMarks,
            examType: config.examType,
            generatedAt: new Date().toISOString(),
            subject: config.examType === 'General' ? config.subject : 'Engineering Subject',
            branch: config.examType === 'General' ? config.engineeringBranch : 'Engineering'
          });
        }
      }

      if (papers.length === 0) {
        throw new Error('Failed to generate any questions');
      }

      setGeneratedQuestions(papers);
      onQuestionsGenerated(papers, { ...config, totalMarks: totalMarks });
      setLoading(false);
    } catch (err) {
      console.error('Error generating questions:', err);
      setError('Failed to generate questions. Please try again.');
      setLoading(false);
    }
  };

  const ensureQuestionDistribution = (questions, examType, totalQuestions) => {
    // Ensure we have the right mix of question types
    const mcqQuestions = questions.filter(q => q.type === 'mcq');
    const shortQuestions = questions.filter(q => q.type === 'short');
    const longQuestions = questions.filter(q => q.type === 'long');

    let targetMcq, targetShort, targetLong;

    if (examType === 'text') {
      targetMcq = 4;
      targetShort = 2;
      targetLong = 2;
    } else if (examType === 'pdf') {
      targetMcq = 10;
      targetShort = 8;
      targetLong = 6;
    } else {
      // General exam - distribute evenly
      targetMcq = Math.floor(totalQuestions * 0.4);
      targetShort = Math.floor(totalQuestions * 0.4);
      targetLong = totalQuestions - targetMcq - targetShort;
    }
    const result = [
      ...mcqQuestions.slice(0, targetMcq),
      ...shortQuestions.slice(0, targetShort),
      ...longQuestions.slice(0, targetLong)
    ];

    // If we don't have enough of a specific type, fill with available questions
    while (result.length < totalQuestions && questions.length > result.length) {
      const remaining = questions.filter(q => !result.includes(q));
      if (remaining.length > 0) {
        result.push(remaining[0]);
      } else {
        break;
      }
    }

    return result.slice(0, totalQuestions);
  };

  const normalizeQuestion = (text) => {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const downloadWordDocument = async (paper, paperIndex) => {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [

            new Paragraph({
              text: `Question Paper`,
              heading: HeadingLevel.TITLE,
            }),
            // new Paragraph({
            //   text: `Subject: ${paper.subject}`,
            //   spacing: { after: 200 },
            // }),
            // new Paragraph({
            //   text: `Branch: ${paper.branch}`,
            //   spacing: { after: 200 },
            // }),
            new Paragraph({
              text: `Total Marks: ${paper.totalMarks}`,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `Time: ${paper.examType === 'pdf' ? '3 Hours' : '1.5 Hours'}`,
              spacing: { after: 400 },
            }),
            new Paragraph({
              text: "Instructions:",
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: "1. Answer all questions",
              spacing: { after: 100 },
            }),
            new Paragraph({
              text: "2. Write clearly and legibly",
              spacing: { after: 400 },
            }),
            ...paper.questions.flatMap((q, index) => {
              const questionParagraphs = [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${index + 1}. `,
                      bold: true,
                    }),
                    new TextRun({
                      text: `${q.question} `,
                    }),
                    new TextRun({
                      text: `[${q.marks} marks]`,
                      italics: true,
                    }),
                  ],
                  spacing: { after: 200 },
                }),
              ];

              if (q.type === 'mcq' && q.options) {
                q.options.forEach((option, optIndex) => {
                  questionParagraphs.push(
                    new Paragraph({
                      text: `   ${String.fromCharCode(65 + optIndex)}. ${option}`,
                      spacing: { after: 100 },
                    })
                  );
                });
              }

              questionParagraphs.push(
                new Paragraph({
                  text: "",
                  spacing: { after: 300 },
                })
              );

              return questionParagraphs;
            }),
          ],
        }],
      });

      const buffer = await Packer.toBlob(doc);
      const filename = `${paper.examType}_Paper_Variant_${paperIndex + 1}.docx`;
      saveAs(buffer, filename);
    } catch (error) {
      console.error('Error downloading Word document:', error);
      setError('Failed to download Word document. Please try again.');
    }
  };

  const downloadPDFDocument = async (paper, paperIndex) => {
    try {
      const pdf = new jsPDF();
      const pageHeight = pdf.internal.pageSize.height;
      let yPosition = 20;

      // Title
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.text(` Examination`, 20, yPosition);
      yPosition += 15;

      // Subject and Branch
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'normal');
      // pdf.text(`Subject: ${paper.subject}`, 20, yPosition);
      // yPosition += 8;
      // pdf.text(`Branch: ${paper.branch}`, 20, yPosition);
      // yPosition += 8;
      pdf.text(`Total Marks: ${paper.totalMarks}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Time: ${paper.examType === 'pdf' ? '3 Hours' : '1.5 Hours'}`, 20, yPosition);
      yPosition += 15;

      // Instructions
      pdf.setFont(undefined, 'bold');
      pdf.text('Instructions:', 20, yPosition);
      yPosition += 8;
      pdf.setFont(undefined, 'normal');
      pdf.text('1. Answer all questions', 25, yPosition);
      yPosition += 6;
      pdf.text('2. Write clearly and legibly', 25, yPosition);
      yPosition += 15;

      // Questions
      paper.questions.forEach((q, index) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFont(undefined, 'bold');
        const questionText = `${index + 1}. ${q.question} [${q.marks} marks]`;
        const splitQuestion = pdf.splitTextToSize(questionText, 170);
        pdf.text(splitQuestion, 20, yPosition);
        yPosition += splitQuestion.length * 6 + 5;

        if (q.type === 'mcq' && q.options) {
          pdf.setFont(undefined, 'normal');
          q.options.forEach((option, optIndex) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = 20;
            }
            const optionText = `   ${String.fromCharCode(65 + optIndex)}. ${option}`;
            pdf.text(optionText, 25, yPosition);
            yPosition += 6;
          });
        }
        yPosition += 10;
      });

      const filename = `${paper.examType}_Paper_Variant_${paperIndex + 1}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error downloading PDF document:', error);
      setError('Failed to download PDF document. Please try again.');
    }
  };

  const toggleQuestionView = (paperId) => {
    setExpandedPaper(expandedPaper === paperId ? null : paperId);
  };

  const startEditingQuestion = (paperId, questionIndex) => {
    const paper = generatedQuestions.find(p => p.paperId === paperId);
    const question = paper.questions[questionIndex];
    
    // Save current state to history
    saveQuestionHistory(question.id, { ...question });
    
    setEditingQuestion({ paperId, questionIndex });
    setEditedQuestionData({
      question: question.question,
      marks: question.marks,
      options: question.options ? [...question.options] : [],
      correctAnswer: question.correctAnswer || ''
    });
  };

  const cancelEditingQuestion = () => {
    setEditingQuestion(null);
    setEditedQuestionData({});
  };

  // Delete question
  const deleteQuestion = (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      setGeneratedQuestions(prev => prev.filter(q => q.id !== questionId));
      // Update question IDs to maintain sequence
      setGeneratedQuestions(prev => 
        prev.map((q, index) => ({ ...q, id: index + 1 }))
      );
    }
  };

  // // Generate similar question using AI
  // const generateSimilarQuestion = async (originalQuestion) => {
  //   try {
  //     setLoading(true);
  //     const similarQuestions = await generateQuestionsAPI({
  //       ...config,
  //       questionCount: 1,
  //       syllabusText: syllabusFile?.extractedText,
  //       excludeQuestions: [originalQuestion.question],
  //       similarTo: originalQuestion.question
  //     });
      
  //     if (similarQuestions.length > 0) {
  //       const newQuestion = {
  //         ...similarQuestions[0],
  //         id: Math.max(...generatedQuestions.map(q => q.id)) + 1
  //       };
  //       setGeneratedQuestions(prev => [...prev, newQuestion]);
  //     }
  //   } catch (error) {
  //     console.error('Error generating similar question:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Bulk operations
  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const selectAllQuestions = () => {
    setSelectedQuestions(new Set(generatedQuestions.map(q => q.id)));
  };

  const deselectAllQuestions = () => {
    setSelectedQuestions(new Set());
  };

  const deleteSelectedQuestions = () => {
    if (selectedQuestions.size > 0 && window.confirm(`Delete ${selectedQuestions.size} selected questions?`)) {
      setGeneratedQuestions(prev => 
        prev.filter(q => !selectedQuestions.has(q.id))
          .map((q, index) => ({ ...q, id: index + 1 }))
      );
      setSelectedQuestions(new Set());
    }
  };

  const bulkUpdateMarks = (newMarks) => {
    if (selectedQuestions.size > 0) {
      setGeneratedQuestions(prev => 
        prev.map(q => 
          selectedQuestions.has(q.id) ? { ...q, marks: parseInt(newMarks) } : q
        )
      );
    }
  };

  // Question reordering
  const moveQuestion = (questionId, direction) => {
    const currentIndex = generatedQuestions.findIndex(q => q.id === questionId);
    if (
      (direction === 'up' && currentIndex > 0) ||
      (direction === 'down' && currentIndex < generatedQuestions.length - 1)
    ) {
      const newQuestions = [...generatedQuestions];
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      [newQuestions[currentIndex], newQuestions[targetIndex]] = 
      [newQuestions[targetIndex], newQuestions[currentIndex]];
      
      // Update IDs to match new positions
      newQuestions.forEach((q, index) => {
        q.id = index + 1;
      });
      
      setGeneratedQuestions(newQuestions);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, question) => {
    setDraggedQuestion(question);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetQuestion) => {
    e.preventDefault();
    if (!draggedQuestion || draggedQuestion.id === targetQuestion.id) return;

    const dragIndex = generatedQuestions.findIndex(q => q.id === draggedQuestion.id);
    const dropIndex = generatedQuestions.findIndex(q => q.id === targetQuestion.id);
    
    const newQuestions = [...generatedQuestions];
    const [removed] = newQuestions.splice(dragIndex, 1);
    newQuestions.splice(dropIndex, 0, removed);
    
    // Update IDs
    newQuestions.forEach((q, index) => {
      q.id = index + 1;
    });
    
    setGeneratedQuestions(newQuestions);
    setDraggedQuestion(null);
  };

  // Question validation
  const validateQuestion = (question) => {
    const issues = [];
    
    if (!question.question.trim()) {
      issues.push('Question text is empty');
    }
    
    if (question.marks <= 0) {
      issues.push('Marks must be greater than 0');
    }
    
    if (question.type === 'mcq') {
      if (question.options.length < 2) {
        issues.push('MCQ must have at least 2 options');
      }
      if (!question.correctAnswer) {
        issues.push('MCQ must have a correct answer selected');
      }
      if (question.options.some(opt => !opt.trim())) {
        issues.push('All MCQ options must have text');
      }
    }
    
    return issues;
  };

  const saveEditedQuestion = () => {
    if (!editingQuestion) return;
    
    const { paperId, questionIndex } = editingQuestion;
    
    setGeneratedQuestions(prevQuestions => {
      return prevQuestions.map(paper => {
        if (paper.paperId === paperId) {
          const updatedQuestions = [...paper.questions];
          updatedQuestions[questionIndex] = {
            ...updatedQuestions[questionIndex],
            question: editedQuestionData.question,
            marks: editedQuestionData.marks,
            options: editedQuestionData.options,
            correctAnswer: editedQuestionData.correctAnswer
          };
          
          return {
            ...paper,
            questions: updatedQuestions
          };
        }
        return paper;
      });
    });
    
    setEditingQuestion(null);
    setEditedQuestionData({});
  };

  const updateEditedQuestionField = (field, value) => {
    setEditedQuestionData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateEditedOption = (optionIndex, value) => {
    setEditedQuestionData(prev => ({
      ...prev,
      options: prev.options.map((option, index) => 
        index === optionIndex ? value : option
      )
    }));
  };

  const renderInputSection = () => {
    if (config.examType === 'pdf') {
      return (
        <div className="mb-8">
          <h4 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Upload Syllabus Document (PDF)
          </h4>
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Upload your complete syllabus document as PDF. All modules will be considered.
          </p>
          <FileUpload onFileUploaded={handleFileUploaded} />
        </div>
      );
    }

    if (config.examType === 'text') {
      return (
        <div className="mb-8">
          <h4 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
           Enter Syllabus (Text Format)
          </h4>
          {/* <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Enter the syllabus content.
          </p> */}
          <textarea
            value={config.syllabusText}
            onChange={(e) => setConfig({...config, syllabusText: e.target.value})}
            placeholder="Paste your syllabus content here..."
            rows={8}
            className={`w-full p-4 rounded-xl border transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
              isDark
                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>
      );
    }


    // if (config.examType === 'General') {
    //   return (
    //     <div className="space-y-6 mb-8">
    //       <h4 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
    //         General Exam Configuration
    //       </h4>
          
    //       {/* Engineering Branch */}
    //       <div>
    //         <label className={`block text-sm font-semibold mb-2 ${
    //           isDark ? 'text-gray-200' : 'text-gray-700'
    //         }`}>
    //           Engineering Branch *
    //         </label>
    //         <select
    //           value={config.engineeringBranch}
    //           onChange={(e) => setConfig({...config, engineeringBranch: e.target.value})}
    //           className={`w-full p-3 rounded-xl border transition-all duration-300 focus:ring-2 focus:ring-blue-500 ${
    //             isDark
    //               ? 'bg-gray-800 border-gray-600 text-white'
    //               : 'bg-gray-50 border-gray-300 text-gray-900'
    //           }`}
    //         >
    //           <option value="">Select Engineering Branch</option>
    //           {engineeringBranches.map(branch => (
    //             <option key={branch} value={branch}>{branch}</option>
    //           ))}
    //         </select>
    //       </div>

    //       {/* Subject */}
    //       <div>
    //         <label className={`block text-sm font-semibold mb-2 ${
    //           isDark ? 'text-gray-200' : 'text-gray-700'
    //         }`}>
    //           Subject *
    //         </label>
    //         <select
    //           value={config.subject}
    //           onChange={(e) => setConfig({...config, subject: e.target.value})}
    //           className={`w-full p-3 rounded-xl border transition-all duration-300 focus:ring-2 focus:ring-blue-500 ${
    //             isDark
    //               ? 'bg-gray-800 border-gray-600 text-white'
    //               : 'bg-gray-50 border-gray-300 text-gray-900'
    //           }`}
    //         >
    //           <option value="">Select Subject</option>
    //           {subjects.map(subject => (
    //             <option key={subject} value={subject}>{subject}</option>
    //           ))}
    //         </select>
    //       </div>

    //       {/* Total Marks */}
    //       <div>
    //         <label className={`block text-sm font-semibold mb-2 ${
    //           isDark ? 'text-gray-200' : 'text-gray-700'
    //         }`}>
    //           Total Marks *
    //         </label>
    //         <input
    //           type="number"
    //           value={config.totalMarks}
    //           onChange={(e) => setConfig({...config, totalMarks: e.target.value})}
    //           placeholder="Enter total marks (e.g., 50, 100)"
    //           min="10"
    //           max="200"
    //           className={`w-full p-3 rounded-xl border transition-all duration-300 focus:ring-2 focus:ring-blue-500 ${
    //             isDark
    //               ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
    //               : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
    //           }`}
    //         />
    //       </div>

    //       {/* Number of Questions */}
    //       <div>
    //         <label className={`block text-sm font-semibold mb-2 ${
    //           isDark ? 'text-gray-200' : 'text-gray-700'
    //         }`}>
    //           Number of Questions per Paper *
    //         </label>
    //         <input
    //           type="number"
    //           value={config.numberOfQuestions}
    //           onChange={(e) => setConfig({...config, numberOfQuestions: e.target.value})}
    //           placeholder="Enter number of questions (e.g., 10, 20)"
    //           min="5"
    //           max="50"
    //           className={`w-full p-3 rounded-xl border transition-all duration-300 focus:ring-2 focus:ring-blue-500 ${
    //             isDark
    //               ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
    //               : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
    //           }`}
    //         />
    //       </div>

    //       {/* Apply Predefined Weightage */}
    //       <div className="flex items-center space-x-3">
    //         <input
    //           type="checkbox"
    //           id="applyWeightage"
    //           checked={config.applyWeightage}
    //           onChange={(e) => setConfig({...config, applyWeightage: e.target.checked})}
    //           className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
    //         />
    //         <label htmlFor="applyWeightage" className={`text-sm font-medium ${
    //           isDark ? 'text-gray-200' : 'text-gray-700'
    //         }`}>
    //           Apply predefined weightage rules
    //         </label>
    //       </div>

    //       {/* Optional Syllabus Text */}
    //       {/* <div>
    //         <label className={`block text-sm font-semibold mb-2 ${
    //           isDark ? 'text-gray-200' : 'text-gray-700'
    //         }`}>
    //           Syllabus Content (Optional)
    //         </label>
    //         <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
    //           Optionally provide syllabus content to generate more targeted questions
    //         </p>
    //         <textarea
    //           value={config.syllabusText}
    //           onChange={(e) => setConfig({...config, syllabusText: e.target.value})}
    //           placeholder="Paste syllabus content here (optional)..."
    //           rows={6}
    //           className={`w-full p-4 rounded-xl border transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
    //             isDark
    //               ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
    //               : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
    //           }`}
    //         />
    //       </div> */}
    //     </div>
    //   );
    // }

    return null;
  };

  const canGenerate = () => {
    if (!config.examType) return false;
    
    if (config.examType === 'pdf') {
      return syllabusFile?.extractedText;
    } else if (config.examType === 'text') {
      return config.syllabusText.trim();
    // } else if (config.examType === 'CIA') {
    //   return config.topicsText.trim();
    } 
    return false;
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Generate Exam Papers
        </h2>
        <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Configure your exam paper settings and generate AI-powered questions
        </p>
      </div>

      {showConfig && (
        <div className={`p-8 rounded-2xl border transition-all duration-300 ${
          isDark 
            ? 'bg-gray-700/30 border-gray-600' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Exam Paper Configuration
            </h3>
            <Settings className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>

          {/* Exam Type Selection */}
          <div className="mb-8">
            <h4 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Exam Type
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {examTypes.map((examType) => (
                <button
                  key={examType.value}
                  onClick={() => setConfig({
                    ...config, 
                    examType: examType.value,
                    // Reset fields when changing exam type
                    syllabusText: '',
                    topicsText: '',
                    engineeringBranch: '',
                    subject: '',
                    totalMarks: '',
                    numberOfQuestions: ''
                  })}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 text-left ${
                    config.examType === examType.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : isDark
                      ? 'border-gray-600 hover:border-gray-500'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <examType.icon className={`w-6 h-6 mt-1 ${
                      config.examType === examType.value ? 'text-blue-600' : isDark ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <div>
                      <h5 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {examType.label}
                      </h5>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {examType.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          

          {/* Input Section based on Exam Type */}
          {config.examType && renderInputSection()}

          {/* Number of Variants */}
          <div className="mb-8">
            <label className={`block text-sm font-semibold mb-2 ${
              isDark ? 'text-gray-200' : 'text-gray-700'
            }`}>
              <Hash className="inline w-4 h-4 mr-1" />
              Number of Variants
            </label>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Generate multiple unique variants with different questions for the same exam
            </p>
            <select
              value={config.numberOfVariants}
              onChange={(e) => setConfig({...config, numberOfVariants: parseInt(e.target.value)})}
              className={`w-full max-w-xs p-3 rounded-xl border transition-all duration-300 focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? 'bg-gray-800 border-gray-600 text-white'
                  : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
            >
              {[1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num}>{num} Variant{num > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          <div className="text-center">
            <button
              onClick={generateQuestions}
              disabled={loading || !canGenerate()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <Loader2 className="inline w-5 h-5 mr-2 animate-spin" />
                  Generating Papers...
                </>
              ) : (
                <>
                  <Shuffle className="inline w-5 h-5 mr-2" />
                  Generate Papers
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className={`p-4 rounded-xl border ${
          isDark 
            ? 'bg-red-900/20 border-red-800 text-red-400' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Bulk Edit Controls */}
      {/* {generatedQuestions.length > 0 && (
        <div className={`mb-6 p-4 rounded-xl border ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setBulkEditMode(!bulkEditMode)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                bulkEditMode
                  ? 'bg-blue-600 text-white'
                  : isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>{bulkEditMode ? 'Exit Bulk Edit' : 'Bulk Edit'}</span>
            </button>

            {bulkEditMode && (
              <>
                <button
                  onClick={selectAllQuestions}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    isDark ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllQuestions}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Deselect All
                </button>
                
                {selectedQuestions.size > 0 && (
                  <>
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {selectedQuestions.size} selected
                    </span>
                    <button
                      onClick={deleteSelectedQuestions}
                      className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                    <div className="flex items-center space-x-2">
                      <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        Set marks:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        className={`w-16 px-2 py-1 rounded border text-sm ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        onChange={(e) => bulkUpdateMarks(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )} */}

      {generatedQuestions.length > 0 && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Generated Exam Papers
            </h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {generatedQuestions.length} unique variant{generatedQuestions.length > 1 ? 's' : ''} generated successfully
              {config.numberOfVariants > 1 && ' with different questions for each variant'}
            </p>
          </div>

          <div className="space-y-4">
            {generatedQuestions.map((paper, index) => (
              <div
                key={paper.paperId}
                className={`rounded-2xl border transition-all duration-300 ${
                  isDark 
                    ? 'bg-gray-800/50 border-gray-700' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                        <FileText className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <h4 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {paper.examType} Paper - Variant {paper.paperId}
                        </h4>
                        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {paper.totalMarks} marks • {paper.questions.length} questions
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleQuestionView(paper.paperId)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDark 
                            ? 'text-blue-400 hover:bg-blue-900/20' 
                            : 'text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        {expandedPaper === paper.paperId ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => downloadWordDocument(paper, index)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDark 
                            ? 'text-green-400 hover:bg-green-900/20' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => downloadPDFDocument(paper, index)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDark 
                            ? 'text-red-400 hover:bg-red-900/20' 
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <FileDown className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Questions:</span>
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        {paper.questions.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Total Marks:</span>
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        {paper.totalMarks}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>MCQ:</span>
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        {paper.questions.filter(q => q.type === 'mcq').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Subjective:</span>
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        {paper.questions.filter(q => q.type !== 'mcq').length}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => downloadWordDocument(paper, index)}
                      className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Download Word</span>
                    </button>
                    <button
                      onClick={() => downloadPDFDocument(paper, index)}
                      className="flex items-center space-x-2 bg-gradient-to-r from-red-600 to-pink-600 text-white py-2 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>

                {/* Questions Preview */}
                {expandedPaper === paper.paperId && (
                  <div className={`border-t p-6 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h5 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Questions Preview
                      </h5>
                      <button
                        onClick={() => toggleQuestionView(paper.paperId)}
                        className={`p-1 rounded ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        <ChevronUp className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                      {paper.questions.map((question, qIndex) => {
                        const validationIssues = validateQuestion(question);
                        
                        return (
                          <div
                            key={qIndex}
                            className={`p-6 rounded-xl border transition-all duration-300 ${
                              isDark 
                                ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            } ${
                              bulkEditMode && selectedQuestions.has(question.id)
                                ? 'ring-2 ring-blue-500'
                                : ''
                            } ${validationIssues.length > 0 ? 'border-red-500/50' : ''}`}
                            draggable={!editingQuestion && !bulkEditMode}
                            onDragStart={(e) => handleDragStart(e, question)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, question)}
                          >
                            {/* Bulk Edit Checkbox */}
                            {bulkEditMode && (
                              <div className="mb-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedQuestions.has(question.id)}
                                    onChange={() => toggleQuestionSelection(question.id)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Select this question
                                  </span>
                                </label>
                              </div>
                            )}

                            {editingQuestion?.paperId === paper.paperId && editingQuestion?.questionIndex === qIndex ? (
                              // Edit Mode
                              <div className="space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h6 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Editing Question {qIndex + 1}
                                  </h6>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={saveEditedQuestion}
                                      className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                                    >
                                      <Save className="w-4 h-4" />
                                      <span>Save</span>
                                    </button>
                                    <button
                                      onClick={cancelEditingQuestion}
                                      className="flex items-center space-x-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                                    >
                                      <XCircle className="w-4 h-4" />
                                      <span>Cancel</span>
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Question Text */}
                                <div>
                                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                    Question Text
                                  </label>
                                  <textarea
                                    value={editedQuestionData.question}
                                    onChange={(e) => updateEditedQuestionField('question', e.target.value)}
                                    rows={3}
                                    className={`w-full p-3 rounded-lg border transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                                      isDark
                                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                    }`}
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className={`block text-sm font-medium mb-2 ${
                                      isDark ? 'text-gray-200' : 'text-gray-700'
                                    }`}>
                                      Question Type
                                    </label>
                                    <span className={`text-sm px-3 py-2 rounded-lg ${
                                      isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {question.type === 'mcq' ? 'Multiple Choice' : question.type === 'short' ? 'Short Answer' : 'Long Answer'}
                                    </span>
                                  </div>
                                  
                                  {/* Marks */}
                                  <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                      Marks
                                    </label>
                                    <input
                                      type="number"
                                      value={editedQuestionData.marks}
                                      onChange={(e) => updateEditedQuestionField('marks', parseInt(e.target.value) || 0)}
                                      min="1"
                                      max="20"
                                      className={`w-24 p-2 rounded-lg border transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        isDark
                                          ? 'bg-gray-800 border-gray-600 text-white'
                                          : 'bg-white border-gray-300 text-gray-900'
                                      }`}
                                    />
                                  </div>
                                </div>
                                
                                {/* MCQ Options */}
                                {question.type === 'mcq' && (
                                  <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                      Options
                                    </label>
                                    <div className="space-y-2">
                                      {editedQuestionData.options.map((option, optIndex) => (
                                        <div key={optIndex} className="flex items-center space-x-2">
                                          <span className={`text-sm font-medium w-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                            {String.fromCharCode(65 + optIndex)}.
                                          </span>
                                          <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => updateEditedOption(optIndex, e.target.value)}
                                            className={`flex-1 p-2 rounded-lg border transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                              isDark
                                                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                            }`}
                                          />
                                          <input
                                            type="radio"
                                            name={`correct-${paper.paperId}-${qIndex}`}
                                            checked={editedQuestionData.correctAnswer === String.fromCharCode(65 + optIndex)}
                                            onChange={() => updateEditedQuestionField('correctAnswer', String.fromCharCode(65 + optIndex))}
                                            className="w-4 h-4 text-blue-600"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                    <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                      Select the radio button next to the correct answer
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              // View Mode
                              <>
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center space-x-3">
                                    <span className={`text-lg font-bold ${
                                      isDark ? 'text-blue-400' : 'text-blue-600'
                                    }`}>
                                      {qIndex + 1}.
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        question.type === 'mcq' 
                                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                          : question.type === 'short'
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                      }`}>
                                        {question.type === 'mcq' ? 'MCQ' : question.type === 'short' ? 'Short' : 'Long'}
                                      </span>
                                      <span className={`text-sm px-2 py-1 rounded ${
                                        isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        {question.marks} mark{question.marks !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    {/* Validation Issues */}
                                    {validationIssues.length > 0 && (
                                      <div className="relative group">
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                        <div className="absolute right-0 top-6 w-64 p-2 bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                          <ul className="list-disc list-inside space-y-1">
                                            {validationIssues.map((issue, idx) => (
                                              <li key={idx}>{issue}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>
                                    )}

                                    {/* Question History */}
                                    {questionHistory[question.id] && questionHistory[question.id].length > 0 && (
                                      <div className="relative group">
                                        <RotateCcw className={`w-4 h-4 cursor-pointer ${
                                          isDark ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'
                                        }`} />
                                        <div className="absolute right-0 top-6 w-48 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                          <div className="text-xs font-medium mb-2">Restore from history:</div>
                                          {questionHistory[question.id].map((historyItem, idx) => (
                                            <button
                                              key={idx}
                                              onClick={() => restoreQuestionFromHistory(question.id, idx)}
                                              className="block w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 truncate"
                                            >
                                              Version {idx + 1}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Move Up/Down */}
                                    {/* <div className="flex flex-col">
                                      <button
                                        onClick={() => moveQuestion(question.id, 'up')}
                                        disabled={qIndex === 0}
                                        className={`p-1 rounded transition-colors ${
                                          qIndex === 0
                                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                            : isDark
                                            ? 'text-gray-400 hover:text-blue-400'
                                            : 'text-gray-500 hover:text-blue-600'
                                        }`}
                                      >
                                        <ChevronUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => moveQuestion(question.id, 'down')}
                                        disabled={qIndex === paper.questions.length - 1}
                                        className={`p-1 rounded transition-colors ${
                                          qIndex === paper.questions.length - 1
                                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                            : isDark
                                            ? 'text-gray-400 hover:text-blue-400'
                                            : 'text-gray-500 hover:text-blue-600'
                                        }`}
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </button>
                                    </div> */}

                                    {/* Action Buttons */}
                                    <div className="flex items-center space-x-1">
                                      <button
                                        onClick={() => startEditingQuestion(paper.paperId, qIndex)}
                                        className={`p-2 rounded-lg transition-colors ${
                                          isDark
                                            ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700'
                                            : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                                        }`}
                                        title="Edit question"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                      
                                      {/* <button
                                        onClick={() => duplicateQuestion(question)}
                                        className={`p-2 rounded-lg transition-colors ${
                                          isDark
                                            ? 'text-gray-400 hover:text-green-400 hover:bg-gray-700'
                                            : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                                        }`}
                                        title="Duplicate question"
                                      >
                                        <Copy className="w-4 h-4" />
                                      </button> */}
                                      
                                      {/* <button
                                        onClick={() => generateSimilarQuestion(question)}
                                        disabled={loading}
                                        className={`p-2 rounded-lg transition-colors ${
                                          loading
                                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                            : isDark
                                            ? 'text-gray-400 hover:text-purple-400 hover:bg-gray-700'
                                            : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
                                        }`}
                                        title="Generate similar question"
                                      >
                                        <Wand2 className="w-4 h-4" />
                                      </button> */}
                                      
                                      {/* <button
                                        onClick={() => deleteQuestion(question.id)}
                                        className={`p-2 rounded-lg transition-colors ${
                                          isDark
                                            ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                                            : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                        }`}
                                        title="Delete question"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button> */}
                                    </div>
                                  </div>
                                </div>

                                <p className={`text-lg mb-4 leading-relaxed ${
                                  isDark ? 'text-gray-100' : 'text-gray-800'
                                }`}>
                                  {question.question}
                                </p>
                                
                                {question.type === 'mcq' && question.options && (
                                  <div className="space-y-2">
                                    {question.options.map((option, optIndex) => (
                                      <div key={optIndex} className={`flex items-center space-x-3 p-2 rounded ${
                                        question.correctAnswer === String.fromCharCode(65 + optIndex)
                                          ? isDark ? 'bg-green-900/20' : 'bg-green-50'
                                          : ''
                                      }`}>
                                        <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                          {String.fromCharCode(65 + optIndex)}.
                                        </span>
                                        <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>
                                          {option}
                                        </span>
                                        {question.correctAnswer === String.fromCharCode(65 + optIndex) && (
                                          <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Question Statistics */}
                                <div className={`mt-4 pt-4 border-t ${
                                  isDark ? 'border-gray-700' : 'border-gray-200'
                                }`}>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                                      {/* Question #{question.id} */}
                                    </span>
                                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                                      {question.question.length} characters
                                    </span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Paper Summary */}
                    <div className={`mt-8 p-4 rounded-xl border ${
                      isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Paper Summary
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            {paper.questions.length}
                          </div>
                          <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>Questions</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            {paper.questions.reduce((sum, q) => sum + q.marks, 0)}
                          </div>
                          <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>Total Marks</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                            {paper.questions.filter(q => q.type === 'mcq').length}
                          </div>
                          <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>MCQ</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                            {paper.questions.filter(q => q.type !== 'mcq').length}
                          </div>
                          <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>Subjective</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionGenerator;