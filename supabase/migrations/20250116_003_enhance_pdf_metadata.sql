-- Enhanced PDF metadata support
-- Add PDF-specific fields to document_extractions

ALTER TABLE document_extractions
ADD COLUMN IF NOT EXISTS page_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS processing_method text CHECK (processing_method IN ('text-extraction', 'ocr-fallback', 'hybrid', 'google-vision-ocr')),
ADD COLUMN IF NOT EXISTS pdf_analysis jsonb DEFAULT '{}';

-- Add index for processing method queries
CREATE INDEX IF NOT EXISTS idx_document_extractions_processing_method
ON document_extractions(processing_method);

-- Update extraction jobs metadata structure for better PDF tracking
-- The metadata field already exists and is flexible enough to store:
-- - originalFileName
-- - uploadedAt
-- - fileType (image/pdf)
-- - mimeType
-- - processingStrategy
-- - estimatedTime
-- - estimatedCost
-- - pdfAnalysis (if applicable)

COMMENT ON COLUMN document_extractions.page_count IS 'Number of pages processed (1 for images, actual count for PDFs)';
COMMENT ON COLUMN document_extractions.processing_method IS 'Method used for text extraction';
COMMENT ON COLUMN document_extractions.pdf_analysis IS 'PDF-specific analysis data including text density, confidence, etc.';