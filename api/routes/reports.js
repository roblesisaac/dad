import app from '../controllers/reports';
import Protect from '../middlewares/protect';

export default function(api, baseUrl) {
  const protect = Protect.route(api, 'reports', baseUrl);
  const member = protect('member');

  member.get('/reports/:_reportId?', app.getReports);
  member.post('/reports', app.saveReport);
  member.put('/reports/:_reportId', app.updateReport);
  member.delete('/reports/:_reportId', app.deleteReport);
}
