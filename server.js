require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// EJS Helper Functions
app.locals.getScoreColor = function(score) {
    if (score >= 80) return '#28a745';
    if (score >= 60) return '#17a2b8';
    if (score >= 40) return '#ffc107';
    return '#dc3545';
};

app.locals.getScoreClass = function(score) {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-average';
    return 'score-poor';
};

app.locals.getScoreMessage = function(score) {
    if (score >= 80) return 'Excellent!';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    return 'Needs Improvement';
};

app.locals.getScoreDescription = function(score) {
    if (score >= 80) return 'Your resume is highly optimized for ATS systems and should perform well.';
    if (score >= 60) return 'Your resume has good ATS compatibility with room for improvement.';
    if (score >= 40) return 'Your resume needs some optimization to better pass ATS screening.';
    return 'Your resume requires significant improvements to pass ATS screening effectively.';
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  }
});

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.post('/analyze', upload.single('resume'), async (req, res) => {
  console.log('=== Upload Analysis Started ===');
  console.log('File:', req.file);
  console.log('Body:', req.body);
  
  try {
    if (!req.file) {
      console.log('ERROR: No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Step 1: File received successfully');
    
    // Extract text from resume
    console.log('Step 2: Extracting text from file...');
    const resumeText = await extractTextFromFile(req.file.path);
    console.log('Step 2: Text extracted, length:', resumeText.length);
    
    // Get job target from form
    const jobTarget = req.body.jobTarget || '';
    console.log('Step 3: Job target:', jobTarget);
    
    // Analyze with Gemini API
    console.log('Step 4: Starting Gemini analysis...');
    const analysis = await analyzeResumeWithGemini(resumeText, jobTarget);
    console.log('Step 4: Analysis completed');
    
    // Clean up uploaded file
    console.log('Step 5: Cleaning up file...');
    fs.unlinkSync(req.file.path);
    console.log('Step 5: File cleaned up');
    
    console.log('=== Upload Analysis Completed Successfully ===');
    res.render('result', { analysis, jobTarget });
  } catch (error) {
    console.error('=== UPLOAD ERROR DETAILS ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=== END ERROR DETAILS ===');
    
    // Return HTML error page instead of JSON
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Upload Error</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="bg-light">
        <div class="container mt-5">
          <div class="row justify-content-center">
            <div class="col-md-6">
              <div class="alert alert-danger">
                <h4>Upload Failed</h4>
                <p>There was an error processing your resume. Please try again.</p>
                <p><strong>Error:</strong> ${error.message}</p>
                <a href="/" class="btn btn-primary">Try Again</a>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  }
});

// Function to extract text from uploaded file
async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else {
      throw new Error('Unsupported file format');
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    
    // Handle specific PDF parsing errors
    if (error.message && error.message.includes('bad XRef entry')) {
      throw new Error('The PDF file appears to be corrupted or damaged. Please try uploading a different file.');
    }
    
    throw error;
  }
}

// Function to analyze resume using Gemini API
async function analyzeResumeWithGemini(resumeText, jobTarget = '') {
  try {
    // Test if API key is valid by trying a simple call first
    console.log('Testing Gemini API connection...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const jobContext = jobTarget ? 
      `The user is targeting this role/position: "${jobTarget}". Please analyze the resume specifically for this target and provide tailored recommendations.` : 
      'Analyze this resume for general ATS compatibility.';
    
    const prompt = `
    ${jobContext}
    
    Analyze this resume for ATS compatibility and provide a detailed analysis in JSON format with the following EXACT structure:
    
    {
      "atsScore": 0-100,
      "keywordMatches": ["keyword1", "keyword2"],
      "missingKeywords": ["missing1", "missing2"],
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["weakness1", "weakness2"],
      "formattingIssues": ["issue1", "issue2"],
      "grammarIssues": ["grammar1", "grammar2"],
      "suggestions": ["suggestion1", "suggestion2"],
      "missingSkills": ["skill1", "skill2"],
      "recommendedChanges": ["change1", "change2"],
      "targetedAdvice": "Provide specific, actionable advice for the target role"
    }
    
    Resume Text:
    ${resumeText}
    
    Please analyze the resume thoroughly and provide realistic, actionable feedback. Focus on:
    1. ATS compatibility (formatting, keywords, structure)
    2. Content quality and completeness
    3. Technical skills and qualifications
    4. Professional presentation
    5. Common ATS rejection factors
    6. Alignment with target role/job requirements (if provided)
    7. Specific changes needed to better match the target position
    
    CRITICAL: You MUST include ALL fields in the JSON response, especially "targetedAdvice" which should contain specific advice for the user's career goal.
    
    Return ONLY valid JSON format - no additional text before or after.
    `;
    
    console.log('Gemini: Calling API...');
    const result = await model.generateContent(prompt);
    console.log('Gemini: Got response');
    const response = await result.response;
    console.log('Gemini: Processing response...');
    const text = response.text();
    console.log('Gemini: Raw response length:', text.length);
    
    // Parse JSON response
    console.log('Gemini: Parsing JSON...');
    const analysis = JSON.parse(text);
    console.log('Gemini: JSON parsed successfully');
    
    // Debug logging
    console.log('AI Response:', JSON.stringify(analysis, null, 2));
    
    // Ensure all required fields exist
    return {
      atsScore: analysis.atsScore || 0,
      keywordMatches: analysis.keywordMatches || [],
      missingKeywords: analysis.missingKeywords || [],
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      formattingIssues: analysis.formattingIssues || [],
      grammarIssues: analysis.grammarIssues || [],
      suggestions: analysis.suggestions || [],
      missingSkills: analysis.missingSkills || [],
      recommendedChanges: analysis.recommendedChanges || [],
      targetedAdvice: analysis.targetedAdvice || (jobTarget ? 
        `Based on your goal of becoming a ${jobTarget}, focus on highlighting relevant skills and experiences that align with this role's requirements.` : 
        'No specific advice available for your target role.')
    };
    
  } catch (error) {
    console.error('Error analyzing with Gemini:', error);
    
    // Return default analysis if API fails
    return {
      atsScore: 50,
      keywordMatches: [],
      missingKeywords: [],
      strengths: ['Unable to complete full analysis'],
      weaknesses: ['Analysis service temporarily unavailable'],
      formattingIssues: [],
      grammarIssues: [],
      suggestions: ['Please try again later'],
      missingSkills: [],
      recommendedChanges: [],
      targetedAdvice: 'Analysis service is temporarily unavailable. Please try again later to get personalized advice for your target role.'
    };
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>File Size Error</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body class="bg-light">
          <div class="container mt-5">
            <div class="row justify-content-center">
              <div class="col-md-6">
                <div class="alert alert-warning">
                  <h4>File Too Large</h4>
                  <p>File size too large. Maximum size is 5MB.</p>
                  <a href="/" class="btn btn-primary">Try Again</a>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
    }
  }
  
  if (error.message === 'Only PDF and DOCX files are allowed') {
    return res.status(400).send(`
      <!DOCTYPE html>
        <html>
        <head>
          <title>File Type Error</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body class="bg-light">
          <div class="container mt-5">
            <div class="row justify-content-center">
              <div class="col-md-6">
                <div class="alert alert-warning">
                  <h4>Invalid File Type</h4>
                  <p>Only PDF and DOCX files are allowed.</p>
                  <a href="/" class="btn btn-primary">Try Again</a>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
  }
  
  res.status(500).send(`
    <!DOCTYPE html>
      <html>
      <head>
        <title>Server Error</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="bg-light">
        <div class="container mt-5">
          <div class="row justify-content-center">
            <div class="col-md-6">
              <div class="alert alert-danger">
                <h4>Server Error</h4>
                <p>Internal server error. Please try again.</p>
                <a href="/" class="btn btn-primary">Try Again</a>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`Resume ATS Checker running on port ${PORT}`);
});
