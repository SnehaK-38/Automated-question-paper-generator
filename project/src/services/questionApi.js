const GEMINI_API_KEY = 'AIzaSyACH-iZFHuofmJJSY9SND_LwUCOHNM1zFM';
// const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GEMINI_API_URL ="https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
// Attempt to infer subject name from syllabus text when not explicitly provided
const inferSubjectFromSyllabus = (syllabusText) => {
  if (!syllabusText) return null;
  const patterns = [
    /Subject\s*[:\-]\s*(.+)/i,
    /Course\s*Name\s*[:\-]\s*(.+)/i,
    /Course\s*Title\s*[:\-]\s*(.+)/i,
    /Paper\s*Name\s*[:\-]\s*(.+)/i,
  ];
  for (const pattern of patterns) {
    const match = syllabusText.match(pattern);
    if (match && match[1]) {
      return match[1].split('\n')[0].trim();
    }
  }
  const firstNonEmpty = syllabusText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)[0];
  return firstNonEmpty && firstNonEmpty.length <= 80 ? firstNonEmpty : null;
};

const generatePrompt = (config) => {
  const { subject = 'Engineering Subject', difficulty = 'balanced', questionCount, engineeringBranch = 'Engineering', university = 'Engineering University', syllabusText, examType, totalMarks } = config;
  const rawSyllabus = syllabusText || config.syllabus || config.syllabusContent || '';
  const inferredSubject = inferSubjectFromSyllabus(rawSyllabus);
  const effectiveSubject = inferredSubject || subject;
  
  // Determine question distribution based on exam type and marks
  let questionTypeInstructions = '';
  
  if (examType === 'text' ) {
    // 20 marks total - 5 questions
    questionTypeInstructions = `Generate exactly 5(1 mark each)+ 3(5 mark each) questions for ${examType} (20 marks total):
    - 5 Multiple Choice Questions (1 marks each = 5)
    - 3 Long Answer Questions (5 marks each = 15 marks)
    
    Total:5+15 = 20 marks`;
  } else if (examType === 'pdf') {
    // 60 marks total - 24 questions
    questionTypeInstructions = `Generate exactly 5(1 mark each)+ 11 (5 mark each)questions for EndSem (60 marks total):
     - 5 Multiple Choice Questions (1 marks each = 5)
    - 11 Long Answer Questions (5 marks each = 55 marks)
    
    Total: 5 + 55 = 60 marks`;
  } else {
    // Fallback for other cases
    questionTypeInstructions = `Generate questions based on the specified types. Use these question types:
  
    1. Multiple Choice Questions : 4 options with one correct answer
    3. Long Answer Questions: Require detailed explanations (1-2 paragraphs)`;
  }


  questionTypeInstructions += `
  
  Format each question as:
  {
    "question": "Your question here",
    "type": "mcq|short|long",
    "marks": ${examType ? 'as specified above' : '2-15 (based on question complexity)'},
    "options": ["1", "2", "3", "4"] (only for mcq),
    "correctAnswer": "A" (only for mcq)
  }`;

  const syllabusContext = rawSyllabus ? `\n\nSyllabus Context (AUTHORITATIVE SOURCE):\n${rawSyllabus}\n\nSTRICTLY use ONLY the topics explicitly present in this syllabus. Ignore any outside knowledge or topics not covered here.` : '';
  
  const excludeContext = Array.isArray(config.excludeQuestions) && config.excludeQuestions.length > 0
    ? `\n\nDo NOT repeat, rephrase, or overlap with the following questions (or their meaning):\n- ${config.excludeQuestions.join('\n- ')}`
    : '';
  
  // Prefer syllabus-driven generation whenever a syllabus is provided
  const subjectContext = rawSyllabus
    ? `Generate ${questionCount} balanced difficulty level questions strictly based on the provided syllabus for the ${engineeringBranch} program at ${university}. Focus on the syllabus content rather than any generic subject classification.`
    : (effectiveSubject && engineeringBranch
      ? `Generate ${questionCount} balanced difficulty level questions for ${effectiveSubject} in ${engineeringBranch} program at ${university}.`
      : `Generate ${questionCount} balanced difficulty level engineering questions.`);
  
  return `${subjectContext} ${questionTypeInstructions}${syllabusContext}${excludeContext}

IMPORTANT (HARD CONSTRAINTS): 
IMPORTANT (HARD CONSTRAINTS):
- All questions MUST be unique (no repeats or rephrasing).
- MCQs must come first, then short answers, then long answers.
- Arrange questions strictly in ascending order of marks.
- Questions must be syllabus-based (if provided).
- Provide 4 options and a correct answer for every MCQ.
- Descriptive questions should test understanding and application.

- Questions should be balanced in difficulty (easy to pass, hard to score full marks)
- Ensure proper topic weightage distribution across the syllabus
 - All questions in the returned array MUST be unique; do NOT repeat or rephrase any question within the set
${rawSyllabus ? `- Questions MUST be EXCLUSIVELY from topics mentioned in the syllabus above
- Do NOT include any topic or subtopic that is not present in the syllabus
- Generate questions based strictly on the syllabus content provided
- Focus on the specific topics, modules, and concepts mentioned in the syllabus` : ''}

Return ONLY a JSON array, no additional text.

Requirements:
- Questions should be balanced in difficulty (easy to pass, challenging to excel)
${examType ? `- This is a ${examType} examination with ${totalMarks} total marks` : ''}
${rawSyllabus ? '- Each question should test understanding of concepts explicitly covered in the syllabus' : '- Each question should test understanding of engineering concepts based on the provided content'}
- Questions should follow ${university} examination patterns
${rawSyllabus ? '- Ensure variety across different topics listed in the syllabus' : '- Ensure variety across the provided topics and content'}
- Number of questions should be ${questionCount}
- Make questions challenging but fair for the examination level
- Questions should be suitable for engineering students`;
};

const parseAIResponse = (response, questionCount) => {
  try {
    // Clean the response to extract JSON
    let cleanResponse = response.trim();
    
    // Remove any markdown code blocks
    cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Find JSON array in the response
    const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }
    
    const parsedQuestions = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(parsedQuestions)) {
      throw new Error('Response is not an array');
    }
    
    // Convert to our Question format and add IDs
    const questions = parsedQuestions.slice(0, questionCount).map((q, index) => ({
      id: index + 1,
      type: q.type || 'short',
      question: q.question || `Question ${index + 1}`,
      marks: q.marks || 2,
      options: q.options || [],
      correctAnswer: q.correctAnswer || ''
    }));
    
    return questions;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new Error('Failed to parse AI response');
  }
};

const generateFallbackQuestions = (subject, difficulty, count) => {
  const questions = [];
  
  for (let i = 0; i < count; i++) {
    questions.push({
      id: i + 1,
      type: 'short',
      question: `Engineering question ${i + 1} (${difficulty} level): This is a fallback question. Please check your internet connection and try again for AI-generated questions.`,
      marks: 2,
      options: [],
      correctAnswer: ''
    });
  }
  
  return questions;
};

export const generateQuestions = async (config) => {
  try {
    const prompt = generatePrompt(config);
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: (config.syllabusText || config.syllabus || config.syllabusContent) ? 0.2 : 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', errorData);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    const questions = parseAIResponse(generatedText, config.questionCount);
    
    if (questions.length === 0) {
      throw new Error('No questions generated');
    }
    
    return questions;
    
  } catch (error) {
    console.error('Error generating questions with AI:', error);
    
    // Return fallback questions if AI generation fails
    console.log('Falling back to sample questions due to error');
    return generateFallbackQuestions('Engineering', config.difficulty, config.questionCount);
  }
};
