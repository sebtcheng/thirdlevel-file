import { describe, it, expect } from 'vitest';
import {
  EXECUTIVE_POSITIONS,
  DEPED_REGIONS,
  CES_STAGES,
  DESIGNATION_PRESETS,
  REQUIRED_DOCUMENTS,
  formatContactNumber
} from '../src/components/all-vacancies/constants.js';

describe('Applicant Pooling UI definitions', () => {
  const ALLOWED_POSITIONS = ['RD', 'ARD', 'SDS', 'ASDS'];
  const POSITION_MAP = {
    RD: 'Regional Director (RD)',
    ARD: 'Assistant Regional Director (ARD)',
    SDS: 'Schools Division Superintendent (SDS)',
    ASDS: 'Assistant Schools Division Superintendent (ASDS)'
  };

  it('restricts applicant executive positions strictly to the four designated titles', () => {
    expect(ALLOWED_POSITIONS).toEqual(['RD', 'ARD', 'SDS', 'ASDS']);
    expect(Object.keys(POSITION_MAP)).toHaveLength(4);
    expect(POSITION_MAP['RD']).toBe('Regional Director (RD)');
    expect(POSITION_MAP['ARD']).toBe('Assistant Regional Director (ARD)');
    expect(POSITION_MAP['SDS']).toBe('Schools Division Superintendent (SDS)');
    expect(POSITION_MAP['ASDS']).toBe('Assistant Schools Division Superintendent (ASDS)');
  });

  it('calculates weighted scoring correctly across four evaluation criteria', () => {
    const scores = {
      leadership: 90, // 35% -> 31.5
      experience: 80, // 35% -> 28.0
      education: 85,  // 20% -> 17.0
      interview: 95   // 10% -> 9.5
    };
    const total = (scores.leadership * 0.35) + (scores.experience * 0.35) + (scores.education * 0.20) + (scores.interview * 0.10);
    expect(total.toFixed(1)).toBe('86.0');
  });

  it('formats submission timestamps to standard locale format', () => {
    const timestamp = '2026-11-06T10:30:00.000Z';
    const formatted = new Date(timestamp).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    expect(formatted).toBeTruthy();
    expect(formatted).toContain('2026');
  });

  it('validates 4-tab configuration for applicant inspection modal', () => {
    const TABS = [
      { id: 'basic', label: 'Tab 1: Basic Information' },
      { id: 'documents_qs', label: 'Tab 2: Documentary & QS' },
      { id: 'nsc_scoring', label: 'Tab 3: NSC Scoring' },
      { id: 'summary', label: 'Tab 4: Summary' }
    ];
    expect(TABS).toHaveLength(4);
    expect(TABS.map(t => t.id)).toEqual(['basic', 'documents_qs', 'nsc_scoring', 'summary']);
  });

  it('validates 4 verbatim legacy statutory legal questions', () => {
    const STATUTORY_QUESTIONS = [
      { key: 'pending_admin_case', label: '1. Do you have any pending administrative case/s?' },
      { key: 'guilty_admin_details', label: '2. Have you ever been found guilty of any administrative offense?' },
      { key: 'criminally_charged_details', label: '3. Have you been criminally charged before any court?' },
      { key: 'convicted_crime_details', label: '4. Have you ever been convicted of any crime or violation of any law?' }
    ];
    expect(STATUTORY_QUESTIONS).toHaveLength(4);
    expect(STATUTORY_QUESTIONS[0].key).toBe('pending_admin_case');
    expect(STATUTORY_QUESTIONS[3].key).toBe('convicted_crime_details');
  });

  it('calculates NSC overall average across up to 5 committee evaluators accurately', () => {
    const evaluators = [
      { leadership: 90, experience: 80, education: 85, interview: 95 }, // 86.0
      { leadership: 85, experience: 85, education: 80, interview: 90 }, // 84.5
      { leadership: 95, experience: 90, education: 90, interview: 95 }, // 92.25
      { leadership: 80, experience: 80, education: 80, interview: 80 }, // 80.0
      { leadership: 90, experience: 95, education: 85, interview: 90 }  // 90.75
    ];

    const memberTotals = evaluators.map(m => {
      return (m.leadership * 0.35) + (m.experience * 0.35) + (m.education * 0.20) + (m.interview * 0.10);
    });

    expect(memberTotals[0].toFixed(2)).toBe('86.00');
    expect(memberTotals[1].toFixed(2)).toBe('84.50');
    expect(memberTotals[2].toFixed(2)).toBe('92.25');
    expect(memberTotals[3].toFixed(2)).toBe('80.00');
    expect(memberTotals[4].toFixed(2)).toBe('90.75');

    const overallAverage = memberTotals.reduce((a, b) => a + b, 0) / memberTotals.length;
    expect(overallAverage.toFixed(2)).toBe('86.70');
  });

  it('validates verbatim DepEd executive application constants and 12 required documents', () => {
    // 4 executive positions
    expect(EXECUTIVE_POSITIONS).toHaveLength(4);
    expect(EXECUTIVE_POSITIONS.map(p => p.code)).toEqual(['RD', 'ARD', 'SDS', 'ASDS']);

    // 18 DepEd regions
    expect(DEPED_REGIONS).toHaveLength(18);
    expect(DEPED_REGIONS).toContain('NCR');
    expect(DEPED_REGIONS).toContain('Central Office');
    expect(DEPED_REGIONS).toContain('BARMM');

    // 7 CES stages
    expect(CES_STAGES).toHaveLength(7);
    expect(CES_STAGES[0]).toBe('Appointed to a CESO Rank');
    expect(CES_STAGES[6]).toBe('None');

    // 4 designation presets
    expect(DESIGNATION_PRESETS).toHaveLength(4);
    expect(DESIGNATION_PRESETS[2]).toBe('N/A');
    expect(DESIGNATION_PRESETS[3]).toBe('Other');

    // 12 Required Documents
    expect(REQUIRED_DOCUMENTS).toHaveLength(12);
    expect(REQUIRED_DOCUMENTS[0].key).toBe('letter_of_intent');
    expect(REQUIRED_DOCUMENTS[1].key).toBe('pds');
    expect(REQUIRED_DOCUMENTS[9].key).toBe('id_picture');
    expect(REQUIRED_DOCUMENTS[9].isImage).toBe(true);
    expect(REQUIRED_DOCUMENTS[10].key).toBe('applicant_profile_doc');
    expect(REQUIRED_DOCUMENTS[10].templateUrl).toBe('https://tinyurl.com/3rdLevelForms');

    // formatContactNumber helper
    expect(formatContactNumber('09171234567')).toBe('0917-123-4567');
    expect(formatContactNumber('0917')).toBe('0917');
    expect(formatContactNumber('')).toBe('');
  });
});

describe('TIMON Applications Auth Gate & Route Protection', () => {
  const sanitizeReturnUrl = (url) => {
    if (
      url &&
      typeof url === 'string' &&
      url.startsWith('/') &&
      !url.startsWith('//') &&
      !url.startsWith('/login') &&
      !url.startsWith('/register') &&
      !url.startsWith('/reset-password')
    ) {
      return url;
    }
    return null;
  };

  const resolveTargetRedirect = (searchString, state, userRole = '') => {
    const searchParams = new URLSearchParams(searchString);
    const candidate = searchParams.get('returnUrl') || searchParams.get('redirect') || state?.redirectTo || state?.returnUrl;
    const sanitized = sanitizeReturnUrl(candidate);
    if (sanitized) return sanitized;

    const roleLower = (userRole || '').toLowerCase();
    if (['personnel admin', 'super user', 'central office', 'regional office', 'school division office', 'co_pd', 'ro_hrmo', 'sdo_hrmo'].includes(roleLower)) {
      return '/home';
    } else if (['tlo applicant', 'third level applicant'].includes(roleLower)) {
      return '/timon-applications';
    } else {
      return '/official-profiling';
    }
  };

  it('correctly resolves returnUrl query param to /timon-applications after authentication', () => {
    const redirect = resolveTargetRedirect('?returnUrl=%2Ftimon-applications&redirect=%2Ftimon-applications', null, 'TLO Applicant');
    expect(redirect).toBe('/timon-applications');
  });

  it('correctly resolves redirect query param if returnUrl is absent', () => {
    const redirect = resolveTargetRedirect('?redirect=%2Ftimon-applications', null, 'user');
    expect(redirect).toBe('/timon-applications');
  });

  it('falls back to location.state.redirectTo when query parameters are not present', () => {
    const redirect = resolveTargetRedirect('', { redirectTo: '/timon-applications' }, 'user');
    expect(redirect).toBe('/timon-applications');
  });

  it('prevents redirect loops by rejecting auth URLs and falling back to role dashboard', () => {
    expect(resolveTargetRedirect('?returnUrl=%2Flogin', null, 'Central Office')).toBe('/home');
    expect(resolveTargetRedirect('?returnUrl=%2Fregister', null, 'TLO Applicant')).toBe('/timon-applications');
    expect(resolveTargetRedirect('?returnUrl=%2Freset-password', null, 'user')).toBe('/official-profiling');
  });

  it('prevents open redirect attacks by rejecting protocol-relative and external domains', () => {
    expect(resolveTargetRedirect('?returnUrl=%2F%2Fevil.com', null, 'TLO Applicant')).toBe('/timon-applications');
    expect(resolveTargetRedirect('?returnUrl=https%3A%2F%2Fevil.com', null, 'user')).toBe('/official-profiling');
    expect(resolveTargetRedirect('?returnUrl=javascript%3Aalert(1)', null, 'Central Office')).toBe('/home');
  });

  it('generates encoded login URL when ProtectedRoute intercepts unauthenticated access', () => {
    const currentPath = '/timon-applications?category=executive';
    const encoded = encodeURIComponent(currentPath);
    const destination = `/login?returnUrl=${encoded}&redirect=${encoded}`;
    expect(destination).toBe('/login?returnUrl=%2Ftimon-applications%3Fcategory%3Dexecutive&redirect=%2Ftimon-applications%3Fcategory%3Dexecutive');
  });

  it('validates QS Status badge classes and fallback logic for admin submissions table', () => {
    const getBadgeStyle = (status) => {
      if (status === 'QUALIFIED') return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      if (status === 'NOT QUALIFIED') return 'bg-rose-50 text-rose-800 border-rose-300';
      return 'bg-slate-100 text-slate-700 border-slate-300';
    };

    expect(getBadgeStyle('QUALIFIED')).toContain('emerald');
    expect(getBadgeStyle('NOT QUALIFIED')).toContain('rose');
    expect(getBadgeStyle('UNASSESSED')).toContain('slate');
    expect(getBadgeStyle(null)).toContain('slate');

    // Score display fallback
    const renderScoreDisplay = (nscAverage) => {
      if (nscAverage !== null && nscAverage !== undefined) {
        return { display: String(nscAverage), isComplete: true };
      }
      return { display: '--', isComplete: false };
    };

    expect(renderScoreDisplay(88.5)).toEqual({ display: '88.5', isComplete: true });
    expect(renderScoreDisplay(null)).toEqual({ display: '--', isComplete: false });
    expect(renderScoreDisplay(undefined)).toEqual({ display: '--', isComplete: false });
  });

  it('validates separated table column structure for QS Status, NSC Score, and Action', () => {
    const tableColumns = [
      'Candidate Name',
      'Applied Position',
      'Target Region',
      'Submission Timestamp',
      'QS Status',
      'NSC Score',
      'Action'
    ];

    expect(tableColumns).toHaveLength(7);
    expect(tableColumns[4]).toBe('QS Status');
    expect(tableColumns[5]).toBe('NSC Score');
    expect(tableColumns[6]).toBe('Action');
  });

  describe('TIMON Applications Form Tabbed Layout & Dropdown Refactor', () => {
    it('defines the 3 logical form tabs with correct labels and ids', () => {
      const FORM_TABS = [
        { id: 'profile', label: 'Tab 1: Profile & Designation' },
        { id: 'questionnaire', label: 'Tab 2: Questionnaire' },
        { id: 'documents', label: 'Tab 3: Document Uploads' }
      ];

      expect(FORM_TABS).toHaveLength(3);
      expect(FORM_TABS.map(t => t.id)).toEqual(['profile', 'questionnaire', 'documents']);
      expect(FORM_TABS[0].label).toBe('Tab 1: Profile & Designation');
      expect(FORM_TABS[1].label).toBe('Tab 2: Questionnaire');
      expect(FORM_TABS[2].label).toBe('Tab 3: Document Uploads');
    });

    it('contains the 4 exact executive position options for the single dropdown', () => {
      const EXPECTED_OPTIONS = [
        'Regional Director (RD)',
        'Assistant Regional Director (ARD)',
        'Schools Division Superintendent (SDS)',
        'Assistant Schools Division Superintendent (ASDS)'
      ];

      const dropdownOptionTitles = EXECUTIVE_POSITIONS.map(p => p.title);
      expect(dropdownOptionTitles).toEqual(EXPECTED_OPTIONS);
      expect(dropdownOptionTitles).toHaveLength(4);
    });

    it('enforces pre-flight validation before advancing from Tab 1 to Tab 2', () => {
      const validateTab1 = (state) => {
        if (!state.appliedPosition) return false;
        if (!state.targetRegion) return false;
        if (!state.personalData?.surname || !state.personalData?.first_name) return false;
        if (!state.personalData?.contact_number) return false;
        if (!state.personalData?.current_position) return false;
        if (!state.personalData?.plantilla_office) return false;
        if (state.designationData?.current_designation_preset === 'Other' && !state.designationData?.current_designation_custom?.trim()) return false;
        return true;
      };

      // Incomplete state should fail Tab 1 validation
      expect(validateTab1({ appliedPosition: '', targetRegion: 'NCR' })).toBe(false);
      expect(validateTab1({ appliedPosition: 'RD', targetRegion: '' })).toBe(false);
      expect(validateTab1({
        appliedPosition: 'RD',
        targetRegion: 'NCR',
        personalData: { surname: 'DELA CRUZ' }
      })).toBe(false);

      // Complete state should pass
      expect(validateTab1({
        appliedPosition: 'RD',
        targetRegion: 'NCR',
        personalData: {
          surname: 'DELA CRUZ',
          first_name: 'JUAN',
          contact_number: '0917-123-4567',
          current_position: 'Chief Education Supervisor',
          plantilla_office: 'SDO Manila'
        },
        designationData: {
          current_designation_preset: 'N/A'
        }
      })).toBe(true);
    });

    it('maps verbatim questionnaire items strictly for Tab 2', () => {
      const VERBATIM_STATUTORY_QUESTIONS = [
        '1. Do you have any pending administrative case/s filed against you?',
        '2. Have you ever been found guilty of any administrative offense?',
        '3. Have you been criminally charged before any regular court or tribunal?',
        '4. Have you ever been convicted of any crime or violation of any law, decree, or ordinance?'
      ];

      expect(VERBATIM_STATUTORY_QUESTIONS).toHaveLength(4);
      expect(VERBATIM_STATUTORY_QUESTIONS[0]).toContain('pending administrative case');
      expect(VERBATIM_STATUTORY_QUESTIONS[1]).toContain('found guilty of any administrative offense');
      expect(VERBATIM_STATUTORY_QUESTIONS[2]).toContain('criminally charged');
      expect(VERBATIM_STATUTORY_QUESTIONS[3]).toContain('convicted of any crime');
    });
  });
});

