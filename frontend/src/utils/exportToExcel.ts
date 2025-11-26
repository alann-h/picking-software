import { Run } from './types';

export const exportRunsToCSV = (runs: Run[]) => {
  // Filter for completed runs
  const completedRuns = runs.filter(run => run.status === 'completed');

  if (completedRuns.length === 0) {
    return false;
  }

  // Define columns
  const headers = [
    'Run Number',
    'Run Name',
    'Status',
    'Created Date',
    'Customer Name',
    'Total Quotes',
    'Total Amount',
    'Run ID'
  ];

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...completedRuns.map(run => {
      const createdDate = new Date(run.created_at).toLocaleDateString();
      const customerName = run.customer_name || run.quotes.map(q => q.customerName).join('; ') || '';
      const totalQuotes = run.quotes.length;
      const totalAmount = run.total_amount || run.quotes.reduce((sum, q) => sum + Number(q.totalAmount), 0);

      return [
        run.run_number,
        `"${(run.run_name || '').replace(/"/g, '""')}"`, // Escape quotes
        run.status,
        createdDate,
        `"${customerName.replace(/"/g, '""')}"`,
        totalQuotes,
        totalAmount.toFixed(2),
        run.id
      ].join(',');
    })
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `completed_runs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return true;
};

