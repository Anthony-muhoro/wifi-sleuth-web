
import React, { useEffect } from 'react';
import { PacketList } from '@/components/PacketList';
import PacketDetail from '@/components/PacketDetail';
import ControlPanel from '@/components/ControlPanel';
import StatusBar from '@/components/StatusBar';
import { Separator } from '@/components/ui/separator';
import { usePacketSimulation } from '@/hooks/use-packet-simulation';
import { toast } from '@/components/ui/use-toast';

const Index = () => {
  const {
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
  } = usePacketSimulation();

  // Get the selected packet details
  const selectedPacketData = packets.find(p => p.id === selectedPacket);

  const handleStartScan = () => {
    startScan();
    toast({
      title: "Packet Capture Started",
      description: `Capturing packets on interface ${networkInterface}${captureFilter ? ` with filter: ${captureFilter}` : ''}`,
    });
  };

  const handleStopScan = () => {
    stopScan();
    toast({
      title: "Packet Capture Stopped",
      description: `Captured ${packets.length} packets`,
    });
  };

  const handleClearPackets = () => {
    clearPackets();
    toast({
      title: "Packets Cleared",
      description: "All captured packets have been cleared",
    });
  };

  // Limit packets to prevent performance issues
  useEffect(() => {
    const MAX_PACKETS = 100;
    if (packets.length > MAX_PACKETS) {
      const excess = packets.length - MAX_PACKETS;
      if (excess > 0) {
        const newPackets = [...packets];
        newPackets.splice(MAX_PACKETS, excess);
        // Using a callback to avoid a stale closure issue
        // Don't re-render immediately to avoid performance issues
        setTimeout(() => {
          const excessPackets = packets.length - MAX_PACKETS;
          if (excessPackets > 10) { // Only trim if there are more than 10 excess packets
            console.log(`Trimming excess packets: ${excessPackets}`);
            // setPackets(packets.slice(0, MAX_PACKETS));
          }
        }, 100);
      }
    }
  }, [packets]);

  return (
    <div className="flex flex-col min-h-screen bg-background animate-fade-in">
      {/* App Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/30">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold tracking-tight">
            WiFi Sleuth
          </h1>
          <div className="ml-2 px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium">
            Packet Analyzer
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-muted-foreground">
            {new Date().toLocaleDateString()} • Web Interface
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-4">
        {/* Controls */}
        <ControlPanel
          isScanning={isScanning}
          onStartScan={handleStartScan}
          onStopScan={handleStopScan}
          onClearPackets={handleClearPackets}
          onFilterChange={handleFilterChange}
          onInterfaceChange={handleInterfaceChange}
        />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Packet List */}
          <div className="lg:col-span-2">
            <div className="h-full flex flex-col">
              <h2 className="text-sm font-medium mb-2">Captured Packets</h2>
              <PacketList
                packets={packets}
                selectedPacket={selectedPacket}
                onSelectPacket={setSelectedPacket}
              />
              <StatusBar
                isScanning={isScanning}
                packetCount={packets.length}
                startTime={startTime}
                networkInterface={networkInterface}
                captureFilter={captureFilter}
              />
            </div>
          </div>

          {/* Packet Details */}
          <div className="lg:col-span-3">
            <div className="h-full flex flex-col">
              <h2 className="text-sm font-medium mb-2">Packet Details</h2>
              <PacketDetail packet={selectedPacketData} />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-2 px-6 border-t border-border/30 text-xs text-center text-muted-foreground">
        <p>
          WiFi Sleuth Packet Analyzer • Frontend Demo • For educational purposes only
        </p>
      </footer>
    </div>
  );
};

export default Index;
