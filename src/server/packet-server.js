
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const pcap = require('pcap');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store active packet capture sessions and user tracking data
let pcapSession = null;
let activeInterface = 'en0'; // Default interface, will be configurable
let userTrafficStats = new Map(); // Track per-user statistics

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

// Function to extract HTTP host from packet if available
function extractHostname(packet, protocol) {
  if ((protocol === 'HTTP' || protocol === 'HTTPS') && packet.payload?.payload?.payload?.data) {
    try {
      // Try to extract Host header from HTTP request
      const data = packet.payload.payload.payload.data.toString('utf8');
      const hostMatch = data.match(/Host:\s*([^\r\n]+)/i);
      if (hostMatch && hostMatch[1]) {
        return hostMatch[1].trim();
      }
    } catch (e) {
      // Silently fail if we can't parse the data
    }
  } else if (protocol === 'DNS' && packet.payload?.payload?.payload?.data) {
    try {
      // Try to parse DNS query
      const dns = pcap.decode.dns(packet.payload.payload.payload.data);
      if (dns.question && dns.question.length > 0) {
        return dns.question[0].qname;
      }
    } catch (e) {
      // Silently fail if we can't parse DNS
    }
  }
  return null;
}

// Function to update user statistics
function updateUserStats(sourceIP, destinationIP, hostname, protocol, size) {
  // Update stats for source IP if it's on our local network
  if (sourceIP.startsWith('192.168.') || sourceIP.startsWith('10.') || sourceIP.startsWith('172.16.')) {
    if (!userTrafficStats.has(sourceIP)) {
      userTrafficStats.set(sourceIP, {
        totalDataSent: 0,
        totalDataReceived: 0,
        firstSeen: new Date(),
        lastSeen: new Date(),
        visitedSites: new Set(),
        sessions: new Map()
      });
    }
    
    const stats = userTrafficStats.get(sourceIP);
    stats.totalDataSent += size;
    stats.lastSeen = new Date();
    
    if (hostname) {
      stats.visitedSites.add(hostname);
      
      // Track session for this site
      if (!stats.sessions.has(hostname)) {
        stats.sessions.set(hostname, {
          startTime: new Date(),
          lastSeen: new Date(),
          dataSent: 0,
          dataReceived: 0
        });
      }
      
      const session = stats.sessions.get(hostname);
      session.lastSeen = new Date();
      session.dataSent += size;
    }
  }
  
  // Update stats for destination IP if it's on our local network
  if (destinationIP.startsWith('192.168.') || destinationIP.startsWith('10.') || destinationIP.startsWith('172.16.')) {
    if (!userTrafficStats.has(destinationIP)) {
      userTrafficStats.set(destinationIP, {
        totalDataSent: 0,
        totalDataReceived: 0,
        firstSeen: new Date(),
        lastSeen: new Date(),
        visitedSites: new Set(),
        sessions: new Map()
      });
    }
    
    const stats = userTrafficStats.get(destinationIP);
    stats.totalDataReceived += size;
    stats.lastSeen = new Date();
    
    if (hostname) {
      // Also track the hostname for received data
      if (!stats.sessions.has(hostname)) {
        stats.sessions.set(hostname, {
          startTime: new Date(),
          lastSeen: new Date(),
          dataSent: 0,
          dataReceived: 0
        });
      }
      
      const session = stats.sessions.get(hostname);
      session.lastSeen = new Date();
      session.dataReceived += size;
    }
  }
}

// Function to format packet info based on protocol
function getPacketInfo(packet, protocol, hostname) {
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
      if (hostname) {
        info = `Host: ${hostname} - ${info}`;
      }
    } else if (protocol === 'UDP') {
      const udp = packet.payload.payload.payload;
      info = `Length=${udp.length}`;
      if (hostname) {
        info = `Host: ${hostname} - ${info}`;
      }
    } else if (protocol === 'HTTP' || protocol === 'HTTPS') {
      info = hostname ? `Host: ${hostname} - ${protocol === 'HTTP' ? 'HTTP Request/Response' : 'TLS Encrypted Data'}` : 
             (protocol === 'HTTP' ? 'HTTP Request/Response' : 'TLS Encrypted Data');
    } else if (protocol === 'DNS') {
      info = hostname ? `Query: ${hostname}` : 'DNS Query/Response';
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

// Send user statistics to clients on a regular interval
setInterval(() => {
  // Convert Map and Set to arrays for JSON serialization
  const userStats = [...userTrafficStats.entries()].map(([ip, stats]) => {
    return {
      ip,
      totalDataSent: stats.totalDataSent,
      totalDataReceived: stats.totalDataReceived,
      firstSeen: stats.firstSeen,
      lastSeen: stats.lastSeen,
      visitedSites: [...stats.visitedSites],
      sessionDuration: (stats.lastSeen - stats.firstSeen) / 1000, // in seconds
      sessions: [...stats.sessions.entries()].map(([site, session]) => {
        return {
          site,
          startTime: session.startTime,
          lastSeen: session.lastSeen,
          duration: (session.lastSeen - session.startTime) / 1000, // in seconds
          dataSent: session.dataSent,
          dataReceived: session.dataReceived
        };
      })
    };
  });
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'user-stats',
        data: userStats
      }));
    }
  });
}, 5000); // Send stats every 5 seconds

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
              
              // Extract hostname if available
              const hostname = extractHostname(packet, protocol);
              
              // Update user statistics
              if (source && destination) {
                const sourceIP = source.split(':')[0];
                const destIP = destination.split(':')[0];
                updateUserStats(sourceIP, destIP, hostname, protocol, size);
              }
              
              // Get detailed info based on protocol
              const info = getPacketInfo(packet, protocol, hostname);
              
              // Create packet object
              const packetObj = {
                id: uuidv4(),
                timestamp: new Date(),
                source,
                destination,
                protocol,
                size,
                hostname: hostname || null,
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
      
      case 'clear-stats':
        // Clear user traffic statistics
        userTrafficStats.clear();
        ws.send(JSON.stringify({
          type: 'stats-cleared'
        }));
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
