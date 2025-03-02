
import React, { useState } from 'react';
import { PacketList } from "@/components/PacketList";
import PacketDetail from "@/components/PacketDetail";
import ControlPanel from "@/components/ControlPanel";
import StatusBar from "@/components/StatusBar";
import UserStatsComponent from "@/components/UserStats";
import { usePacketSimulation } from "@/hooks/use-packet-simulation";

const IndexPage = () => {
  const {
    packets,
    userStats,
    isScanning,
    startTime,
    selectedPacket,
    captureFilter,
    networkInterface,
    availableInterfaces,
    startScan,
    stopScan,
    clearData,
    setSelectedPacket,
    handleFilterChange,
    handleInterfaceChange
  } = usePacketSimulation();
  
  const [activeView, setActiveView] = useState<string>("packets");
  
  const selectedPacketData = selectedPacket 
    ? packets.find(p => p.id === selectedPacket) 
    : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-background p-4 space-y-4">
      <h1 className="text-2xl font-bold">WiFi Packet Analyzer</h1>
      
      <ControlPanel
        isScanning={isScanning}
        onStartScan={startScan}
        onStopScan={stopScan}
        onClearData={clearData}
        onFilterChange={handleFilterChange}
        onInterfaceChange={handleInterfaceChange}
        onViewChange={setActiveView}
        activeView={activeView}
      />
      
      <div className="flex flex-grow gap-4">
        <div className="w-1/2">
          <PacketList
            packets={packets}
            selectedPacket={selectedPacket}
            onSelectPacket={setSelectedPacket}
          />
        </div>
        
        <div className="w-1/2">
          {activeView === "packets" || activeView === "details" ? (
            <PacketDetail packet={selectedPacketData} />
          ) : (
            <UserStatsComponent userStats={userStats} />
          )}
        </div>
      </div>
      
      <StatusBar
        isScanning={isScanning}
        packetCount={packets.length}
        startTime={startTime}
        networkInterface={networkInterface}
        captureFilter={captureFilter}
      />
    </div>
  );
};

export default IndexPage;
