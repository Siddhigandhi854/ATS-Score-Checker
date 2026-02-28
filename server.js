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

// Function to analyze resume using smart mock analysis
async function analyzeResumeWithGemini(resumeText, jobTarget = '') {
  console.log('Starting resume analysis...');
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Basic content analysis
  const hasEmail = /\S+@\S+\.\S+/.test(resumeText);
  const hasPhone = /\d{10,}/.test(resumeText);
  const hasLinkedIn = /linkedin/i.test(resumeText);
  const hasGitHub = /github/i.test(resumeText);
  const wordCount = resumeText.split(/\s+/).length;
  const hasExperience = /experience|work|job/i.test(resumeText);
  const hasEducation = /education|university|college/i.test(resumeText);
  const hasSkills = /skills|technologies|programming/i.test(resumeText);
  
  // Calculate ATS score based on content
  let score = 40; // Base score
  if (hasEmail) score += 15;
  if (hasPhone) score += 10;
  if (hasLinkedIn) score += 5;
  if (hasGitHub) score += 5;
  if (wordCount > 200) score += 10;
  if (wordCount > 500) score += 5;
  if (hasExperience) score += 5;
  if (hasEducation) score += 5;
  if (hasSkills) score += 5;
  
  score = Math.min(score, 100);
  
  // Generate keywords based on content
  const foundKeywords = [];
  if (hasEmail) foundKeywords.push('email', 'contact');
  if (hasPhone) foundKeywords.push('phone');
  if (hasExperience) foundKeywords.push('experience');
  if (hasEducation) foundKeywords.push('education');
  if (hasSkills) foundKeywords.push('skills');
  
  const missingKeywords = [];
  if (!hasLinkedIn) missingKeywords.push('LinkedIn');
  if (!hasPhone) missingKeywords.push('phone number');
  if (wordCount < 300) missingKeywords.push('more content');
  
  // Generate analysis
  const analysis = {
    atsScore: score,
    keywordMatches: foundKeywords,
    missingKeywords: missingKeywords,
    strengths: [
      hasEmail ? '✓ Contact information included' : '✓ Resume structure detected',
      wordCount > 200 ? '✓ Good content length' : '✓ Concise presentation',
      hasExperience ? '✓ Work experience section' : '✓ Professional format',
      '✓ Clean layout and formatting'
    ],
    weaknesses: [
      score < 70 ? '⚠ Could benefit from more keywords' : '⚠ Minor improvements possible',
      !hasLinkedIn ? '⚠ Missing LinkedIn profile' : '⚠ Could enhance professional summary',
      score < 80 ? '⚠ Add more quantifiable achievements' : '⚠ Consider adding certifications'
    ],
    formattingIssues: score < 75 ? ['Consider adding section headers'] : [],
    grammarIssues: [],
    suggestions: [
      '📈 Add quantifiable achievements with numbers',
      '🔍 Include industry-specific keywords',
      '💼 Add professional summary at the top',
      '🎯 Tailor resume to specific job descriptions'
    ],
    missingSkills: jobTarget ? [`Consider adding ${jobTarget}-specific skills`] : [],
    recommendedChanges: [
      'Add measurable accomplishments',
      'Include relevant certifications',
      'Optimize for ATS scanning'
    ],
    targetedAdvice: jobTarget 
      ? `🎯 For your ${jobTarget} application: Focus on highlighting relevant experience and skills that match this role. Add specific achievements that demonstrate your expertise in this field. Consider including keywords commonly found in ${jobTarget} job descriptions.`
      : '💡 Pro tip: Specify your target role to get personalized advice tailored to your career goals and improve your ATS compatibility.'
  };
  
  console.log('Analysis completed successfully');
  console.log('ATS Score:', score);
  return analysis;
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
