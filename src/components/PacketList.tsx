
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type PacketType = 'TCP' | 'UDP' | 'ICMP' | 'HTTP' | 'HTTPS' | 'ARP' | 'DNS';

export interface Packet {
  id: string;
  timestamp: Date;
  source: string;
  destination: string;
  protocol: PacketType;
  size: number;
  info: string;
}

interface PacketListProps {
  packets: Packet[];
  selectedPacket?: string;
  onSelectPacket: (id: string) => void;
}

export const PacketList: React.FC<PacketListProps> = ({
  packets,
  selectedPacket,
  onSelectPacket,
}) => {
  // Function to determine the color of the protocol badge
  const getProtocolColor = (protocol: PacketType) => {
    switch (protocol) {
      case 'TCP':
        return "bg-blue-500 hover:bg-blue-600";
      case 'UDP':
        return "bg-green-500 hover:bg-green-600";
      case 'ICMP':
        return "bg-yellow-500 hover:bg-yellow-600";
      case 'HTTP':
        return "bg-purple-500 hover:bg-purple-600";
      case 'HTTPS':
        return "bg-indigo-500 hover:bg-indigo-600";
      case 'ARP':
        return "bg-red-500 hover:bg-red-600";
      case 'DNS':
        return "bg-orange-500 hover:bg-orange-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  // Format timestamp as HH:MM:SS.mmm
  const formatTime = (date: Date) => {
    // Format hours, minutes, seconds
    const timeString = date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    // Manually add milliseconds
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    return `${timeString}.${milliseconds}`;
  };

  return (
    <ScrollArea className="h-[calc(100vh-230px)] w-full rounded-md border border-border/30">
      <div className="space-y-0.5 p-1">
        {packets.map((packet) => (
          <div
            key={packet.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-md cursor-pointer transition-all duration-200",
              "hover:bg-muted/50",
              selectedPacket === packet.id ? "bg-muted" : "bg-transparent",
              "animate-slide-up"
            )}
            onClick={() => onSelectPacket(packet.id)}
          >
            <div className="flex items-center space-x-4 overflow-hidden">
              <div className="flex flex-col space-y-1 min-w-[90px]">
                <span className="text-xs font-medium text-muted-foreground">
                  {formatTime(packet.timestamp)}
                </span>
                <Badge 
                  variant="secondary" 
                  className={cn("text-white text-xs", getProtocolColor(packet.protocol))}
                >
                  {packet.protocol}
                </Badge>
              </div>
              
              <div className="flex flex-col space-y-1 overflow-hidden">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium truncate">{packet.source}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-sm font-medium truncate">{packet.destination}</span>
                </div>
                <span className="text-xs text-muted-foreground truncate">{packet.info}</span>
              </div>
            </div>
            
            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
              {packet.size} bytes
            </span>
          </div>
        ))}
        
        {packets.length === 0 && (
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            No packets captured yet. Start scanning to capture packets.
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
