
import { useState, useEffect, useCallback } from 'react';
import { Packet, PacketType } from '@/components/PacketList';

// Function to generate a random IP address
const generateRandomIP = () => {
  return Array(4).fill(0).map(() => Math.floor(Math.random() * 256)).join('.');
};

// Function to generate a random port
const generateRandomPort = () => {
  return Math.floor(Math.random() * 65535) + 1;
};

// Function to generate a random MAC address
const generateRandomMAC = () => {
  return Array(6).fill(0).map(() => {
    return Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  }).join(':');
};

// List of common protocols
const protocolTypes: PacketType[] = ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'ARP', 'DNS'];

// Function to generate random packet information based on protocol
const generatePacketInfo = (protocol: PacketType, srcIP: string, destIP: string): string => {
  switch (protocol) {
    case 'TCP':
      return `[SYN, ACK] Seq=0 Ack=0 Win=64240 Len=0 MSS=1460`;
    case 'UDP':
      return `Length=${Math.floor(Math.random() * 1000) + 100}`;
    case 'ICMP':
      return `Echo (ping) request id=${Math.floor(Math.random() * 65535)}, seq=${Math.floor(Math.random() * 100)}`;
    case 'HTTP':
      const httpMethods = ['GET', 'POST', 'PUT', 'DELETE'];
      const paths = ['/', '/index.html', '/api/data', '/images/logo.png', '/css/styles.css'];
      return `${httpMethods[Math.floor(Math.random() * httpMethods.length)]} ${paths[Math.floor(Math.random() * paths.length)]} HTTP/1.1`;
    case 'HTTPS':
      return `TLSv1.2 Record Layer: Application Data Protocol`;
    case 'ARP':
      return `Who has ${destIP}? Tell ${srcIP}`;
    case 'DNS':
      const domains = ['example.com', 'google.com', 'github.com', 'amazon.com', 'microsoft.com'];
      return `Standard query 0x${Math.floor(Math.random() * 65535).toString(16)} A ${domains[Math.floor(Math.random() * domains.length)]}`;
    default:
      return 'Unknown packet data';
  }
};

// Function to generate random packet data
const generateRandomPacket = (): Packet => {
  const protocol = protocolTypes[Math.floor(Math.random() * protocolTypes.length)];
  
  // Generate source and destination
  let source = generateRandomIP();
  let destination = generateRandomIP();
  
  // Add ports for TCP, UDP, HTTP, HTTPS
  if (['TCP', 'UDP', 'HTTP', 'HTTPS'].includes(protocol)) {
    source += `:${generateRandomPort()}`;
    
    // Use common ports for specific protocols
    let destinationPort;
    switch (protocol) {
      case 'HTTP':
        destinationPort = 80;
        break;
      case 'HTTPS':
        destinationPort = 443;
        break;
      case 'DNS':
        destinationPort = 53;
        break;
      default:
        destinationPort = generateRandomPort();
    }
    
    destination += `:${destinationPort}`;
  }
  
  // Special case for ARP
  if (protocol === 'ARP') {
    source += ` (${generateRandomMAC()})`;
    destination += ` (${generateRandomMAC()})`;
  }
  
  return {
    id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    timestamp: new Date(),
    source,
    destination,
    protocol,
    size: Math.floor(Math.random() * 1500) + 42, // Ethernet min size is 42 bytes
    info: generatePacketInfo(protocol, source.split(' ')[0], destination.split(' ')[0])
  };
};

// Hook to simulate packet capturing
export const usePacketSimulation = () => {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [startTime, setStartTime] = useState<Date | undefined>(undefined);
  const [interval, setSimulationInterval] = useState<NodeJS.Timeout | null>(null);
  const [selectedPacket, setSelectedPacket] = useState<string | undefined>(undefined);
  const [captureFilter, setCaptureFilter] = useState<string | undefined>(undefined);
  const [networkInterface, setNetworkInterface] = useState<string>('wlan0');

  // Function to start scanning
  const startScan = useCallback(() => {
    if (isScanning) return;
    
    setIsScanning(true);
    setStartTime(new Date());
    
    const intervalId = setInterval(() => {
      setPackets(prev => {
        const newPacket = generateRandomPacket();
        return [newPacket, ...prev];
      });
    }, 1000); // Generate a new packet every second
    
    setSimulationInterval(intervalId);
  }, [isScanning]);

  // Function to stop scanning
  const stopScan = useCallback(() => {
    if (!isScanning) return;
    
    setIsScanning(false);
    
    if (interval) {
      clearInterval(interval);
      setSimulationInterval(null);
    }
  }, [isScanning, interval]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [interval]);

  return {
    packets,
    isScanning,
    startTime,
    selectedPacket,
    captureFilter,
    networkInterface,
    startScan,
    stopScan,
    clearPackets,
    setSelectedPacket,
    handleFilterChange,
    handleInterfaceChange
  };
};
