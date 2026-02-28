# Resume ATS Checker

A full-stack web application that analyzes resumes for ATS (Applicant Tracking System) compatibility using AI technology powered by Google Gemini API.

## 🚀 Features

- **Resume Upload**: Support for PDF and DOCX file formats
- **AI-Powered Analysis**: Uses Google Gemini API for intelligent resume analysis
- **ATS Scoring**: Provides a comprehensive ATS compatibility score (0-100%)
- **Detailed Insights**: 
  - Keyword analysis (found and missing keywords)
  - Strengths and weaknesses identification
  - Formatting issues detection
  - Grammar and language suggestions
  - Skills gap analysis
- **Modern UI**: Responsive design with Bootstrap and beautiful gradients
- **Drag & Drop**: Intuitive file upload interface
- **Visual Results**: Interactive progress rings and color-coded analysis

## 🛠️ Tech Stack

### Frontend
- **EJS Templates**: Server-side templating
- **Bootstrap 5**: Responsive CSS framework
- **Font Awesome**: Icon library
- **Vanilla JavaScript**: Client-side interactions

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **Multer**: File upload handling
- **pdf-parse**: PDF text extraction
- **mammoth**: DOCX text extraction
- **Google Generative AI**: Gemini API integration
- **dotenv**: Environment variable management

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google Gemini API key

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd resume-ats-checker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file and add your Google Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   PORT=3000
   ```

4. **Get Google Gemini API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy and paste it into your `.env` file

5. **Start the application**
   ```bash
   npm start
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## 📁 Project Structure

```
resume-ats-checker/
├── views/                  # EJS templates
│   ├── index.ejs          # Home page with upload form
│   └── result.ejs         # Results page
├── public/                # Static assets (CSS, JS, images)
├── uploads/               # Temporary file storage
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env.example           # Environment variables template
├── .gitignore            # Git ignore file
└── README.md             # This file
```

## 🔧 API Endpoints

### GET `/`
- Renders the home page with resume upload form

### POST `/analyze`
- Accepts resume file upload
- Extracts text from PDF/DOCX
- Analyzes resume using Gemini API
- Returns detailed ATS analysis results

## 📊 Analysis Features

The application analyzes resumes for:

1. **ATS Compatibility Score** (0-100%)
2. **Keyword Analysis**
   - Found keywords in the resume
   - Missing important keywords
3. **Content Quality**
   - Identified strengths
   - Areas for improvement
4. **Technical Issues**
   - Formatting problems
   - Grammar and language issues
5. **Skills Assessment**
   - Missing skills recommendations
   - Skill gap analysis

## 🎨 UI Features

- **Modern Design**: Beautiful gradient backgrounds and card-based layouts
- **Responsive**: Works seamlessly on desktop, tablet, and mobile
- **Interactive**: Drag-and-drop file upload with progress indicators
- **Visual Feedback**: Color-coded results and animated progress rings
- **User-Friendly**: Clear navigation and intuitive interface

## 📝 Usage Example

1. **Upload Resume**: 
   - Click "Choose File" or drag and drop your resume
   - Supported formats: PDF, DOCX (max 5MB)

2. **Analysis Process**:
   - Application extracts text from your resume
   - Sends text to Google Gemini API for analysis
   - Processes AI response and generates insights

3. **View Results**:
   - Overall ATS score with visual progress ring
   - Detailed breakdown of strengths and weaknesses
   - Actionable recommendations for improvement
   - Keyword analysis and suggestions

## 🔒 Security Features

- File type validation (PDF and DOCX only)
- File size limits (5MB maximum)
- Temporary file storage (auto-cleanup after analysis)
- Input sanitization and validation

## 🚀 Deployment

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start server.js --name "resume-ats-checker"

# Save PM2 configuration
pm2 save
pm2 startup
```

### Using Docker

Create a `Dockerfile`:

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p uploads

EXPOSE 3000

CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t resume-ats-checker .
docker run -p 3000:3000 --env-file .env resume-ats-checker
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

1. **"GEMINI_API_KEY not found"**
   - Make sure your `.env` file exists and contains the API key
   - Restart the server after updating environment variables

2. **"File upload failed"**
   - Check file size (must be under 5MB)
   - Ensure file format is PDF or DOCX
   - Check uploads directory permissions

3. **"Analysis failed"**
   - Verify your Gemini API key is valid
   - Check your internet connection
   - Ensure API quota is not exceeded

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=* npm start
```

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the [GitHub Issues](https://github.com/your-repo/issues)
3. Create a new issue with detailed information

## 🔄 Updates

The application is regularly updated to:
- Improve AI analysis accuracy
- Add new features and insights
- Enhance user interface
- Fix bugs and security issues

Stay updated by watching the repository!
