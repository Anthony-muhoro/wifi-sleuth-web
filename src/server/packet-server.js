
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const pcap = require('pcap');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store active packet capture sessions
let pcapSession = null;
let activeInterface = 'en0'; // Default interface, will be configurable

// Function to determine packet protocol
function determineProtocol(packet) {
  if (packet.payload && packet.payload.payload) {
    const payload = packet.payload;
    
    if (payload.constructor.name === 'ICMPPacket') return 'ICMP';
    if (payload.payload) {
      if (payload.payload.constructor.name === 'TCPPacket') {
        // Check for HTTP/HTTPS based on port
        const dstport = payload.payload.dstport;
        const srcport = payload.payload.srcport;
        if (dstport === 80 || srcport === 80) return 'HTTP';
        if (dstport === 443 || srcport === 443) return 'HTTPS';
        return 'TCP';
      }
      if (payload.payload.constructor.name === 'UDPPacket') {
        // Check for DNS based on port
        const dstport = payload.payload.dstport;
        const srcport = payload.payload.srcport;
        if (dstport === 53 || srcport === 53) return 'DNS';
        return 'UDP';
      }
    }
    if (payload.constructor.name === 'ARPPacket') return 'ARP';
  }
  
  return 'UNKNOWN';
}

// Function to format packet info based on protocol
function getPacketInfo(packet, protocol) {
  let info = '';
  
  try {
    if (protocol === 'TCP') {
      const tcp = packet.payload.payload.payload;
      const flags = [];
      if (tcp.flags.syn) flags.push('SYN');
      if (tcp.flags.ack) flags.push('ACK');
      if (tcp.flags.fin) flags.push('FIN');
      if (tcp.flags.rst) flags.push('RST');
      if (tcp.flags.psh) flags.push('PSH');
      if (tcp.flags.urg) flags.push('URG');
      
      info = `[${flags.join(', ')}] Seq=${tcp.seqno} Ack=${tcp.ackno} Win=${tcp.window} Len=${tcp.data_bytes}`;
    } else if (protocol === 'UDP') {
      const udp = packet.payload.payload.payload;
      info = `Length=${udp.length}`;
    } else if (protocol === 'HTTP' || protocol === 'HTTPS') {
      info = protocol === 'HTTP' ? 'HTTP Request/Response' : 'TLS Encrypted Data';
    } else if (protocol === 'DNS') {
      info = 'DNS Query/Response';
    } else if (protocol === 'ICMP') {
      const icmp = packet.payload.payload;
      info = `Type=${icmp.type} Code=${icmp.code}`;
    } else if (protocol === 'ARP') {
      const arp = packet.payload;
      info = `${arp.operation === 1 ? 'Who has' : 'Reply'} ${arp.target_ip}`;
    }
  } catch (e) {
    info = 'Unable to parse packet details';
  }
  
  return info;
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Send list of available interfaces
  const interfaces = pcap.findalldevs()
    .filter(dev => dev !== 'any' && dev !== 'lo' && dev !== 'nflog' && dev !== 'nfqueue')
    .map(dev => ({ name: dev }));
  
  ws.send(JSON.stringify({
    type: 'interfaces',
    interfaces
  }));
  
  // Handle messages from client
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    switch(data.type) {
      case 'start-scan':
        // Stop any existing session
        if (pcapSession) {
          pcapSession.close();
          pcapSession = null;
        }
        
        // Set interface if provided
        if (data.interface) {
          activeInterface = data.interface;
        }
        
        // Set filter if provided
        const filter = data.filter || '';
        
        try {
          console.log(`Starting packet capture on ${activeInterface} with filter: ${filter}`);
          pcapSession = pcap.createSession(activeInterface, { filter });
          
          pcapSession.on('packet', (rawPacket) => {
            try {
              const packet = pcap.decode.packet(rawPacket);
              
              // Determine protocol
              const protocol = determineProtocol(packet);
              
              // Extract source and destination addresses
              let source = '', destination = '';
              let size = rawPacket.length;
              
              if (packet.payload) {
                if (protocol === 'ARP') {
                  const arp = packet.payload;
                  source = `${arp.sender_ip} (${arp.sender_ha})`;
                  destination = `${arp.target_ip} (${arp.target_ha})`;
                } else if (packet.payload.payload) {
                  if (packet.payload.payload.saddr && packet.payload.payload.daddr) {
                    source = packet.payload.payload.saddr.toString();
                    destination = packet.payload.payload.daddr.toString();
                    
                    // Add ports for TCP/UDP
                    if (packet.payload.payload.payload) {
                      if (protocol === 'TCP' || protocol === 'UDP' || 
                          protocol === 'HTTP' || protocol === 'HTTPS' || 
                          protocol === 'DNS') {
                        source += `:${packet.payload.payload.payload.srcport}`;
                        destination += `:${packet.payload.payload.payload.dstport}`;
                      }
                    }
                  }
                }
              }
              
              // Get detailed info based on protocol
              const info = getPacketInfo(packet, protocol);
              
              // Create packet object
              const packetObj = {
                id: uuidv4(),
                timestamp: new Date(),
                source,
                destination,
                protocol,
                size,
                info,
                // Add raw packet data (as hex string)
                raw: Buffer.from(rawPacket).toString('hex')
              };
              
              // Send to client
              ws.send(JSON.stringify({
                type: 'packet',
                packet: packetObj
              }));
            } catch (e) {
              console.error('Error decoding packet:', e);
            }
          });
          
          ws.send(JSON.stringify({
            type: 'scan-started',
            interface: activeInterface,
            filter
          }));
        } catch (e) {
          console.error('Error starting capture:', e);
          ws.send(JSON.stringify({
            type: 'error',
            message: `Failed to start capture: ${e.message}`
          }));
        }
        break;
        
      case 'stop-scan':
        if (pcapSession) {
          pcapSession.close();
          pcapSession = null;
          
          ws.send(JSON.stringify({
            type: 'scan-stopped'
          }));
        }
        break;
        
      case 'get-interfaces':
        const deviceList = pcap.findalldevs()
          .filter(dev => dev !== 'any' && dev !== 'lo' && dev !== 'nflog' && dev !== 'nfqueue')
          .map(dev => ({ name: dev }));
        
        ws.send(JSON.stringify({
          type: 'interfaces',
          interfaces: deviceList
        }));
        break;
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
    if (pcapSession) {
      pcapSession.close();
      pcapSession = null;
    }
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Packet capture server listening on port ${PORT}`);
  console.log('Available interfaces:', pcap.findalldevs());
});
