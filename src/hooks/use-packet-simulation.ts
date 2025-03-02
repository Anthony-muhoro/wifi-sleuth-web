
import { useState, useEffect, useCallback, useRef } from 'react';
import { Packet, PacketType } from '@/components/PacketList';
import { toast } from 'sonner';

export const usePacketSimulation = () => {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [startTime, setStartTime] = useState<Date | undefined>(undefined);
  const [selectedPacket, setSelectedPacket] = useState<string | undefined>(undefined);
  const [captureFilter, setCaptureFilter] = useState<string | undefined>(undefined);
  const [networkInterface, setNetworkInterface] = useState<string>('en0');
  const [availableInterfaces, setAvailableInterfaces] = useState<{name: string}[]>([]);
  
  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  
  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket('ws://localhost:3001');
      
      ws.onopen = () => {
        console.log('Connected to packet capture server');
        toast.success('Connected to packet capture server');
        
        // Request available interfaces
        ws.send(JSON.stringify({
          type: 'get-interfaces'
        }));
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
          case 'packet':
            setPackets(prev => [data.packet, ...prev]);
            break;
            
          case 'interfaces':
            setAvailableInterfaces(data.interfaces);
            if (data.interfaces.length > 0) {
              setNetworkInterface(data.interfaces[0].name);
            }
            break;
            
          case 'scan-started':
            setIsScanning(true);
            setStartTime(new Date());
            toast.success(`Scanning started on ${data.interface}`);
            break;
            
          case 'scan-stopped':
            setIsScanning(false);
            toast.info('Scanning stopped');
            break;
            
          case 'error':
            toast.error(data.message);
            setIsScanning(false);
            break;
        }
      };
      
      ws.onclose = () => {
        console.log('Disconnected from packet capture server');
        toast.error('Disconnected from packet capture server. Reconnecting...');
        
        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (wsRef.current === ws) {
            connectWebSocket();
          }
        }, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Failed to connect to packet capture server');
      };
      
      wsRef.current = ws;
    };
    
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);
  
  // Function to start scanning
  const startScan = useCallback(() => {
    if (isScanning || !wsRef.current) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'start-scan',
      interface: networkInterface,
      filter: captureFilter
    }));
  }, [isScanning, networkInterface, captureFilter]);
  
  // Function to stop scanning
  const stopScan = useCallback(() => {
    if (!isScanning || !wsRef.current) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'stop-scan'
    }));
  }, [isScanning]);
  
  // Function to clear all packets
  const clearPackets = useCallback(() => {
    setPackets([]);
    setSelectedPacket(undefined);
  }, []);
  
  // Function to handle filter changes
  const handleFilterChange = useCallback((filter: string) => {
    setCaptureFilter(filter || undefined);
  }, []);
  
  // Function to handle interface changes
  const handleInterfaceChange = useCallback((iface: string) => {
    setNetworkInterface(iface);
  }, []);

  return {
    packets,
    isScanning,
    startTime,
    selectedPacket,
    captureFilter,
    networkInterface,
    availableInterfaces,
    startScan,
    stopScan,
    clearPackets,
    setSelectedPacket,
    handleFilterChange,
    handleInterfaceChange
  };
};
