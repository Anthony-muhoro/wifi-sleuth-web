
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface StatusBarProps {
  isScanning: boolean;
  packetCount: number;
  startTime?: Date;
  networkInterface?: string;
  captureFilter?: string;
}

const StatusBar: React.FC<StatusBarProps> = ({
  isScanning,
  packetCount,
  startTime,
  networkInterface = "Unknown",
  captureFilter,
}) => {
  const elapsedTime = startTime 
    ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
    : 0;
  
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center h-9 px-4 border-t border-border/30 text-xs">
      <div className="flex items-center space-x-2">
        <Badge 
          variant="outline" 
          className={cn(
            "h-5 px-2 transition-colors duration-300",
            isScanning ? "bg-green-500/10 text-green-500 border-green-500/30" : "bg-muted"
          )}
        >
          <span className={cn(
            "inline-block w-2 h-2 rounded-full mr-1.5",
            isScanning ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
          )} />
          {isScanning ? "Scanning" : "Idle"}
        </Badge>
        
        <Separator orientation="vertical" className="h-4" />
        
        <span className="text-muted-foreground">
          Packets: <span className="text-foreground font-medium">{packetCount}</span>
        </span>
        
        {startTime && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-muted-foreground">
              Time: <span className="text-foreground font-medium">{formatElapsedTime(elapsedTime)}</span>
            </span>
          </>
        )}
        
        <Separator orientation="vertical" className="h-4" />
        
        <span className="text-muted-foreground">
          Interface: <span className="text-foreground font-medium">{networkInterface}</span>
        </span>
        
        {captureFilter && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-muted-foreground">
              Filter: <span className="text-foreground font-medium">{captureFilter}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default StatusBar;
