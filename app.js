const express = require('express');
const fs = require('fs');
const path = require('path');
const transporter = require('./config/mailConfig');
const authMiddleware = require('./middlewares/authMiddleware');
const cors = require('cors');
const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(","): '*';

const app = express();
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());

app.post('/:client/email_api', authMiddleware, async (req, res) => {
  const { client } = req.params;
  try {
    const configPath = path.join(__dirname, `clients/${client}/config.json`);

    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'client not found' });
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const { templateId } = req.body

    if (!templateId) {
      return res.status(404).json({ error: 'Id dont mach with any template' });
    }

    const templateConfig = config.templates.find(t => t.id === templateId);
    if (!templateConfig) {
      return res.status(404).json({ error: 'Id dont mach with any template' });
    }

    const templatePath = path.join(__dirname, `clients/${client}/templates/${templateConfig.htmlTemplateUrl}`);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'HTML template file not found' });
    }

    let template = fs.readFileSync(templatePath, 'utf8');
    let subject = templateConfig.subject ?? '';
    let to = templateConfig.to ?? '';

    if (templateConfig.variables && templateConfig.variables.length>0) {
      templateConfig.variables.forEach(variableKey => {
        template = template.replace(`{{${variableKey}}}`, req.body[variableKey] ?? '');
        subject = subject.replace(`{{${variableKey}}}`, req.body[variableKey] ?? '');
        to = to.replace(`{{${variableKey}}}`, req.body[variableKey] ?? '');
      });
    }

    getSystemVariables().forEach((SYSTEM_VARIABLE)=>{
      template = template.replace(`{{${SYSTEM_VARIABLE.key}}}`, SYSTEM_VARIABLE.value);
      subject = subject.replace(`{{${SYSTEM_VARIABLE.key}}}`, SYSTEM_VARIABLE.value);
    })

    const mailOptions = {
      from: templateConfig.from,
      to,
      replyTo: templateConfig.replyTo,
      subject,
      html: template,
    };

    if (templateConfig.cc) {
      mailOptions.cc = templateConfig.cc;
    }

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent sucessfully' });
  } catch (error) {
    console.error('Failed sending email:', error);
    res.status(500).json({ error: 'Failed sending email' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running in http://localhost:${PORT}`);
});

function getSystemVariables() {
  const variables = [
    { key: "currentYear", value: new Date().getFullYear() },
    { key: "currentMonth", value: new Date().getMonth() + 1 },
    { key: "currentDay", value: new Date().getDate() },
    { key: "currentHour", value: new Date().getHours() },
    { key: "currentMinute", value: new Date().getMinutes() },
    { key: "currentSecond", value: new Date().getSeconds() },
    { key: "timestamp", value: Date.now() }
  ];

  return variables;
}