
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Square, 
  Save, 
  Trash2, 
  Filter, 
  Wifi, 
  Download,
  Upload,
  Network,
  SlidersHorizontal
} from "lucide-react";
import { cn } from '@/lib/utils';

interface ControlPanelProps {
  isScanning: boolean;
  onStartScan: () => void;
  onStopScan: () => void;
  onClearPackets: () => void;
  onFilterChange: (filter: string) => void;
  onInterfaceChange: (iface: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isScanning,
  onStartScan,
  onStopScan,
  onClearPackets,
  onFilterChange,
  onInterfaceChange,
}) => {
  const [filter, setFilter] = useState("");
  const [captureRate, setCaptureRate] = useState(100);
  
  // Mock network interfaces
  const networkInterfaces = [
    { id: "wlan0", name: "Wi-Fi (wlan0)", type: "wireless" },
    { id: "eth0", name: "Ethernet (eth0)", type: "wired" },
    { id: "lo", name: "Loopback (lo)", type: "virtual" },
  ];
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  };
  
  const handleFilterSubmit = () => {
    onFilterChange(filter);
  };
  
  const getInterfaceIcon = (type: string) => {
    switch (type) {
      case "wireless":
        return <Wifi className="h-4 w-4 mr-1" />;
      case "wired":
        return <Network className="h-4 w-4 mr-1" />;
      default:
        return <Network className="h-4 w-4 mr-1" />;
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            onClick={isScanning ? onStopScan : onStartScan}
            variant={isScanning ? "destructive" : "default"}
            size="sm"
            className={cn(
              "transition-all duration-300 h-9",
              isScanning ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
            )}
          >
            {isScanning ? (
              <>
                <Square className="h-4 w-4 mr-1" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Start
              </>
            )}
          </Button>
          
          <Button variant="outline" size="sm" className="h-9" disabled={isScanning}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9" 
            onClick={onClearPackets}
            disabled={isScanning}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-xs">
            <Badge variant="outline" className="h-5 bg-muted/50">
              <Download className="h-3 w-3 mr-1 text-green-500" />
              <span className="font-medium">2.1 MB/s</span>
            </Badge>
            <Badge variant="outline" className="h-5 bg-muted/50">
              <Upload className="h-3 w-3 mr-1 text-blue-500" />
              <span className="font-medium">1.8 MB/s</span>
            </Badge>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                Settings
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Capture Rate</h4>
                  <div className="flex items-center space-x-2">
                    <Slider
                      value={[captureRate]}
                      min={1}
                      max={100}
                      step={1}
                      onValueChange={(value) => setCaptureRate(value[0])}
                    />
                    <span className="text-sm w-8 text-right">{captureRate}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Control the percentage of packets to capture
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Other Options</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">
                      Display Options
                    </Button>
                    <Button variant="outline" size="sm">
                      Protocol Settings
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="flex space-x-2">
        <div className="relative flex-1">
          <Input
            value={filter}
            onChange={handleFilterChange}
            placeholder="Enter capture filter (e.g., tcp port 80, host 192.168.1.1)"
            className="h-9 pr-[90px]"
            disabled={isScanning}
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-9"
            onClick={handleFilterSubmit}
            disabled={isScanning}
          >
            <Filter className="h-4 w-4 mr-1" />
            Apply
          </Button>
        </div>
        
        <Select 
          onValueChange={onInterfaceChange}
          defaultValue={networkInterfaces[0].id}
          disabled={isScanning}
        >
          <SelectTrigger className="w-[220px] h-9">
            <SelectValue placeholder="Select interface" />
          </SelectTrigger>
          <SelectContent>
            {networkInterfaces.map((iface) => (
              <SelectItem key={iface.id} value={iface.id}>
                <div className="flex items-center">
                  {getInterfaceIcon(iface.type)}
                  <span>{iface.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ControlPanel;
