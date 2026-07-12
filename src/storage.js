// Storage service - abstraction layer for income data persistence
// Currently uses localStorage; can be replaced with backend API

const STORAGE_KEY = 'taxmate_income_records';

export const storageService = {
  // Get all income records
  getIncomeRecords: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading income records:', error);
      return [];
    }
  },

  // Add a new income record
  addIncomeRecord: (record) => {
    try {
      const records = storageService.getIncomeRecords();
      const newRecord = {
        id: Date.now().toString(),
        ...record,
        createdAt: new Date().toISOString(),
      };
      records.push(newRecord);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return newRecord;
    } catch (error) {
      console.error('Error adding income record:', error);
      throw new Error('Failed to save income record', { cause: error });
    }
  },

  // Update an existing income record
  updateIncomeRecord: (id, updates) => {
    try {
      const records = storageService.getIncomeRecords();
      const index = records.findIndex(r => r.id === id);
      if (index === -1) {
        throw new Error('Record not found');
      }
      records[index] = {
        ...records[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return records[index];
    } catch (error) {
      console.error('Error updating income record:', error);
      throw new Error('Failed to update income record', { cause: error });
    }
  },

  // Delete an income record
  deleteIncomeRecord: (id) => {
    try {
      const records = storageService.getIncomeRecords();
      const filtered = records.filter(r => r.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting income record:', error);
      throw new Error('Failed to delete income record', { cause: error });
    }
  },

  // Get a single record by ID
  getIncomeRecord: (id) => {
    const records = storageService.getIncomeRecords();
    return records.find(r => r.id === id);
  },

  // Calculate total income YTD
  calculateTotalIncomeYTD: () => {
    const records = storageService.getIncomeRecords();
    const now = new Date();
    const taxYearStart = new Date(now.getFullYear(), 3, 6); // 6 Apr
    const taxYearEnd = new Date(now.getFullYear() + 1, 3, 5); // 5 Apr

    return records
      .filter(r => {
        const date = new Date(r.date);
        return date >= taxYearStart && date <= taxYearEnd && r.status === 'Received';
      })
      .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  },

  // Calculate income this month
  calculateIncomeThisMonth: () => {
    const records = storageService.getIncomeRecords();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return records
      .filter(r => {
        const date = new Date(r.date);
        return date >= monthStart && date <= monthEnd && r.status === 'Received';
      })
      .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  },

  // Calculate average monthly income
  calculateAverageMonthlyIncome: () => {
    const records = storageService.getIncomeRecords();
    const now = new Date();
    const taxYearStart = new Date(now.getFullYear(), 3, 6);
    const months = Math.ceil((now - taxYearStart) / (1000 * 60 * 60 * 24 * 30));

    const total = records
      .filter(r => r.status === 'Received')
      .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    return months > 0 ? total / months : 0;
  },

  // Get income grouped by month for chart
  getIncomeByMonth: () => {
    const records = storageService.getIncomeRecords();
    const grouped = {};

    records
      .filter(r => r.status === 'Received')
      .forEach(r => {
        const date = new Date(r.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        grouped[monthKey] = (grouped[monthKey] || 0) + parseFloat(r.amount || 0);
      });

    return grouped;
  },

  // Get income grouped by source/category for breakdown
  getIncomeBySource: () => {
    const records = storageService.getIncomeRecords();
    const grouped = {};

    records
      .filter(r => r.status === 'Received')
      .forEach(r => {
        const source = r.source || 'Other';
        grouped[source] = (grouped[source] || 0) + parseFloat(r.amount || 0);
      });

    return grouped;
  },
};
