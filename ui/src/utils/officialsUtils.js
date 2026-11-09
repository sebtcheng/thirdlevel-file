export const getOfficialLevel = (item) => {
  const strand = item.strand || item.target_office || '';
  const office = item.office || item.target_office || '';
  const pos = item.position_title || item.target_position || '';

  const isRegionStrand = /^(Region|NCR|CAR|NIR)/i.test(strand);
  if (!isRegionStrand) return 'Central Office';

  const isROOffice = !office || office.toLowerCase() === strand.toLowerCase() || office.toLowerCase().includes('regional office') || office.toLowerCase() === 'ro';
  const isROPosition = /(Regional Director|RD|ARD)/i.test(pos);
  const isSDOPosition = /(Schools Division Superintendent|SDS|ASDS)/i.test(pos);

  if (isSDOPosition) return 'Schools Division Office';
  if (isROOffice || isROPosition) return 'Regional Office';

  return 'Schools Division Office';
};

export const getOfficialRegion = (item) => {
  if (getOfficialLevel(item) === 'Central Office') return 'Central Office';

  const strand = (item.strand || item.target_office || '').trim();
  if (strand.toUpperCase() === 'REGION XIII' || strand.toUpperCase() === 'CARAGA') return 'CARAGA';

  const knownRegions = [
    'Region I', 'Region II', 'Region III', 'Region IV-A', 'Region IV-B',
    'Region V', 'Region VI', 'Region VII', 'Region VIII', 'Region IX',
    'Region X', 'Region XI', 'Region XII', 'NCR', 'CAR', 'NIR', 'BARMM'
  ];

  const found = knownRegions.find(r => r.toLowerCase() === strand.toLowerCase() || strand.toLowerCase().includes(r.toLowerCase()));
  if (found) return found;

  return 'Central Office';
};

export const expandAcronym = (val) => {
  if (!val) return val;
  const upperVal = val.trim().toUpperCase();
  const map = {
    'ASDS': 'Assistant Schools Division Superintendent (ASDS)',
    'ASDS²': 'Assistant Schools Division Superintendent (2)',
    'ASDS³': 'Assistant Schools Division Superintendent (3)',
    'SDS': 'Schools Division Superintendent (SDS)',
    'RD': 'Regional Director (RD)',
    'ARD': 'Assistant Regional Director (ARD)',
    'OIC-ASDS': 'OIC - Assistant Schools Division Superintendent (ASDS)',
    'OIC-SDS': 'OIC - Schools Division Superintendent (SDS)',
    'OIC-RD': 'OIC - Regional Director (RD)',
    'OIC-ARD': 'OIC - Assistant Regional Director (ARD)'
  };
  return map[upperVal] || val;
};

export const formatPositionTitle = (title) => {
  if (!title || typeof title !== 'string') return '';
  let trimmed = title.trim();
  if (!trimmed || trimmed === 'N/A' || trimmed === 'n/a') return '';

  const acronymMap = {
    'RD': 'Regional Director',
    'REGIONAL DIRECTOR': 'Regional Director',
    'REGIONAL DIR': 'Regional Director',
    'ARD': 'Assistant Regional Director',
    'ASSISTANT REGIONAL DIRECTOR': 'Assistant Regional Director',
    'ASSISTANT REGIONAL DIR': 'Assistant Regional Director',
    'SDS': 'Schools Division Superintendent',
    'SCHOOLS DIVISION SUPERINTENDENT': 'Schools Division Superintendent',
    'ASDS': 'Assistant Schools Division Superintendent',
    'ASSISTANT SCHOOLS DIVISION SUPERINTENDENT': 'Assistant Schools Division Superintendent',
    'UNDERSECRETARY': 'Undersecretary',
    'USEC': 'Undersecretary',
    'SECRETARY': 'Secretary',
    'OSEC': 'Secretary',
    'ASSISTANT SECRETARY': 'Assistant Secretary',
    'ASEC': 'Assistant Secretary',
    'DIRECTOR IV': 'Director IV',
    'DIRECTOR III': 'Director III',
    'EXECUTIVE DIRECTOR II': 'Executive Director II',
    'SCHOOL PRINCIPAL': 'School Principal',
    'PRINCIPAL IV': 'Principal IV',
    'VOCATIONAL SCHOOL ADMINISTRATOR': 'Vocational School Administrator'
  };

  const upper = trimmed.toUpperCase();
  if (acronymMap[upper]) return acronymMap[upper];

  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    return trimmed
      .toLowerCase()
      .split(/\s+/)
      .map(word => {
        const wordUpper = word.toUpperCase();
        if (['IV', 'III', 'II', 'I', 'OIC', 'SDS', 'ASDS', 'RD', 'ARD', 'CO', 'RO', 'SDO'].includes(wordUpper)) {
          return wordUpper;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  return trimmed;
};

