import { useApi } from '@/shared/composables/useApi';

export function useReportsAPI() {
  const api = useApi();

  async function fetchReports() {
    const reports = await api.get('reports');
    return reports || [];
  }

  async function fetchReport(reportId) {
    return await api.get(`reports/${reportId}`);
  }

  async function createReport(reportData) {
    return await api.post('reports', reportData);
  }

  async function updateReport(reportId, reportData) {
    return await api.put(`reports/${reportId}`, reportData);
  }

  async function deleteReport(reportId) {
    return await api.delete(`reports/${reportId}`);
  }

  return {
    fetchReports,
    fetchReport,
    createReport,
    updateReport,
    deleteReport
  };
}
