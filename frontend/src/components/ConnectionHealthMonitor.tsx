import React, { useState, useEffect } from 'react';
import { useAdminFunctions } from '../hooks/useAuth';
import { ConnectionHealth } from '../api/permissions';

const ConnectionHealthMonitor: React.FC = () => {
  const { getConnectionHealth, isAdmin } = useAdminFunctions();
  const [connections, setConnections] = useState<ConnectionHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      loadConnectionHealth();
    }
  }, [isAdmin]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh && isAdmin) {
      interval = setInterval(loadConnectionHealth, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, isAdmin]);

  const loadConnectionHealth = async () => {
    try {
      setError(null);
      const healthData = await getConnectionHealth();
      setConnections(healthData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load connection health');
      console.error('Error loading connection health:', err);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'expired': return 'text-orange-600 bg-orange-100';
      case 'revoked': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'expired': return '⏰';
      case 'revoked': return '❌';
      default: return '❓';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTimeUntilNextCheck = (nextCheck: string) => {
    const now = new Date();
    const next = new Date(nextCheck);
    const diff = next.getTime() - now.getTime();
    
    if (diff <= 0) return 'Due now';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `in ${hours}h ${minutes % 60}m`;
    }
    return `in ${minutes}m`;
  };

  const getHealthSummary = () => {
    const total = connections.length;
    const healthy = connections.filter(c => c.status === 'healthy').length;
    const warning = connections.filter(c => c.status === 'warning').length;
    const expired = connections.filter(c => c.status === 'expired').length;
    const revoked = connections.filter(c => c.status === 'revoked').length;

    return { total, healthy, warning, expired, revoked };
  };

  if (!isAdmin) {
    return <div className="text-center p-4">Access denied. Admin privileges required.</div>;
  }

  if (loading) {
    return <div className="text-center p-4">Loading connection health...</div>;
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <div className="text-red-600 mb-2">{error}</div>
        <button 
          onClick={loadConnectionHealth}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  const summary = getHealthSummary();

  return (
    <div className="connection-health-monitor">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Connection Health Monitor</h2>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Auto-refresh</span>
          </label>
          <button 
            onClick={loadConnectionHealth}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl font-bold text-gray-700">{summary.total}</div>
          <div className="text-sm text-gray-600">Total Connections</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl font-bold text-green-600">{summary.healthy}</div>
          <div className="text-sm text-gray-600">Healthy</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl font-bold text-yellow-600">{summary.warning}</div>
          <div className="text-sm text-gray-600">Warning</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl font-bold text-orange-600">{summary.expired}</div>
          <div className="text-sm text-gray-600">Expired</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl font-bold text-red-600">{summary.revoked}</div>
          <div className="text-sm text-gray-600">Revoked</div>
        </div>
      </div>

      {/* Connections Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Connection</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Status</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Last Check</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Last Success</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Failures</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Next Check</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Error Details</th>
            </tr>
          </thead>
          <tbody>
            {connections.map(connection => (
              <tr key={connection.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2">
                  <div className="font-medium">
                    {connection.connection_type.toUpperCase()}
                  </div>
                </td>
                
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(connection.status)}`}>
                    <span className="mr-1">{getStatusIcon(connection.status)}</span>
                    {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
                  </span>
                </td>
                
                <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                  {formatTimestamp(connection.last_check)}
                </td>
                
                <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                  {connection.last_successful_call 
                    ? formatTimestamp(connection.last_successful_call)
                    : <span className="text-gray-400">Never</span>
                  }
                </td>
                
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    connection.failure_count === 0 ? 'bg-green-100 text-green-800' :
                    connection.failure_count < 3 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {connection.failure_count}
                  </span>
                </td>
                
                <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    new Date(connection.next_check_due) <= new Date() 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {getTimeUntilNextCheck(connection.next_check_due)}
                  </span>
                </td>
                
                <td className="border border-gray-300 px-4 py-2 text-sm">
                  {connection.last_error_message ? (
                    <div className="text-red-600 text-xs">
                      {connection.last_error_message}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">No errors</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {connections.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No connection health data available.
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <p><strong>Status Meanings:</strong></p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>Healthy:</strong> Connection is working normally</li>
          <li><strong>Warning:</strong> Connection has some issues but is still functional</li>
          <li><strong>Expired:</strong> Token has expired and needs refresh</li>
          <li><strong>Revoked:</strong> Connection has been revoked and needs re-authentication</li>
        </ul>
      </div>
    </div>
  );
};

export default ConnectionHealthMonitor;
