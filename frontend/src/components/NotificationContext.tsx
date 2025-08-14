import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { Notification, NotificationContextType } from '../utils/types';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Notification sounds (you can add actual audio files later)
// const NOTIFICATION_SOUNDS = {
//   order_completed: '/sounds/order-complete.mp3',
//   run_completed: '/sounds/run-complete.mp3',
//   success: '/sounds/success.mp3',
//   error: '/sounds/error.mp3',
//   info: '/sounds/info.mp3',
//   warning: '/sounds/warning.mp3',
// };

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        // Convert timestamp strings back to Date objects
        const notificationsWithDates = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(notificationsWithDates);
      } catch (error) {
        console.error('Failed to parse saved notifications:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Clean up old notifications (keep only last 50)
  useEffect(() => {
    if (notifications.length > 50) {
      setNotifications(prev => prev.slice(-50));
    }
  }, [notifications]);

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.isRead).length, 
    [notifications]
  );

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      isRead: false,
    };

    setNotifications(prev => [newNotification, ...prev]);
    
    // Play notification sound
    playNotificationSound(notification.type);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const playNotificationSound = useCallback((type: Notification['type']) => {
    // For now, we'll just log the sound type
    // You can implement actual audio playback later
    console.log(`Playing notification sound: ${type}`);
    
    // Example implementation with Web Audio API (optional)
    try {
      // Create a simple beep sound for now
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies for different notification types
      const frequencies = {
        order_completed: 800,
        run_completed: 1000,
        success: 600,
        error: 400,
        info: 500,
        warning: 300,
      };
      
      oscillator.frequency.setValueAtTime(frequencies[type] || 500, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error(error);
      console.log('Audio playback not supported or failed');
    }
  }, []);

  // Helper functions for common notification types
  const notifyOrderCompleted = useCallback((quoteId: number, customerName: string, totalAmount: number) => {
    addNotification({
      title: 'Order Completed! 🎉',
      message: `Quote #${quoteId} for ${customerName} has been finalised and sent to QuickBooks.`,
      type: 'order_completed',
      severity: 'success',
      actionUrl: `/quote?id=${quoteId}`,
      metadata: {
        quoteId,
        customerName,
        totalAmount,
      },
    });
  }, [addNotification]);

  const notifyRunCompleted = useCallback((runId: string, runNumber: number, customerNames: string[]) => {
    addNotification({
      title: 'Run Completed! 🚀',
      message: `Run #${runNumber} has been finalised with ${customerNames.length} customer(s): ${customerNames.join(', ')}`,
      type: 'run_completed',
      severity: 'success',
      actionUrl: `/run`,
      metadata: {
        runId,
        customerName: customerNames.join(', '),
      },
    });
  }, [addNotification]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    playNotificationSound,
    notifyOrderCompleted,
    notifyRunCompleted,
  }), [
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    playNotificationSound,
    notifyOrderCompleted,
    notifyRunCompleted,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};
