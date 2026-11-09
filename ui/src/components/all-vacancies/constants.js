export const EXECUTIVE_POSITIONS = [
    {
        code: 'RD',
        title: 'Regional Director (RD)',
        desc: 'Executive leadership of regional educational operations and policy implementation.'
    },
    {
        code: 'ARD',
        title: 'Assistant Regional Director (ARD)',
        desc: 'Executive assistance in regional management and strategic program direction.'
    },
    {
        code: 'SDS',
        title: 'Schools Division Superintendent (SDS)',
        desc: 'Executive supervision of schools division governance and instructional delivery.'
    },
    {
        code: 'ASDS',
        title: 'Assistant Schools Division Superintendent (ASDS)',
        desc: 'Executive assistance in divisional supervision and institutional operations.'
    }
];

export const DEPED_REGIONS = [
    'Central Office',
    'Region I',
    'Region II',
    'Region III',
    'Region IV-A',
    'Region IV-B',
    'Region V',
    'Region VI',
    'Region VII',
    'Region VIII',
    'Region IX',
    'Region X',
    'Region XI',
    'Region XII',
    'CARAGA',
    'CAR',
    'NCR',
    'BARMM'
];

export const CES_STAGES = [
    'Appointed to a CESO Rank',
    'Conferred CES Eligibility',
    'Stage 4 (Board Interview)',
    'Stage 3 (Performance Validation)',
    'Stage 2 (Assessment Center)',
    'Stage 1 (CES Written Examination)',
    'None'
];

export const DESIGNATION_PRESETS = [
    'OIC-SDS (Officer-in-Charge of the Office of the Schools Division Superintendent)',
    'OIC-ASDS (Officer-in-Charge of the Office of the Assistant Schools Division Superintendent)',
    'N/A',
    'Other'
];

export const REQUIRED_DOCUMENTS = [
    {
        key: 'letter_of_intent',
        binaryKey: 'letter_of_intent_binary_id',
        nameKey: 'letter_of_intent_filename',
        label: '1. Letter of Intent',
        instruction: 'Addressed to Secretary Sonny Angara (PDF only)',
        accept: '.pdf,application/pdf',
        isPdf: true,
        required: true
    },
    {
        key: 'pds',
        binaryKey: 'pds_binary_id',
        nameKey: 'pds_filename',
        label: '2. Personal Data Sheet (PDS) CSC Form 212',
        instruction: 'Must be notarized within the last 6 months (PDF only)',
        accept: '.pdf,application/pdf',
        isPdf: true,
        required: true
    },
    {
        key: 'work_experience_sheet',
        binaryKey: 'work_experience_sheet_binary_id',
        nameKey: 'work_experience_sheet_filename',
        label: '3. PDS - Work Experience Sheet',
        instruction: 'Attachment to CSC Form 212 (PDF only)',
        accept: '.pdf,application/pdf',
        isPdf: true,
        required: true
    },
    {
        key: 'cv',
        binaryKey: 'cv_binary_id',
        nameKey: 'cv_filename',
        label: '4. Curriculum Vitae (CV)',
        instruction: 'Comprehensive curriculum vitae (PDF only)',
        accept: '.pdf,application/pdf',
        isPdf: true,
        required: true
    },
    {
        key: 'outstanding_accomplishments',
        binaryKey: 'outstanding_accomplishments_binary_id',
        nameKey: 'outstanding_accomplishments_filename',
        label: '5. Outstanding Accomplishments',
        instruction: 'Supported by certificates, citations, or relevant evidence (PDF only)',
        accept: '.pdf,application/pdf',
        isPdf: true,
        required: false
    },
    {
        key: 'service_records',
        binaryKey: 'service_records_binary_id',
        nameKey: 'service_records_filename',
        label: '6. Service Records',
        instruction: 'Updated and certified government / DepEd service record (PDF only)',
        accept: '.pdf,application/pdf',
        isPdf: true,
        required: true
    },
    {
        key: 'transcript_of_records',
        binaryKey: 'transcript_of_records_binary_id',
        nameKey: 'transcript_of_records_filename',
        label: '7. Transcript of Records (TOR)',
        instruction: 'Baccalaureate and post-graduate degree transcripts (PDF only)',
        accept: '.pdf,application/pdf',
        isPdf: true,
        required: true
    },
    {
        key: 'performance_eval',
        binaryKey: 'performance_eval_binary_id',
        nameKey: 'performance_eval_filename',
        label: '8. Performance Evaluation Records',
        instruction: 'CESPES, OPCRF, or IPCRF for the last rating period (PDF only)',
        accept: '.pdf,application/pdf',
        isPdf: true,
        required: true
    },
    {
        key: 'self_certification',
        binaryKey: 'self_certification_binary_id',
        nameKey: 'self_certification_filename',
        label: '9. Self-Certification of Pending Charges',
        instruction: 'Self-certification of pending administrative/civil/criminal charges notarized (PDF only)',
        accept: '.pdf,application/pdf',
        isPdf: true,
        required: true
    },
    {
        key: 'id_picture',
        binaryKey: 'id_picture_binary_id',
        nameKey: 'id_picture_filename',
        label: '10. ID Picture (Passport size)',
        instruction: 'Recent passport-sized colored photo with white background (JPG/PNG/WebP only)',
        accept: 'image/jpeg,image/png,image/webp',
        isImage: true,
        required: true
    },
    {
        key: 'applicant_profile_doc',
        binaryKey: 'applicant_profile_doc_binary_id',
        nameKey: 'applicant_profile_doc_filename',
        label: '11. Accomplished Applicant Profile',
        instruction: 'Accomplished template from https://tinyurl.com/3rdLevelForms (PDF only)',
        accept: '.pdf,application/pdf',
        isPdf: true,
        templateUrl: 'https://tinyurl.com/3rdLevelForms',
        required: true
    },
    {
        key: 'other_documents',
        binaryKey: 'other_documents_binary_id',
        nameKey: 'other_documents_filename',
        label: '12. Other Relevant Documents',
        instruction: 'Any other credentials, special orders, or supporting documents (PDF only)',
        accept: '.pdf,application/pdf',
        isPdf: true,
        required: false
    }
];

export const formatContactNumber = (val) => {
    const digits = (val || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
};

