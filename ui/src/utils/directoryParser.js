import * as XLSX from 'xlsx';

export const EXPECTED_HEADERS = [
  'TLO_id',
  'Strand', 
  'Region',
  'Office',
  'Division',
  'Name', 
  'Position', 
  'Designation', 
  'Email',
  'Alternative Email 1',
  'Alternative Email 2',
  'Contact Details',
  'Alternative Contact Details 1',
  'Alternative Contact Details 2'
];

export const parseDirectoryFile = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    try {
      const data = new Uint8Array(fileBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || [];
      const missingHeaders = EXPECTED_HEADERS.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        return reject(new Error(`Missing required columns: ${missingHeaders.join(', ')}`));
      }

      const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      
      const emptyEmails = ['n/a', 'na', '', null];

      const parsedRecords = json.map((row, index) => {
        const rowNum = index + 2; // +1 for 0-index, +1 for header
        const emailRaw = row['Email'] || '';
        const email = String(emailRaw).trim();
        const emailLower = email.toLowerCase();
        
        const fullName = String(row['Name'] || '').trim();
        let lastName = '';
        let firstName = '';
        const commaIdx = fullName.indexOf(',');
        if (commaIdx !== -1) {
            lastName = fullName.substring(0, commaIdx).trim();
            firstName = fullName.substring(commaIdx + 1).trim();
        } else {
            const parts = fullName.split(' ');
            lastName = parts.length > 1 ? parts.pop() : '';
            firstName = parts.join(' ').trim();
        }
        const position = String(row['Position'] || '').trim();
        const office = String(row['Office'] || '').trim();
        const division = String(row['Division'] || '').trim();
        const strand = String(row['Strand'] || '').trim();
        const region = String(row['Region'] || '').trim();
        const designation = String(row['Designation'] || '').trim();
        const TLOid = String(row['TLO_id'] || '').trim();
        const contactDetails = String(row['Contact Details'] || '').trim();
        const altEmail1 = String(row['Alternative Email 1'] || '').trim();
        const altEmail2 = String(row['Alternative Email 2'] || '').trim();
        const altContact1 = String(row['Alternative Contact Details 1'] || '').trim();
        const altContact2 = String(row['Alternative Contact Details 2'] || '').trim();
        
        const isNoEmail = emptyEmails.includes(emailLower);
        
        let isValid = true;
        let validationError = '';
        
        if (!fullName) {
          isValid = false;
          validationError = 'Missing Name';
        } else if (!isNoEmail) {
          if (!/\S+@\S+\.\S+/.test(email)) {
            isValid = false;
            validationError = 'Invalid Email Format';
          }
        }
        
        return {
          rowNum,
          TLOid: TLOid,
          email: email,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          position_title: position,
          office: office,
          division: division,
          strand: strand,
          region: region,
          designation: designation,
          contact_details: contactDetails,
          alt_email_1: altEmail1,
          alt_email_2: altEmail2,
          alt_contact_1: altContact1,
          alt_contact_2: altContact2,
          isValid: isValid,
          validationError: validationError,
          isNoEmail: isNoEmail
        };
      });

      resolve(parsedRecords);
    } catch (err) {
      reject(err);
    }
  });
};
