import React, { useState, useEffect } from 'react';
import { useAdminFunctions } from '../hooks/useAuth';
import { AuditLog } from '../api/permissions';

const AuditLogsViewer: React.FC = () => {
  const { getAuditLogs, isAdmin } = useAdminFunctions();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    endpoint: '',
    status: '',
    connectionType: '',
    limit: 100
  });

  useEffect(() => {
    if (isAdmin) {
      loadLogs();
    }
  }, [isAdmin, filter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const logData = await getAuditLogs();
      
      // Apply filters
      let filteredLogs = logData;
      
      if (filter.endpoint) {
        filteredLogs = filteredLogs.filter(log => 
          log.api_endpoint.toLowerCase().includes(filter.endpoint.toLowerCase())
        );
      }
      
      if (filter.status) {
        filteredLogs = filteredLogs.filter(log => 
          filter.status === 'success' ? log.response_status < 400 : log.response_status >= 400
        );
      }
      
      if (filter.connectionType) {
        filteredLogs = filteredLogs.filter(log => 
          log.connection_type === filter.connectionType
        );
      }
      
      setLogs(filteredLogs.slice(0, filter.limit));
    } catch (err) {
      setError('Failed to load audit logs');
      console.error('Error loading logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: number) => {
    if (status < 400) return 'text-green-600';
    if (status < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusText = (status: number) => {
    if (status < 400) return 'Success';
    if (status < 500) return 'Client Error';
    return 'Server Error';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!isAdmin) {
    return <div className="text-center p-4">Access denied. Admin privileges required.</div>;
  }

  if (loading) {
    return <div className="text-center p-4">Loading audit logs...</div>;
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <div className="text-red-600 mb-2">{error}</div>
        <button 
          onClick={loadLogs}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="audit-logs-viewer">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Audit Logs</h2>
        <button 
          onClick={loadLogs}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-medium mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Endpoint
            </label>
            <input
              type="text"
              placeholder="e.g., get_products"
              value={filter.endpoint}
              onChange={(e) => setFilter(prev => ({ ...prev, endpoint: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Connection Type
            </label>
            <select
              value={filter.connectionType}
              onChange={(e) => setFilter(prev => ({ ...prev, connectionType: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="qbo">QBO</option>
              <option value="xero">Xero</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limit
            </label>
            <select
              value={filter.limit}
              onChange={(e) => setFilter(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left text-sm">Timestamp</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm">User</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm">API Endpoint</th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm">Method</th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm">Status</th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm">Connection</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2 text-sm">
                  {formatTimestamp(log.timestamp)}
                </td>
                
                <td className="border border-gray-300 px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">
                      {log.display_email || log.user_id}
                    </div>
                    {log.given_name && (
                      <div className="text-xs text-gray-600">
                        {log.given_name} {log.family_name}
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="border border-gray-300 px-3 py-2 text-sm">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {log.api_endpoint}
                  </code>
                </td>
                
                <td className="border border-gray-300 px-3 py-2 text-center text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    log.request_method === 'GET' ? 'bg-blue-100 text-blue-800' :
                    log.request_method === 'POST' ? 'bg-green-100 text-green-800' :
                    log.request_method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                    log.request_method === 'DELETE' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {log.request_method}
                  </span>
                </td>
                
                <td className="border border-gray-300 px-3 py-2 text-center text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(log.response_status)}`}>
                    {log.response_status} - {getStatusText(log.response_status)}
                  </span>
                  {log.error_message && (
                    <div className="text-xs text-red-600 mt-1">
                      {log.error_message}
                    </div>
                  )}
                </td>
                
                <td className="border border-gray-300 px-3 py-2 text-center text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    log.connection_type === 'qbo' ? 'bg-blue-100 text-blue-800' :
                    log.connection_type === 'xero' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {log.connection_type.toUpperCase()}
                  </span>
                </td>
                
                <td className="border border-gray-300 px-3 py-2 text-sm">
                  <code className="text-xs">{log.ip_address}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No audit logs found matching the current filters.
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        Showing {logs.length} logs. Use filters above to narrow down results.
      </div>
    </div>
  );
};

export default AuditLogsViewer;
