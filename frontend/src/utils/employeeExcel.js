import * as XLSX from 'xlsx';

const TEMPLATE_HEADERS = ['Full Name', 'Department'];

const EXPORT_HEADERS = [
  'Employee ID Number',
  'Full Name',
  'Email',
  'Department',
  'Position',
  'Staff Type',
  'Active',
  'QR Card Code',
  'Joined Date',
];

const HEADER_MAP = {
  'employee id number': 'employeeIdNumber',
  'employee id': 'employeeIdNumber',
  employeeidnumber: 'employeeIdNumber',
  employeeid: 'employeeIdNumber',
  id: 'employeeIdNumber',
  'full name': 'name',
  name: 'name',
  email: 'email',
  'email address': 'email',
  department: 'department',
  dept: 'department',
  position: 'position',
  title: 'position',
  'job title': 'position',
  'staff type': 'staffType',
  stafftype: 'staffType',
  'joined date': 'joinedDate',
  joineddate: 'joinedDate',
  'join date': 'joinedDate',
  'start date': 'joinedDate',
  hired: 'joinedDate',
};

function normalizeHeader(header) {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function formatCellValue(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  if (typeof value === 'number' && value > 25569) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const date = new Date(parsed.y, parsed.m - 1, parsed.d);
      return date.toISOString();
    }
  }

  return String(value).trim();
}

function mapRow(rawRow) {
  const mapped = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const field = HEADER_MAP[normalizeHeader(key)];
    if (!field) continue;

    const formatted = formatCellValue(value);
    if (formatted !== '') {
      mapped[field] = formatted;
    }
  }
  return mapped;
}

function downloadWorkbook(workbook, filename) {
  XLSX.writeFile(workbook, filename);
}

export function exportEmployeesToExcel(employees, filename = 'employees.xlsx') {
  const rows = employees.map((emp) => ({
    'Employee ID Number': emp.employeeProfile?.employeeIdNumber || '',
    'Full Name': emp.name || '',
    Email: emp.email || '',
    Department: emp.employeeProfile?.department || '',
    Position: emp.employeeProfile?.position || '',
    'Staff Type': emp.employeeProfile?.staffType || 'Standard',
    Active: emp.isActive ? 'Yes' : 'No',
    'QR Card Code': emp.qrCards?.[0]?.cardCode || '',
    'Joined Date': emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: EXPORT_HEADERS });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
  downloadWorkbook(workbook, filename);
}

export function downloadEmployeeTemplate(filename = 'employee_import_template.xlsx') {
  const worksheet = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    ['John Doe', 'Engineering'],
    ['Jane Worker', 'Marketing'],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  downloadWorkbook(workbook, filename);
}

export function parseEmployeeExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isCsv = file.name.toLowerCase().endsWith('.csv');

    reader.onload = (event) => {
      try {
        const workbook = isCsv
          ? XLSX.read(event.target.result, { type: 'string' })
          : XLSX.read(new Uint8Array(event.target.result), { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const rows = rawRows
          .map(mapRow)
          .filter((row) => row.name || row.department || row.email || row.employeeIdNumber);

        resolve(rows);
      } catch (error) {
        reject(new Error('Could not parse file. Please use the provided template.'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    if (isCsv) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}
