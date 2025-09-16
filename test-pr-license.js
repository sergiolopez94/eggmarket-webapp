const vision = require('@google-cloud/vision');
const OpenAI = require('openai');

async function testPuertoRicoLicense() {
  const visionClient = new vision.ImageAnnotatorClient();
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  console.log('Testing Puerto Rico License Template...');

  // Step 1: OCR with Google Vision
  const [result] = await visionClient.textDetection('test-assets/license.png');
  const detections = result.textAnnotations;

  if (!detections || detections.length === 0) {
    console.log('No text detected');
    return;
  }

  const ocrText = detections[0].description;

  // Step 2: Use Puerto Rico license template
  const template = {
    "extractionFields": {
      "firstName": {
        "type": "string",
        "patterns": ["first name", "given name", "primer nombre"],
        "required": true,
        "description": "First given name"
      },
      "secondName": {
        "type": "string",
        "patterns": ["second name", "middle name", "segundo nombre"],
        "required": false,
        "description": "Second given name (if present)"
      },
      "paternalSurname": {
        "type": "string",
        "patterns": ["paternal surname", "father surname", "apellido paterno"],
        "required": true,
        "description": "Fathers surname"
      },
      "maternalSurname": {
        "type": "string",
        "patterns": ["maternal surname", "mother surname", "apellido materno"],
        "required": false,
        "description": "Mothers surname (if present)"
      },
      "dateOfBirth": {
        "type": "date",
        "patterns": ["dob", "nac", "date of birth", "fecha nacimiento", "born"],
        "required": true,
        "format": ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD", "DDMmmYYYY"],
        "description": "Date of birth"
      },
      "expirationDate": {
        "type": "date",
        "patterns": ["exp", "expires", "expiration", "valid until", "vencimiento"],
        "required": true,
        "format": ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD", "DDMmmYYYY"],
        "description": "License expiration date"
      },
      "licenseNumber": {
        "type": "string",
        "patterns": ["num", "number", "license", "dl", "#", "numero"],
        "required": true,
        "description": "Driver license number"
      }
    },
    "documentType": "puerto_rico_license",
    "specialInstructions": "For Puerto Rico licenses, names typically follow Spanish naming conventions with paternal and maternal surnames. SERGIO ABRAHAM LOPEZ PEREZ would be: firstName=SERGIO, secondName=ABRAHAM, paternalSurname=LOPEZ, maternalSurname=PEREZ"
  };

  const prompt = `Extract structured data from this Puerto Rico driver's license text using the specified template.

IMPORTANT: For Puerto Rico names, follow Spanish naming conventions:
- Names are typically: [First Name] [Second Name] [Paternal Surname] [Maternal Surname]
- Example: "SERGIO ABRAHAM LOPEZ PEREZ" = firstName: SERGIO, secondName: ABRAHAM, paternalSurname: LOPEZ, maternalSurname: PEREZ

OCR Text:
${ocrText}

Template:
${JSON.stringify(template, null, 2)}

Return ONLY a JSON object with the exact fields: firstName, secondName, paternalSurname, maternalSurname, dateOfBirth, expirationDate, licenseNumber`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a Puerto Rico document extraction expert. Extract data accurately following Spanish naming conventions and return only valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0
  });

  console.log('Puerto Rico License Data Extracted:');
  console.log('===================================');
  console.log(completion.choices[0].message.content);
  console.log('===================================');
}

testPuertoRicoLicense().catch(console.error);