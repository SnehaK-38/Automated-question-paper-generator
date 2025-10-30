import React, { useState, useRef } from 'react';
import { Upload, File, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

const FileUpload = ({ onFileUploaded }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const { isDark } = useTheme();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file) => {
    setError('');
    setLoading(true);

    // Check file type
    const allowedTypes = [
      'application/pdf',
      // Note: legacy .doc is not reliably supported in-browser; we warn below
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, DOC, DOCX, or TXT file');
      setLoading(false);
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      setLoading(false);
      return;
    }

    try {
      // Extract text from file
      const extractedText = await extractTextFromFile(file);
      
      if (!extractedText || extractedText.trim().length < 50) {
        setError('Unable to extract sufficient text from the file. The file may be image-only (scanned). Try a DOCX/TXT version or a higher-quality PDF.');
        setLoading(false);
        return;
      }

      setUploadedFile(file);
      onFileUploaded(file, extractedText);
      setLoading(false);
    } catch (err) {
      setError(err?.message || 'Failed to process the file. Please try again.');
      setLoading(false);
    }
  };

  const extractTextFromFile = async (file) => {
    // TXT: straightforward
    if (file.type === 'text/plain') {
      const text = await file.text();
      return text;
    }

    // PDF: use pdfjs-dist dynamically
    if (file.type === 'application/pdf') {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        try {
          const workerUrlModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
          const workerUrl = workerUrlModule?.default || workerUrlModule;
          if (workerUrl && pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
          }
        } catch (_) {}

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let extracted = '';
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          const pageText = content.items.map((item) => item.str).join(' ');
          extracted += pageText + '\n';
        }

        // If text content is too small, attempt OCR fallback (for scanned PDFs)
        if (extracted.trim().length < 50) {
          try {
            const ocrText = await extractPDFWithOCR(pdf);
            if (ocrText && ocrText.trim().length >= 20) {
              return ocrText;
            }
          } catch (_) {}
        }
        return extracted;
      } catch (e) {
        throw new Error('Failed to extract text from PDF. Please ensure dependencies are installed (pdfjs-dist) or upload a TXT/DOCX file.');
      }
    }

    // DOCX: use mammoth (browser build) dynamically
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const mammoth = await import('mammoth/mammoth.browser');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value || '';
      } catch (e) {
        throw new Error('Failed to extract text from DOCX. Please ensure dependencies are installed (mammoth) or upload a TXT/PDF file.');
      }
    }

    // Legacy .doc not supported reliably in-browser
    if (file.type === 'application/msword') {
      throw new Error('Legacy .doc files are not supported for text extraction. Please convert to PDF/DOCX or upload a TXT file.');
    }

    throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
  };

  const extractPDFWithOCR = async (pdf) => {
    const Tesseract = (await import('tesseract.js')).default || (await import('tesseract.js'));
    let ocrExtracted = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const renderTask = page.render({ canvasContext: ctx, viewport });
      await renderTask.promise;
      const dataUrl = canvas.toDataURL('image/png');
      const result = await Tesseract.recognize(dataUrl, 'eng');
      ocrExtracted += (result?.data?.text || '') + '\n';
    }
    return ocrExtracted;
  };

  const removeFile = () => {
    setUploadedFile(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {!uploadedFile ? (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
            dragActive
              ? isDark
                ? 'border-blue-400 bg-blue-900/20'
                : 'border-blue-500 bg-blue-50'
              : isDark
              ? 'border-gray-600 hover:border-gray-500 bg-gray-800/30'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          } ${loading ? 'pointer-events-none opacity-60' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt"
          />
          
          {loading ? (
            <div className="space-y-4">
              <div className="animate-spin mx-auto w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Processing your file...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className={`p-4 rounded-2xl mx-auto w-fit ${
                isDark ? 'bg-blue-900/30' : 'bg-blue-100'
              }`}>
                <Upload className={`w-12 h-12 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              
              <div>
                <h3 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Upload Your Syllabus
                </h3>
                <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                  Drag and drop your syllabus file here, or click to browse
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Supported formats: PDF, DOC, DOCX, TXT (Max size: 10MB)
                </p>
              </div>
              
              <button
                type="button"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Choose File
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={`p-8 rounded-2xl border transition-all duration-300 ${
          isDark 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } shadow-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
                <CheckCircle className={`w-8 h-8 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
              </div>
              <div>
                <h4 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  File Uploaded Successfully
                </h4>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {uploadedFile.name}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/20' 
                  : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className={`mt-6 p-4 rounded-xl border ${
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
    </div>
  );
};

export default FileUpload;