const vision = require('@google-cloud/vision');
const OpenAI = require('openai');
const fs = require('fs');

async function testEnhancedExtraction() {
  const visionClient = new vision.ImageAnnotatorClient();
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  console.log('Testing Enhanced Field-Prompt Extraction...');

  // Step 1: OCR with Google Vision
  const [result] = await visionClient.textDetection('test-assets/license.png');
  const detections = result.textAnnotations;

  if (!detections || detections.length === 0) {
    console.log('No text detected');
    return;
  }

  const ocrText = detections[0].description;

  // Step 2: Load enhanced template
  const template = JSON.parse(fs.readFileSync('enhanced-pr-license-template.json', 'utf8'));

  // Step 3: Generate field-specific prompts
  let fieldPrompts = '';
  for (const [fieldName, fieldConfig] of Object.entries(template.extractionFields)) {
    fieldPrompts += `\n**${fieldName}** (${fieldConfig.required ? 'REQUIRED' : 'OPTIONAL'}):\n`;
    fieldPrompts += `${fieldConfig.fieldPrompt}\n`;
    if (fieldConfig.examples) {
      fieldPrompts += `Examples: ${fieldConfig.examples.filter(e => e !== null).join(', ')}\n`;
    }
  }

  const enhancedPrompt = `You are a Puerto Rico driver license extraction expert. Extract structured data using these field-specific instructions:

DOCUMENT TYPE: ${template.documentType}
DOCUMENT INSTRUCTIONS:
${template.documentSpecificInstructions.map(inst => `- ${inst}`).join('\n')}

OCR TEXT FROM LICENSE:
${ocrText}

FIELD EXTRACTION INSTRUCTIONS:
${fieldPrompts}

IMPORTANT RULES:
1. Return ONLY valid JSON with the exact field names specified
2. Follow each field's specific prompt instructions carefully
3. Convert dates to YYYY-MM-DD format
4. Use uppercase for names as specified
5. Return null for optional fields if not found
6. Be precise - don't guess if information is unclear

Return JSON with fields: firstName, secondName, paternalSurname, maternalSurname, dateOfBirth, expirationDate, licenseNumber`;

  console.log('Generated Enhanced Prompt:');
  console.log('=' .repeat(50));
  console.log(enhancedPrompt);
  console.log('=' .repeat(50));

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert document extraction AI. Follow field-specific instructions precisely and return only valid JSON.'
      },
      {
        role: 'user',
        content: enhancedPrompt
      }
    ],
    temperature: 0
  });

  console.log('Enhanced Field-Prompt Extraction Results:');
  console.log('==========================================');
  console.log(completion.choices[0].message.content);
  console.log('==========================================');
}

testEnhancedExtraction().catch(console.error);