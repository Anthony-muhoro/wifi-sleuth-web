
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Packet } from './PacketList';
import { cn } from '@/lib/utils';

interface PacketDetailProps {
  packet?: Packet;
}

const PacketDetail: React.FC<PacketDetailProps> = ({ packet }) => {
  if (!packet) {
    return (
      <div className="h-[calc(100vh-230px)] flex items-center justify-center rounded-md border border-border/30 bg-card/50">
        <p className="text-muted-foreground">Select a packet to view details</p>
      </div>
    );
  }

  // Mock packet details for different views
  const mockHexData = Array.from({ length: 16 }, (_, i) => 
    Array.from({ length: 16 }, (_, j) => 
      ((i * 16) + j).toString(16).padStart(2, '0')
    ).join(' ')
  );

  // Mock structured data representing packet headers
  const mockHeaders = {
    "Ethernet Header": {
      "Destination": "00:1A:2B:3C:4D:5E",
      "Source": "5E:4D:3C:2B:1A:00",
      "Type": "IPv4 (0x0800)"
    },
    "IPv4 Header": {
      "Version": "4",
      "Header Length": "20 bytes",
      "Type of Service": "0x00",
      "Total Length": `${packet.size} bytes`,
      "Identification": "0x1234",
      "Flags": "Don't Fragment",
      "Fragment Offset": "0",
      "Time to Live": "64",
      "Protocol": packet.protocol,
      "Header Checksum": "0x1A2B",
      "Source IP": packet.source,
      "Destination IP": packet.destination
    }
  };

  // Add protocol specific headers based on packet type
  if (packet.protocol === 'TCP') {
    mockHeaders['TCP Header'] = {
      "Source Port": packet.source.split(':')[1] || "12345",
      "Destination Port": packet.destination.split(':')[1] || "80",
      "Sequence Number": "123456789",
      "Acknowledgment Number": "987654321",
      "Data Offset": "20 bytes",
      "Flags": "SYN, ACK",
      "Window Size": "64240",
      "Checksum": "0x3C4D",
      "Urgent Pointer": "0"
    };
  } else if (packet.protocol === 'UDP') {
    mockHeaders['UDP Header'] = {
      "Source Port": packet.source.split(':')[1] || "12345",
      "Destination Port": packet.destination.split(':')[1] || "53",
      "Length": `${packet.size} bytes`,
      "Checksum": "0x5E6F"
    };
  }

  return (
    <div className="h-[calc(100vh-230px)] rounded-md border border-border/30 bg-card/50 overflow-hidden">
      <Tabs defaultValue="structured" className="w-full h-full">
        <div className="flex items-center px-4 py-2 border-b border-border/30">
          <h3 className="text-sm font-medium mr-4">
            Packet #{packet.id.substring(0, 8)}
          </h3>
          <TabsList className="grid w-[300px] grid-cols-3">
            <TabsTrigger value="structured">Structured</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
            <TabsTrigger value="hex">Hex</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="structured" className="h-[calc(100%-45px)] mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {Object.entries(mockHeaders).map(([sectionName, fields]) => (
                <div key={sectionName} className="space-y-2">
                  <h4 className="text-sm font-medium text-primary">{sectionName}</h4>
                  <div className="bg-card rounded-md border border-border/40 divide-y divide-border/40">
                    {Object.entries(fields).map(([fieldName, value]) => (
                      <div key={fieldName} className="flex py-2 px-3 text-sm">
                        <span className="w-1/3 font-medium text-muted-foreground">{fieldName}</span>
                        <span className="w-2/3">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="raw" className="h-[calc(100%-45px)] mt-0">
          <ScrollArea className="h-full">
            <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
              {`GET / HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
Accept: text/html,application/xhtml+xml
Connection: keep-alive
              
HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
Content-Length: 1256
Connection: keep-alive
Cache-Control: max-age=604800`}
            </pre>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="hex" className="h-[calc(100%-45px)] mt-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="font-mono text-xs">
                <div className="flex mb-2">
                  <div className="w-16 text-muted-foreground">Offset</div>
                  <div className="flex-1">00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F</div>
                </div>
                {mockHexData.map((line, i) => (
                  <div key={i} className="flex mb-1">
                    <div className="w-16 text-muted-foreground">
                      {(i * 16).toString(16).padStart(8, '0')}
                    </div>
                    <div className="flex-1">{line}</div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PacketDetail;
